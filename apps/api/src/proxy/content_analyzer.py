from typing import Any


def analyze_content(body: dict[str, Any], session_header: str | None = None) -> dict:
    messages = body.get("messages", [])
    has_images = False
    image_count = 0
    has_tool_use = False
    tool_count = 0
    tool_names: list[str] = []

    for msg in messages:
        content = msg.get("content", "")
        if isinstance(content, list):
            for part in content:
                if isinstance(part, dict) and part.get("type") == "image_url":
                    has_images = True
                    image_count += 1

        if msg.get("role") == "assistant" and msg.get("tool_calls"):
            has_tool_use = True
            for tc in msg["tool_calls"]:
                tool_count += 1
                fn = tc.get("function", {})
                name = fn.get("name")
                if name:
                    tool_names.append(name)

    tools = body.get("tools", [])
    if tools:
        has_tool_use = True
        tool_count = max(tool_count, len(tools))

    session_id = session_header or body.get("metadata", {}).get("session_id")

    return {
        "has_images": has_images,
        "image_count": image_count,
        "has_tool_use": has_tool_use,
        "tool_count": tool_count,
        "tool_names": tool_names,
        "session_id": session_id,
    }
