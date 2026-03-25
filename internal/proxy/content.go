package proxy

import (
	"crypto/rand"
	"fmt"
)

// AnalyzeContent extracts metadata from the request body for logging.
// This is the standalone version for use outside of Execute().
func AnalyzeContent(body map[string]any, sessionHeader string) ContentAnalysis {
	analysis := ContentAnalysis{
		SessionID: sessionHeader,
	}

	if body == nil {
		return analysis
	}

	// Count images in messages
	if messages, ok := body["messages"].([]any); ok {
		analysis.ImageCount = countImageBlocks(messages)
		analysis.HasImages = analysis.ImageCount > 0
	}

	// Detect tool use
	if tools, ok := body["tools"].([]any); ok && len(tools) > 0 {
		analysis.HasToolUse = true
		analysis.ToolCount = len(tools)
		analysis.ToolNames = extractToolNamesList(tools)
	} else if functions, ok := body["functions"].([]any); ok && len(functions) > 0 {
		analysis.HasToolUse = true
		analysis.ToolCount = len(functions)
		analysis.ToolNames = extractFuncNamesList(functions)
	}

	// Extract session ID from header or body metadata
	if analysis.SessionID == "" {
		if metadata, ok := body["metadata"].(map[string]any); ok {
			if sid, ok := metadata["session_id"].(string); ok {
				analysis.SessionID = sid
			}
		}
	}
	if analysis.SessionID == "" {
		analysis.SessionID = newUUID()
	}

	return analysis
}

func countImageBlocks(messages []any) int {
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
			blockType, _ := b["type"].(string)
			if blockType == "image_url" || blockType == "image" {
				count++
			}
		}
	}
	return count
}

func extractToolNamesList(tools []any) []string {
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
	return names
}

func extractFuncNamesList(functions []any) []string {
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
	return names
}

func newUUID() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	b[6] = (b[6] & 0x0f) | 0x40 // version 4
	b[8] = (b[8] & 0x3f) | 0x80 // variant 10
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}
