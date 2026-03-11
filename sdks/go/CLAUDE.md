# Go SDK for Raven AI Gateway

## Development

```bash
cd /Users/yoginth/raven/sdks/go
go mod tidy
go build ./...
go test ./...
```

## Conventions

- Godoc comments on all exported types, functions, and methods
- Errors wrapped with `fmt.Errorf("context: %w", err)`
- Standard library only (no external dependencies)
- `context.Context` as first parameter on all methods that do I/O
- Iterator pattern for streaming (`Next() bool`, `Current()`, `Err()`)
