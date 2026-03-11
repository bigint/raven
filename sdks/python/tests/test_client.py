"""Tests for the Raven Python SDK client."""

from __future__ import annotations

import json

import httpx
import pytest
import respx

from raven import AsyncRaven, Raven
from raven.types import ChatCompletionChunk, ChatCompletionResponse, RavenError

BASE_URL = "http://localhost:8080"
API_KEY = "rk-test-key"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def client() -> Raven:
    """Create a synchronous Raven client for testing."""
    return Raven(base_url=BASE_URL, api_key=API_KEY, timeout=5.0, max_retries=2)


@pytest.fixture
def async_client() -> AsyncRaven:
    """Create an asynchronous Raven client for testing."""
    return AsyncRaven(base_url=BASE_URL, api_key=API_KEY, timeout=5.0, max_retries=2)


# ---------------------------------------------------------------------------
# Sample payloads
# ---------------------------------------------------------------------------

CHAT_RESPONSE_PAYLOAD = {
    "id": "chatcmpl-abc123",
    "object": "chat.completion",
    "created": 1700000000,
    "model": "openai/gpt-4o",
    "choices": [
        {
            "index": 0,
            "message": {
                "role": "assistant",
                "content": "Hello! How can I help you?",
            },
            "finish_reason": "stop",
        }
    ],
    "usage": {
        "prompt_tokens": 10,
        "completion_tokens": 8,
        "total_tokens": 18,
    },
}

STREAM_CHUNKS = [
    {
        "id": "chatcmpl-abc123",
        "object": "chat.completion.chunk",
        "created": 1700000000,
        "model": "openai/gpt-4o",
        "choices": [
            {
                "index": 0,
                "delta": {"role": "assistant", "content": "Hello"},
                "finish_reason": None,
            }
        ],
    },
    {
        "id": "chatcmpl-abc123",
        "object": "chat.completion.chunk",
        "created": 1700000000,
        "model": "openai/gpt-4o",
        "choices": [
            {
                "index": 0,
                "delta": {"role": "assistant", "content": "!"},
                "finish_reason": "stop",
            }
        ],
    },
]

EMBEDDING_RESPONSE_PAYLOAD = {
    "object": "list",
    "data": [
        {"object": "embedding", "embedding": [0.1, 0.2, 0.3], "index": 0}
    ],
    "model": "openai/text-embedding-3-small",
    "usage": {"prompt_tokens": 5, "total_tokens": 5},
}

MODELS_RESPONSE_PAYLOAD = {
    "object": "list",
    "data": [
        {
            "id": "openai/gpt-4o",
            "object": "model",
            "created": 1700000000,
            "owned_by": "openai",
        }
    ],
}

ERROR_PAYLOAD = {
    "error": {
        "type": "authentication_error",
        "message": "Invalid API key",
        "code": "invalid_api_key",
    }
}


# ---------------------------------------------------------------------------
# Client initialisation
# ---------------------------------------------------------------------------


class TestClientInit:
    """Tests for client initialisation."""

    def test_sync_client_properties(self, client: Raven) -> None:
        """The sync client stores the correct configuration."""
        assert client._base_url == BASE_URL
        assert client._api_key == API_KEY
        assert client._timeout == 5.0
        assert client._max_retries == 2

    def test_async_client_properties(self, async_client: AsyncRaven) -> None:
        """The async client stores the correct configuration."""
        assert async_client._base_url == BASE_URL
        assert async_client._api_key == API_KEY

    def test_trailing_slash_stripped(self) -> None:
        """Trailing slash on base_url is normalised away."""
        c = Raven(base_url="http://localhost:8080/", api_key="k")
        assert c._base_url == "http://localhost:8080"
        c.close()

    def test_context_manager(self) -> None:
        """The sync client can be used as a context manager."""
        with Raven(base_url=BASE_URL, api_key=API_KEY) as c:
            assert c._base_url == BASE_URL

    @pytest.mark.asyncio
    async def test_async_context_manager(self) -> None:
        """The async client can be used as an async context manager."""
        async with AsyncRaven(base_url=BASE_URL, api_key=API_KEY) as c:
            assert c._base_url == BASE_URL


# ---------------------------------------------------------------------------
# Chat completions
# ---------------------------------------------------------------------------


class TestChatCompletions:
    """Tests for chat completion requests."""

    @respx.mock
    def test_create(self, client: Raven) -> None:
        """A non-streaming chat completion returns a parsed response."""
        respx.post(f"{BASE_URL}/v1/chat/completions").mock(
            return_value=httpx.Response(200, json=CHAT_RESPONSE_PAYLOAD)
        )
        resp = client.chat.completions.create(
            model="openai/gpt-4o",
            messages=[{"role": "user", "content": "Hi"}],
        )
        assert isinstance(resp, ChatCompletionResponse)
        assert resp.id == "chatcmpl-abc123"
        assert resp.choices[0].message.content == "Hello! How can I help you?"
        assert resp.usage.total_tokens == 18

    @respx.mock
    @pytest.mark.asyncio
    async def test_create_async(self, async_client: AsyncRaven) -> None:
        """An async non-streaming chat completion returns a parsed response."""
        respx.post(f"{BASE_URL}/v1/chat/completions").mock(
            return_value=httpx.Response(200, json=CHAT_RESPONSE_PAYLOAD)
        )
        resp = await async_client.chat.completions.create(
            model="openai/gpt-4o",
            messages=[{"role": "user", "content": "Hi"}],
        )
        assert isinstance(resp, ChatCompletionResponse)
        assert resp.choices[0].message.content == "Hello! How can I help you?"


# ---------------------------------------------------------------------------
# Streaming
# ---------------------------------------------------------------------------


class TestStreaming:
    """Tests for streaming chat completions."""

    @respx.mock
    def test_sync_stream(self, client: Raven) -> None:
        """Streaming returns an iterable of ChatCompletionChunk objects."""
        sse_lines = ""
        for chunk in STREAM_CHUNKS:
            sse_lines += f"data: {json.dumps(chunk)}\n\n"
        sse_lines += "data: [DONE]\n\n"

        respx.post(f"{BASE_URL}/v1/chat/completions").mock(
            return_value=httpx.Response(
                200,
                content=sse_lines.encode(),
                headers={"content-type": "text/event-stream"},
            )
        )

        stream = client.chat.completions.create(
            model="openai/gpt-4o",
            messages=[{"role": "user", "content": "Hi"}],
            stream=True,
        )

        chunks = list(stream)
        assert len(chunks) == 2
        assert isinstance(chunks[0], ChatCompletionChunk)
        assert chunks[0].choices[0].delta.content == "Hello"
        assert chunks[1].choices[0].delta.content == "!"


# ---------------------------------------------------------------------------
# Embeddings
# ---------------------------------------------------------------------------


class TestEmbeddings:
    """Tests for embedding requests."""

    @respx.mock
    def test_create_embedding(self, client: Raven) -> None:
        """An embedding request returns parsed vectors."""
        respx.post(f"{BASE_URL}/v1/embeddings").mock(
            return_value=httpx.Response(200, json=EMBEDDING_RESPONSE_PAYLOAD)
        )
        resp = client.embeddings.create(
            model="openai/text-embedding-3-small", input="Hello"
        )
        assert len(resp.data) == 1
        assert resp.data[0].embedding == [0.1, 0.2, 0.3]


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class TestModels:
    """Tests for model listing."""

    @respx.mock
    def test_list_models(self, client: Raven) -> None:
        """Listing models returns parsed model objects."""
        respx.get(f"{BASE_URL}/v1/models").mock(
            return_value=httpx.Response(200, json=MODELS_RESPONSE_PAYLOAD)
        )
        resp = client.models.list()
        assert len(resp.data) == 1
        assert resp.data[0].id == "openai/gpt-4o"


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------


class TestErrorHandling:
    """Tests for error handling."""

    @respx.mock
    def test_api_error(self, client: Raven) -> None:
        """A 401 response raises a RavenError with parsed fields."""
        respx.post(f"{BASE_URL}/v1/chat/completions").mock(
            return_value=httpx.Response(401, json=ERROR_PAYLOAD)
        )
        with pytest.raises(RavenError) as exc_info:
            client.chat.completions.create(
                model="openai/gpt-4o",
                messages=[{"role": "user", "content": "Hi"}],
            )
        err = exc_info.value
        assert err.status_code == 401
        assert err.code == "invalid_api_key"
        assert "Invalid API key" in err.message

    @respx.mock
    def test_plain_text_error(self, client: Raven) -> None:
        """A non-JSON error body still raises RavenError."""
        respx.post(f"{BASE_URL}/v1/chat/completions").mock(
            return_value=httpx.Response(
                500,
                content=b"Internal Server Error",
                headers={"content-type": "text/plain"},
            )
        )
        with pytest.raises(RavenError) as exc_info:
            client.chat.completions.create(
                model="openai/gpt-4o",
                messages=[{"role": "user", "content": "Hi"}],
            )
        assert exc_info.value.status_code == 500


# ---------------------------------------------------------------------------
# Retry logic
# ---------------------------------------------------------------------------


class TestRetry:
    """Tests for automatic retry with backoff."""

    @respx.mock
    def test_retry_on_server_error(self) -> None:
        """The client retries on 500 errors and succeeds on the next attempt."""
        route = respx.post(f"{BASE_URL}/v1/chat/completions")
        route.side_effect = [
            httpx.Response(500, json={"error": {"message": "server error"}}),
            httpx.Response(200, json=CHAT_RESPONSE_PAYLOAD),
        ]

        client = Raven(
            base_url=BASE_URL, api_key=API_KEY, timeout=5.0, max_retries=2
        )
        resp = client._request_with_retry("POST", "/v1/chat/completions", json={})
        assert resp.status_code == 200
        client.close()

    @respx.mock
    def test_retry_on_429(self) -> None:
        """The client retries on 429 rate-limit responses."""
        route = respx.post(f"{BASE_URL}/v1/chat/completions")
        route.side_effect = [
            httpx.Response(
                429,
                json={"error": {"message": "rate limited"}},
                headers={"retry-after": "0"},
            ),
            httpx.Response(200, json=CHAT_RESPONSE_PAYLOAD),
        ]

        client = Raven(
            base_url=BASE_URL, api_key=API_KEY, timeout=5.0, max_retries=2
        )
        resp = client._request_with_retry("POST", "/v1/chat/completions", json={})
        assert resp.status_code == 200
        client.close()
