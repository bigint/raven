package raven

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// Stream provides an iterator-style interface over SSE chat completion chunks.
//
// Typical usage:
//
//	stream, err := client.CreateChatCompletionStream(ctx, req)
//	if err != nil {
//	    log.Fatal(err)
//	}
//	defer stream.Close()
//
//	for stream.Next() {
//	    chunk := stream.Current()
//	    fmt.Print(chunk.Choices[0].Delta.Content)
//	}
//	if err := stream.Err(); err != nil {
//	    log.Fatal(err)
//	}
type Stream struct {
	reader  *bufio.Reader
	resp    *http.Response
	current *ChatCompletionChunk
	err     error
	done    bool
}

// newStream creates a new Stream from an HTTP response.
func newStream(resp *http.Response) *Stream {
	return &Stream{
		reader: bufio.NewReader(resp.Body),
		resp:   resp,
	}
}

// Next advances the stream to the next chunk. It returns false when the
// stream is exhausted or an error occurs. After Next returns false, call
// [Stream.Err] to check for errors.
func (s *Stream) Next() bool {
	if s.done || s.err != nil {
		return false
	}

	for {
		line, err := s.reader.ReadString('\n')
		if err != nil {
			if err == io.EOF {
				s.done = true
				return false
			}
			s.err = fmt.Errorf("reading stream: %w", err)
			return false
		}

		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, ":") {
			continue
		}

		var data string
		if strings.HasPrefix(line, "data: ") {
			data = strings.TrimPrefix(line, "data: ")
		} else if strings.HasPrefix(line, "data:") {
			data = strings.TrimPrefix(line, "data:")
		} else {
			continue
		}

		data = strings.TrimSpace(data)
		if data == "[DONE]" {
			s.done = true
			return false
		}

		var chunk ChatCompletionChunk
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			s.err = fmt.Errorf("parsing stream chunk: %w", err)
			return false
		}

		s.current = &chunk
		return true
	}
}

// Current returns the most recently parsed chunk. It is only valid after
// a successful call to [Stream.Next].
func (s *Stream) Current() *ChatCompletionChunk {
	return s.current
}

// Err returns the first error encountered during streaming, or nil.
func (s *Stream) Err() error {
	return s.err
}

// Close releases resources associated with the stream. It must be called
// when the stream is no longer needed.
func (s *Stream) Close() error {
	if s.resp != nil && s.resp.Body != nil {
		return s.resp.Body.Close()
	}
	return nil
}
