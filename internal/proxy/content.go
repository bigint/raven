package proxy

import (
	"github.com/google/uuid"
)

type ContentAnalysis struct {
	HasImages  bool     `json:"hasImages"`
	ImageCount int      `json:"imageCount"`
	HasToolUse bool     `json:"hasToolUse"`
	ToolCount  int      `json:"toolCount"`
	ToolNames  []string `json:"toolNames"`
	SessionID  string   `json:"sessionId"`
}

func AnalyzeContent(body map[string]any, sessionHeader string) *ContentAnalysis {
	analysis := &ContentAnalysis{
		ToolNames: []string{},
	}

	if body == nil {
		return analysis
	}

	// Count images in messages
	if messages, ok := body["messages"].([]any); ok {
		analysis.ImageCount = countImages(messages)
		analysis.HasImages = analysis.ImageCount > 0
	}

	// Detect tool use
	if tools, ok := body["tools"].([]any); ok && len(tools) > 0 {
		analysis.HasToolUse = true
		analysis.ToolCount = len(tools)
		analysis.ToolNames = extractToolNames(tools)
	} else if functions, ok := body["functions"].([]any); ok && len(functions) > 0 {
		analysis.HasToolUse = true
		analysis.ToolCount = len(functions)
		analysis.ToolNames = extractFunctionNames(functions)
	}

	// Extract session ID
	if sessionHeader != "" {
		analysis.SessionID = sessionHeader
	} else if metadata, ok := body["metadata"].(map[string]any); ok {
		if sid, ok := metadata["session_id"].(string); ok {
			analysis.SessionID = sid
		}
	}
	if analysis.SessionID == "" {
		analysis.SessionID = uuid.New().String()
	}

	return analysis
}

func countImages(messages []any) int {
	count := 0
	for _, msg := range messages {
		m, ok := msg.(map[string]any)
		if !ok {
			continue
		}
		content, ok := m["content"].([]any)
		if !ok {
			continue
		}
		for _, block := range content {
			b, ok := block.(map[string]any)
			if !ok {
				continue
			}
			// OpenAI: type: "image_url"
			if b["type"] == "image_url" {
				count++
			}
			// Anthropic: type: "image"
			if b["type"] == "image" {
				count++
			}
		}
	}
	return count
}

func extractToolNames(tools []any) []string {
	var names []string
	for _, tool := range tools {
		t, ok := tool.(map[string]any)
		if !ok {
			continue
		}
		// OpenAI: tools[].function.name
		if fn, ok := t["function"].(map[string]any); ok {
			if name, ok := fn["name"].(string); ok {
				names = append(names, name)
				continue
			}
		}
		// Anthropic: tools[].name
		if name, ok := t["name"].(string); ok {
			names = append(names, name)
		}
	}
	if names == nil {
		return []string{}
	}
	return names
}

func extractFunctionNames(functions []any) []string {
	var names []string
	for _, fn := range functions {
		f, ok := fn.(map[string]any)
		if !ok {
			continue
		}
		if name, ok := f["name"].(string); ok {
			names = append(names, name)
		}
	}
	if names == nil {
		return []string{}
	}
	return names
}
