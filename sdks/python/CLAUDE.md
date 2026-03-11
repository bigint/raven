# Python SDK for Raven AI Gateway

## Development

```bash
cd /Users/yoginth/raven/sdks/python
pip install -e ".[dev]"
pytest
ruff check src/
ruff format src/
```

## Conventions

- Google-style docstrings on all public classes and methods
- Type hints on every function signature
- Pydantic v2 models for all request/response types
- httpx for HTTP with connection pooling and HTTP/2
- respx for mocking in tests
- `asyncio_mode = "auto"` in pytest config
