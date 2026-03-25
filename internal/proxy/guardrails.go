package proxy

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/bigint/raven/internal/errors"
)

const (
	regexCacheMax      = 200
	contentTruncateLen = 10_000
)

// GuardrailMatch is defined in execute.go
// GuardrailResult is defined in pipeline.go

type guardrailRule struct {
	ID        string
	Name      string
	Type      string
	Action    string
	Config    map[string]any
	IsEnabled bool
	Priority  int
}

// GuardrailMessage is used for guardrail evaluation input.
// Unlike the parser's Message type, Content is always a plain string here.
type GuardrailMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

var piiPatterns = map[string]*regexp.Regexp{
	"email":      regexp.MustCompile(`\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b`),
	"phone":      regexp.MustCompile(`\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b`),
	"ssn":        regexp.MustCompile(`\b\d{3}-\d{2}-\d{4}\b`),
	"creditCard": regexp.MustCompile(`\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b`),
	"ipAddress":  regexp.MustCompile(`\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b`),
}

// Regex cache with LRU eviction
var (
	regexCache   = make(map[string]*regexp.Regexp)
	regexCacheMu sync.Mutex
)

func getCachedRegex(pattern string) (*regexp.Regexp, error) {
	regexCacheMu.Lock()
	defer regexCacheMu.Unlock()

	if re, ok := regexCache[pattern]; ok {
		return re, nil
	}

	re, err := regexp.Compile(pattern)
	if err != nil {
		return nil, err
	}

	if len(regexCache) >= regexCacheMax {
		// Evict first entry found (simple eviction)
		for k := range regexCache {
			delete(regexCache, k)
			break
		}
	}

	regexCache[pattern] = re
	return re, nil
}

func extractTextContent(messages []GuardrailMessage) []string {
	var contents []string
	for _, m := range messages {
		if m.Content != "" {
			contents = append(contents, m.Content)
		}
	}
	return contents
}

func evaluateBlockTopics(contents []string, config map[string]any) string {
	topicsRaw, ok := config["topics"]
	if !ok {
		return ""
	}

	topicsSlice, ok := topicsRaw.([]any)
	if !ok {
		return ""
	}

	topics := make([]string, 0, len(topicsSlice))
	for _, t := range topicsSlice {
		if s, ok := t.(string); ok {
			topics = append(topics, s)
		}
	}

	if len(topics) == 0 {
		return ""
	}

	for _, content := range contents {
		lower := strings.ToLower(content)
		for _, topic := range topics {
			if strings.Contains(lower, strings.ToLower(topic)) {
				return topic
			}
		}
	}
	return ""
}

func evaluatePiiDetection(contents []string, config map[string]any) string {
	var enabledTypes []string

	if piiTypesRaw, ok := config["piiTypes"]; ok {
		if piiSlice, ok := piiTypesRaw.([]any); ok {
			for _, t := range piiSlice {
				if s, ok := t.(string); ok {
					enabledTypes = append(enabledTypes, s)
				}
			}
		}
	}

	if len(enabledTypes) == 0 {
		enabledTypes = make([]string, 0, len(piiPatterns))
		for k := range piiPatterns {
			enabledTypes = append(enabledTypes, k)
		}
	}

	for _, content := range contents {
		for _, piiType := range enabledTypes {
			pattern, ok := piiPatterns[piiType]
			if !ok {
				continue
			}
			if pattern.MatchString(content) {
				return piiType
			}
		}
	}
	return ""
}

func evaluateContentFilter(contents []string, config map[string]any) string {
	categoriesRaw, ok := config["categories"]
	if !ok {
		return ""
	}

	categoriesSlice, ok := categoriesRaw.([]any)
	if !ok {
		return ""
	}

	categories := make([]string, 0, len(categoriesSlice))
	for _, c := range categoriesSlice {
		if s, ok := c.(string); ok {
			categories = append(categories, s)
		}
	}

	if len(categories) == 0 {
		return ""
	}

	for _, content := range contents {
		lower := strings.ToLower(content)
		for _, category := range categories {
			if strings.Contains(lower, strings.ToLower(category)) {
				return category
			}
		}
	}
	return ""
}

func evaluateCustomRegex(contents []string, config map[string]any) string {
	patternRaw, ok := config["pattern"]
	if !ok {
		return ""
	}

	pattern, ok := patternRaw.(string)
	if !ok || pattern == "" {
		return ""
	}

	// Limit pattern length to prevent abuse
	if len(pattern) > 500 {
		return ""
	}

	re, err := getCachedRegex(pattern)
	if err != nil {
		return ""
	}

	for _, content := range contents {
		truncated := content
		if len(truncated) > contentTruncateLen {
			truncated = truncated[:contentTruncateLen]
		}
		if match := re.FindString(truncated); match != "" {
			return match
		}
	}
	return ""
}

func loadGuardrailRules(ctx context.Context, pool *pgxpool.Pool, rdb *redis.Client) ([]guardrailRule, error) {
	cacheKey := "guardrails:active"

	if rdb != nil {
		cached, err := rdb.Get(ctx, cacheKey).Result()
		if err == nil && cached != "" {
			var rules []guardrailRule
			if jsonErr := json.Unmarshal([]byte(cached), &rules); jsonErr == nil {
				return rules, nil
			}
		}
	}

	rows, err := pool.Query(ctx,
		"SELECT id, name, type, action, config, is_enabled, priority FROM guardrail_rules WHERE is_enabled = true ORDER BY priority ASC",
	)
	if err != nil {
		return nil, fmt.Errorf("query guardrail rules: %w", err)
	}
	defer rows.Close()

	var rules []guardrailRule
	for rows.Next() {
		var r guardrailRule
		var configBytes []byte
		if err := rows.Scan(&r.ID, &r.Name, &r.Type, &r.Action, &configBytes, &r.IsEnabled, &r.Priority); err != nil {
			return nil, fmt.Errorf("scan guardrail rule: %w", err)
		}
		if err := json.Unmarshal(configBytes, &r.Config); err != nil {
			r.Config = make(map[string]any)
		}
		rules = append(rules, r)
	}

	if rdb != nil && rules != nil {
		data, jsonErr := json.Marshal(rules)
		if jsonErr == nil {
			rdb.Set(ctx, cacheKey, data, 30*time.Second)
		}
	}

	return rules, nil
}

func EvaluateGuardrails(ctx context.Context, pool *pgxpool.Pool, rdb *redis.Client, messages []GuardrailMessage) (*GuardrailResult, error) {
	rules, err := loadGuardrailRules(ctx, pool, rdb)
	if err != nil {
		return nil, err
	}

	result := &GuardrailResult{
		Blocked:  false,
		Warnings: []string{},
		Matches:  []GuardrailMatch{},
	}

	if len(rules) == 0 {
		return result, nil
	}

	contents := extractTextContent(messages)
	if len(contents) == 0 {
		return result, nil
	}

	for _, rule := range rules {
		var matchedContent string

		switch rule.Type {
		case "block_topics":
			matchedContent = evaluateBlockTopics(contents, rule.Config)
		case "pii_detection":
			matchedContent = evaluatePiiDetection(contents, rule.Config)
		case "content_filter":
			matchedContent = evaluateContentFilter(contents, rule.Config)
		case "custom_regex":
			matchedContent = evaluateCustomRegex(contents, rule.Config)
		}

		if matchedContent == "" {
			continue
		}

		match := GuardrailMatch{
			RuleName:       rule.Name,
			RuleType:       rule.Type,
			Action:         rule.Action,
			MatchedContent: matchedContent,
		}
		result.Matches = append(result.Matches, match)

		switch rule.Action {
		case "block":
			return nil, errors.GuardrailBlocked(
				fmt.Sprintf("Request blocked by guardrail: %s", rule.Name),
				map[string]any{
					"rule":           rule.Name,
					"type":           rule.Type,
					"matchedContent": matchedContent,
				},
			)
		case "warn":
			result.Warnings = append(result.Warnings,
				fmt.Sprintf("Guardrail warning [%s]: matched %s", rule.Name, matchedContent),
			)
		}
		// "log" action: match is recorded but no warning or block
	}

	return result, nil
}
