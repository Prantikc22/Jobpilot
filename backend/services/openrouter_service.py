"""OpenRouter AI service with intelligent multi-model fallback + retry.

Strategy:
  1. Try a list of free models in order.
  2. On 429 (rate limit) or transient 5xx, sleep with jittered backoff and try the next model.
  3. Honour `Retry-After` header if present (capped to a few seconds).
  4. Persist a short-lived in-memory cool-down per model so we don't keep hitting one that just rate-limited us.
  5. Final fallback: raise a friendly `OpenRouterBusy` error so the route can surface a graceful message.

Goal: in normal use, requests succeed by silently rotating through the free models; users almost never see a 429.
"""
import os
import json
import time
import random
import asyncio
import logging
from typing import Optional

import httpx

logger = logging.getLogger("openrouter")

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Primary model (env-configurable) is always tried first, then the rest of the
# free pool. Duplicates are de-duped while preserving order.
# Strictly only `:free`-suffixed models so we never surprise-charge the key.
# Pool is curated from the live OpenRouter free catalog (23 free models as of
# the build). We order them so that the larger / higher-quality currently-
# uncongested models are tried first, and lighter ones absorb spillover.
_DEFAULT_PRIMARY = "openai/gpt-oss-120b:free"
PRIMARY_MODEL = os.environ.get("OPENROUTER_MODEL", _DEFAULT_PRIMARY)

FREE_MODEL_POOL = [
    PRIMARY_MODEL,
    "openai/gpt-oss-120b:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "z-ai/glm-4.5-air:free",
    "google/gemma-4-31b-it:free",
    "google/gemma-4-26b-a4b-it:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "qwen/qwen3-coder:free",
    "moonshotai/kimi-k2.6:free",
    "openai/gpt-oss-20b:free",
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "nvidia/nemotron-nano-9b-v2:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "liquid/lfm-2.5-1.2b-instruct:free",
]
# De-dupe preserving order
_seen = set()
MODELS = []
for m in FREE_MODEL_POOL:
    if m and m not in _seen:
        _seen.add(m)
        MODELS.append(m)

# Short in-memory cool-down map: model -> unix_ts when it becomes usable again.
_COOLDOWN: dict[str, float] = {}
COOLDOWN_SECONDS_429 = 60   # back off 60s on the model that 429'd
COOLDOWN_SECONDS_5XX = 30


class OpenRouterBusy(Exception):
    """Raised when every fallback model is rate-limited or failing."""


def _available_models() -> list[str]:
    now = time.time()
    return [m for m in MODELS if _COOLDOWN.get(m, 0) <= now] or list(MODELS)


def _mark_cooldown(model: str, seconds: int):
    _COOLDOWN[model] = time.time() + seconds


async def _post(client: httpx.AsyncClient, model: str, messages: list[dict], temperature: float, max_tokens: int):
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://jobpilot.ai",
        "X-Title": "JobPilot",
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    return await client.post(OPENROUTER_URL, headers=headers, json=payload)


async def chat(
    messages: list[dict],
    model: Optional[str] = None,
    temperature: float = 0.4,
    max_tokens: int = 1200,
) -> str:
    """Call OpenRouter with smart fallback. Returns the model's text reply.

    Raises ``OpenRouterBusy`` if every model in the pool is rate-limited or failing.
    """
    if not OPENROUTER_API_KEY:
        raise OpenRouterBusy("OpenRouter API key not configured")

    # Build the candidate list: preferred model first, then everything else.
    candidates: list[str] = []
    if model:
        candidates.append(model)
    for m in _available_models():
        if m not in candidates:
            candidates.append(m)

    last_err: Optional[str] = None
    async with httpx.AsyncClient(timeout=45) as client:
        for i, m in enumerate(candidates):
            try:
                resp = await _post(client, m, messages, temperature, max_tokens)
            except (httpx.TimeoutException, httpx.TransportError) as e:
                last_err = f"network error on {m}: {e}"
                _mark_cooldown(m, COOLDOWN_SECONDS_5XX)
                continue

            if resp.status_code == 200:
                try:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    if i > 0:
                        logger.info(f"[openrouter] succeeded on fallback model #{i}: {m}")
                    return content
                except Exception as e:
                    last_err = f"parse error on {m}: {e}"
                    continue

            if resp.status_code == 429:
                retry_after = resp.headers.get("Retry-After")
                wait = 0
                if retry_after:
                    try:
                        wait = min(int(float(retry_after)), 5)
                    except Exception:
                        wait = 0
                _mark_cooldown(m, COOLDOWN_SECONDS_429)
                logger.warning(f"[openrouter] 429 on {m}; rotating fallback (wait={wait}s)")
                if wait > 0:
                    await asyncio.sleep(wait + random.uniform(0, 0.4))
                last_err = f"429 on {m}"
                continue

            if 500 <= resp.status_code < 600:
                _mark_cooldown(m, COOLDOWN_SECONDS_5XX)
                last_err = f"{resp.status_code} on {m}"
                await asyncio.sleep(0.3 + random.uniform(0, 0.4))
                continue

            # 4xx other than 429 — typically wrong model name or auth; don't keep retrying same one
            try:
                err_body = resp.text[:240]
            except Exception:
                err_body = ""
            last_err = f"{resp.status_code} on {m}: {err_body}"
            _mark_cooldown(m, COOLDOWN_SECONDS_5XX)
            continue

    raise OpenRouterBusy(last_err or "All OpenRouter free models are busy. Please try again in a minute.")


async def chat_json(system: str, user: str, model: Optional[str] = None) -> dict:
    """Ask the model to return strict JSON, parse defensively across fenced/quoted variants."""
    messages = [
        {"role": "system", "content": system + "\n\nRespond ONLY with valid JSON. No markdown, no commentary."},
        {"role": "user", "content": user},
    ]
    content = await chat(messages, model=model, temperature=0.2)
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```", 2)[1] if "```" in cleaned[3:] else cleaned[3:]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except Exception:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1:
            try:
                return json.loads(cleaned[start: end + 1])
            except Exception:
                pass
        raise OpenRouterBusy("AI returned invalid JSON. Try again in a minute.")
