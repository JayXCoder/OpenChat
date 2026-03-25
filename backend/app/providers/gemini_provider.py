"""Google Gemini (Generative Language API) streaming via REST."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

import httpx


def _normalize_gemini_api_root(base_url: str) -> str:
    """
    Base URL must be the API root ending in /v1beta, not a full method URL.
    AI Studio snippets often look like:
    .../v1beta/models/gemini-flash-latest:generateContent — that must not be used as base
    or requests become .../models/...:generateContent/models/...:streamGenerateContent (404).
    """
    b = base_url.strip().rstrip("/")
    low = b.lower()
    marker = "/v1beta"
    idx = low.find(marker)
    if idx >= 0:
        return b[: idx + len(marker)].rstrip("/")
    return b


def _normalize_model_id(model: str) -> str:
    m = model.strip()
    if m.startswith("models/"):
        m = m[len("models/") :]
    for cut in (":generateContent", ":streamGenerateContent"):
        if cut in m:
            m = m.split(cut, 1)[0]
    if "/" in m:
        m = m.rsplit("/", 1)[-1]
    return m.strip()


def _extract_delta_text(obj: dict[str, Any]) -> str:
    cands = obj.get("candidates") or []
    if not cands or not isinstance(cands[0], dict):
        return ""
    content = cands[0].get("content") or {}
    parts = content.get("parts") or []
    out: list[str] = []
    for p in parts:
        if not isinstance(p, dict):
            continue
        t = p.get("text")
        if isinstance(t, str) and t:
            out.append(t)
    return "".join(out)


def _build_gemini_payload(
    messages: list[dict[str, str]],
    vision_images: list[dict[str, str]] | None,
    *,
    temperature: float | None,
    max_tokens: int | None,
) -> dict[str, Any]:
    system_chunks: list[str] = []
    contents: list[dict[str, Any]] = []

    for m in messages:
        role = m["role"]
        text = m["content"]
        if role == "system":
            system_chunks.append(text)
        elif role == "user":
            contents.append({"role": "user", "parts": [{"text": text}]})
        elif role == "assistant":
            contents.append({"role": "model", "parts": [{"text": text}]})

    if vision_images and contents:
        last = contents[-1]
        if last.get("role") == "user":
            parts: list[dict[str, Any]] = []
            text_part = ""
            for p in last.get("parts") or []:
                if isinstance(p, dict) and "text" in p:
                    text_part = p.get("text") or ""
                    break
            parts.append({"text": text_part})
            for img in vision_images:
                mime = img.get("mime_type") or "image/png"
                b64 = img.get("data_base64") or ""
                parts.append({"inlineData": {"mimeType": mime, "data": b64}})
            contents[-1] = {"role": "user", "parts": parts}

    payload: dict[str, Any] = {"contents": contents}
    if system_chunks:
        payload["systemInstruction"] = {"parts": [{"text": "\n\n".join(system_chunks)}]}

    gen: dict[str, Any] = {}
    if temperature is not None:
        gen["temperature"] = temperature
    if max_tokens is not None:
        gen["maxOutputTokens"] = max_tokens
    if gen:
        payload["generationConfig"] = gen

    return payload


class GeminiProvider:
    def __init__(self, base_url: str, api_key: str, timeout_seconds: int = 120) -> None:
        self.base_url = _normalize_gemini_api_root(base_url)
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds

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
        mid = _normalize_model_id(model)
        url = f"{self.base_url}/models/{mid}:streamGenerateContent"
        body = _build_gemini_payload(
            messages, vision_images, temperature=temperature, max_tokens=max_tokens
        )
        # Match Google AI Studio: X-goog-api-key header (avoids key in URL / proxy access logs).
        headers = {
            "Content-Type": "application/json",
            "X-goog-api-key": self.api_key.strip(),
        }

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            async with client.stream(
                "POST",
                url,
                params={"alt": "sse"},
                headers=headers,
                json=body,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line or line.startswith(":"):
                        continue
                    if not line.startswith("data:"):
                        continue
                    raw = line[5:].strip()
                    if not raw or raw == "[DONE]":
                        continue
                    try:
                        payload = json.loads(raw)
                    except json.JSONDecodeError:
                        continue
                    if isinstance(payload, list):
                        for item in payload:
                            if isinstance(item, dict):
                                t = _extract_delta_text(item)
                                if t:
                                    yield t
                    elif isinstance(payload, dict):
                        t = _extract_delta_text(payload)
                        if t:
                            yield t
