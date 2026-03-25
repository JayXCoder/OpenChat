from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator
from urllib.parse import urlparse

import httpx

log = logging.getLogger(__name__)


async def fetch_ollama_model_names(base_url: str, timeout_seconds: int) -> list[str]:
    """List model names from Ollama's local API (`GET /api/tags`)."""
    base = base_url.rstrip("/")
    async with httpx.AsyncClient(timeout=timeout_seconds) as client:
        response = await client.get(f"{base}/api/tags")
        response.raise_for_status()
        data = response.json()
    models = data.get("models") or []
    names: list[str] = []
    for item in models:
        name = item.get("name")
        if name:
            names.append(str(name))
    return sorted(set(names))


# Ollama streams `thinking` separately; wrap in think tags for the frontend parser.
_THINK_OPEN = chr(60) + "think" + chr(62)
_THINK_CLOSE = chr(60) + "/" + "think" + chr(62) + "\n\n"


def _ollama_think_param(model: str, thinking_enabled: bool) -> bool | str:
    """Ollama thinking API: bool for most models; gpt-oss uses low|medium|high."""
    if not thinking_enabled:
        return False
    if "gpt-oss" in model.lower():
        return "medium"
    return True


class OllamaProvider:
    def __init__(self, base_url: str, timeout_seconds: int = 120) -> None:
        self.base_url = base_url.rstrip("/")
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
        prompt = "\n".join([f"{m['role']}: {m['content']}" for m in messages])
        options: dict = {
            "temperature": temperature,
        }
        if max_tokens is not None:
            options["num_predict"] = max_tokens

        payload: dict = {
            "model": model,
            "prompt": prompt,
            "stream": True,
            "think": _ollama_think_param(model, thinking_enabled),
            "options": options,
        }
        if vision_images:
            payload["images"] = [item["data_base64"] for item in vision_images]

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                async with client.stream(
                    "POST", f"{self.base_url}/api/generate", json=payload
                ) as response:
                    response.raise_for_status()
                    thinking_tag_open = False
                    response_started = False
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                        except json.JSONDecodeError:
                            continue
                        raw_thinking = data.get("thinking")
                        thinking_chunk = (
                            str(raw_thinking) if raw_thinking not in (None, "") else ""
                        )
                        raw_response = data.get("response")
                        response_chunk = (
                            str(raw_response) if raw_response not in (None, "") else ""
                        )

                        if thinking_chunk:
                            if not thinking_tag_open:
                                yield _THINK_OPEN
                                thinking_tag_open = True
                            yield thinking_chunk
                        if response_chunk:
                            if thinking_tag_open and not response_started:
                                yield _THINK_CLOSE
                                response_started = True
                            yield response_chunk
        except httpx.ConnectError as exc:
            log.error(
                "ollama_connect_failed url=%s model=%s exc=%r cause=%r",
                f"{self.base_url}/api/generate",
                model,
                exc,
                exc.__cause__,
            )
            hint = ""
            if (urlparse(self.base_url).hostname or "") == "ollama":
                hint = (
                    " The hostname `ollama` only works when the Ollama container is running "
                    "(`--profile ollama`). For Ollama on the host, set OLLAMA_HOST_URL=http://host.docker.internal:11434 "
                    "or use docker-compose.host-ollama.yml if Ollama listens only on 127.0.0.1:11434. "
                )
            yield (
                f"\n[error] Cannot reach Ollama at {self.base_url}.{hint}"
                "Ensure Ollama is running. From Docker, host Ollama often needs OLLAMA_HOST=0.0.0.0 "
                "unless the backend uses host networking (see docker-compose.host-ollama.yml)."
            )
        except httpx.HTTPStatusError as exc:
            yield f"\n[error] Ollama returned {exc.response.status_code}: {exc.response.text[:500]}"
        except httpx.HTTPError as exc:
            yield f"\n[error] Ollama request failed: {exc!s}"
