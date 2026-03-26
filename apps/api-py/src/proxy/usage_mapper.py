from typing import Any


def extract_usage(response_data: dict[str, Any]) -> dict[str, int]:
    usage = response_data.get("usage", {})
    return {
        "input_tokens": usage.get("prompt_tokens", 0),
        "output_tokens": usage.get("completion_tokens", 0),
        "cached_tokens": usage.get("prompt_tokens_details", {}).get("cached_tokens", 0),
        "reasoning_tokens": usage.get("completion_tokens_details", {}).get("reasoning_tokens", 0),
        "total_tokens": usage.get("total_tokens", 0),
    }


def extract_cached_usage(response_data: dict[str, Any]) -> dict[str, int]:
    return extract_usage(response_data)
