from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

import httpx


class OpenAICompatibleProvider:
    def __init__(self, base_url: str, api_key: str, timeout_seconds: int = 120) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds

    def _openai_messages(
        self,
        messages: list[dict[str, str]],
        vision_images: list[dict[str, str]] | None,
    ) -> list[dict[str, Any]]:
        if not vision_images:
            return [{"role": m["role"], "content": m["content"]} for m in messages]

        out: list[dict[str, Any]] = []
        last_idx = len(messages) - 1
        for i, m in enumerate(messages):
            if i == last_idx and m["role"] == "user":
                parts: list[dict[str, Any]] = [{"type": "text", "text": m["content"]}]
                for img in vision_images:
                    mime = img.get("mime_type") or "image/png"
                    b64 = img["data_base64"]
                    url = f"data:{mime};base64,{b64}"
                    parts.append({"type": "image_url", "image_url": {"url": url}})
                out.append({"role": "user", "content": parts})
            else:
                out.append({"role": m["role"], "content": m["content"]})
        return out

    async def stream_chat(
        self,
        *,
        messages: list[dict[str, str]],
        model: str,
        temperature: float | None = 0.2,
        max_tokens: int | None = None,
        vision_images: list[dict[str, str]] | None = None,
        thinking_enabled: bool = True,
    ) -> AsyncIterator[str]:
        _ = thinking_enabled
        headers: dict[str, str] = {"Content-Type": "application/json"}
        if self.api_key.strip():
            headers["Authorization"] = f"Bearer {self.api_key}"
        payload: dict[str, Any] = {
            "model": model,
            "messages": self._openai_messages(messages, vision_images),
            "temperature": temperature,
            "stream": True,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    raw = line[len("data:") :].strip()
                    if raw == "[DONE]":
                        break
                    data = json.loads(raw)
                    delta = data.get("choices", [{}])[0].get("delta", {})
                    chunk = delta.get("content", "")
                    if chunk:
                        yield chunk
