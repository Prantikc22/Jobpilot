"""LLM service backed by Emergent Universal Key + emergentintegrations.

Uses Claude Sonnet 4.6 for text tasks (resume optimization, ATS scoring, LinkedIn
rewriting, resume parsing, cover letters).
"""
import os
import json
import uuid

from emergentintegrations.llm.chat import LlmChat, UserMessage

EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]
MODEL_PROVIDER = "anthropic"
MODEL_NAME = "claude-sonnet-4-6"


async def chat_json(system: str, user: str, session_id: str | None = None) -> dict:
    """Ask the LLM to return strict JSON and parse it defensively."""
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id or f"jp-{uuid.uuid4()}",
        system_message=system + "\n\nReturn ONLY valid JSON. No markdown fences, no commentary.",
    ).with_model(MODEL_PROVIDER, MODEL_NAME)

    content = await chat.send_message(UserMessage(text=user))
    if not isinstance(content, str):
        content = str(content)

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
            return json.loads(cleaned[start: end + 1])
        raise
