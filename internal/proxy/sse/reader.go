package sse

import (
	"bufio"
	"io"
	"strings"
)

// ReadSSE parses Server-Sent Events from a reader and invokes the callback
// for each event. It handles multi-line data, empty lines as event separators,
// and the "data: [DONE]" terminator.
func ReadSSE(reader io.Reader, callback func(event, data string)) {
	scanner := bufio.NewScanner(reader)
	// Increase buffer size for large SSE payloads
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	var currentEvent string
	var dataLines []string

	for scanner.Scan() {
		line := scanner.Text()

		// Empty line signals the end of an event
		if line == "" {
			if len(dataLines) > 0 {
				data := strings.Join(dataLines, "\n")
				callback(currentEvent, data)
				dataLines = dataLines[:0]
				currentEvent = ""
			}
			continue
		}

		if strings.HasPrefix(line, "data: ") {
			value := line[6:]
			// Handle [DONE] terminator
			if value == "[DONE]" {
				callback(currentEvent, "[DONE]")
				dataLines = dataLines[:0]
				currentEvent = ""
				continue
			}
			dataLines = append(dataLines, value)
		} else if strings.HasPrefix(line, "data:") {
			// data field with no space after colon
			value := line[5:]
			if value == "[DONE]" {
				callback(currentEvent, "[DONE]")
				dataLines = dataLines[:0]
				currentEvent = ""
				continue
			}
			dataLines = append(dataLines, value)
		} else if strings.HasPrefix(line, "event: ") {
			currentEvent = line[7:]
		} else if strings.HasPrefix(line, "event:") {
			currentEvent = line[6:]
		} else if strings.HasPrefix(line, "id: ") || strings.HasPrefix(line, "id:") {
			// SSE id field -- ignored but valid
		} else if strings.HasPrefix(line, "retry: ") || strings.HasPrefix(line, "retry:") {
			// SSE retry field -- ignored but valid
		} else if strings.HasPrefix(line, ":") {
			// SSE comment -- ignored
		}
	}

	// Flush any remaining data
	if len(dataLines) > 0 {
		data := strings.Join(dataLines, "\n")
		callback(currentEvent, data)
	}
}
