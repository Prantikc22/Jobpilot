"""OpenRouter service - AI chat completions using free model."""
import os
import json
import httpx

OPENROUTER_API_KEY = os.environ["OPENROUTER_API_KEY"]
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


async def chat(messages: list[dict], model: str | None = None, temperature: float = 0.4, max_tokens: int = 1200) -> str:
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://jobpilot.ai",
        "X-Title": "JobPilot",
    }
    payload = {
        "model": model or OPENROUTER_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(OPENROUTER_URL, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


async def chat_json(system: str, user: str, model: str | None = None) -> dict:
    """Ask the model to return strict JSON, parse defensively."""
    messages = [
        {"role": "system", "content": system + "\n\nRespond ONLY with valid JSON. No markdown, no commentary."},
        {"role": "user", "content": user},
    ]
    content = await chat(messages, model=model, temperature=0.2)
    # Strip ``` fences if present
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
        # Try to locate first JSON object
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1:
            return json.loads(cleaned[start : end + 1])
        raise
