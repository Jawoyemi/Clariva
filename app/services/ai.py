from groq import AsyncGroq, RateLimitError
from fastapi import HTTPException, status
from app.config import settings
import asyncio
import json
import logging
import re

logger = logging.getLogger(__name__)

client = AsyncGroq(api_key=settings.GROQ_API_KEY)

ALLOWED_INTENTS = {"general_chat", "document_generation"}

INTENT_ROUTER_PROMPT = """
You are an intent router for a product-document assistant.

Classify the user's latest message into one of these intents:
- general_chat: Greetings, Q&A, small talk, generic assistance.
- document_generation: User asks to generate/create/build a product document or app plan (PRD, SOW, scope, roadmap, requirements) or asks to build an app/product.

Return ONLY valid JSON in this exact shape:
{
  "intent": "general_chat" | "document_generation",
  "confidence": 0.0,
  "reason": "short reason"
}
"""


GENERAL_CHAT_SYSTEM_PROMPT = """
You are Clariva, a concise and helpful product assistant.
Keep answers practical and short unless the user asks for depth.
If the user asks to generate a formal document, mention that you can start document generation.

If the user asks who you are, what kind of assistant you are, or what Clariva does,
introduce yourself as:
"I am Clariva, an AI Documentation Assistant. I turn plain-language product ideas into developer-ready technical documentation, including architecture guidance, feature breakdowns, recommended tech stack, user stories, and implementation-ready specs in minutes instead of weeks."

For identity questions, keep the answer clear and confident in 1 to 3 sentences.
"""

IDENTITY_RESPONSE = (
    "I am Clariva, an AI Documentation Assistant. I turn plain-language product ideas "
    "into developer-ready technical documentation, including architecture guidance, "
    "feature breakdowns, recommended tech stack, user stories, and implementation-ready "
    "specs in minutes instead of weeks."
)

IDENTITY_KEYWORDS = {
    "who are you",
    "what are you",
    "what kind of assistant",
    "what is clariva",
    "who is clariva",
    "introduce yourself",
    "your role",
}

_RETRY_AFTER_RE = re.compile(r"try again in ([\d.]+)s", re.IGNORECASE)
_MAX_RETRIES = 3
_DEFAULT_RETRY_WAIT = 20.0  # seconds to wait when we can't parse Groq's retry-after
_MAX_RETRY_WAIT = 60.0


def _parse_retry_after(exc: RateLimitError) -> float:
    """Extract the suggested wait time (seconds) from a Groq RateLimitError message."""
    try:
        message = str(exc)
        match = _RETRY_AFTER_RE.search(message)
        if match:
            return min(float(match.group(1)) + 1.0, _MAX_RETRY_WAIT)
    except Exception:
        pass
    return _DEFAULT_RETRY_WAIT


async def call_ai_messages(messages, system_prompt=None):
    payload = []
    if system_prompt:
        payload.append({"role": "system", "content": system_prompt})
    payload.extend(messages)

    logger.info("call_ai_messages: sending %d messages to model", len(payload))

    last_exc: RateLimitError | None = None
    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            response = await client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=payload,
                timeout=90,
            )
            content = response.choices[0].message.content
            logger.info("call_ai_messages: received %d chars", len(content or ""))
            return content
        except RateLimitError as exc:
            last_exc = exc
            wait = _parse_retry_after(exc)
            if attempt < _MAX_RETRIES:
                logger.warning(
                    "call_ai_messages: rate limit hit (attempt %d/%d), retrying in %.1fs",
                    attempt, _MAX_RETRIES, wait,
                )
                await asyncio.sleep(wait)
            else:
                logger.warning(
                    "call_ai_messages: rate limit hit (attempt %d/%d), giving up",
                    attempt, _MAX_RETRIES,
                )
        except Exception as exc:
            logger.error("call_ai_messages: AI call failed: %s", exc, exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"AI service error: {exc}",
            )

    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail="Clariva is experiencing high demand right now. Please wait a few minutes and try again.",
    )


async def call_ai(prompt):
    return await call_ai_messages([{"role": "user", "content": prompt}])


async def classify_intent(message, history=None):
    history = history or []
    routing_messages = []

    for item in history[-5:]:
        role = item.get("role")
        content = item.get("content", "")
        if role in {"user", "assistant"} and content:
            routing_messages.append({"role": role, "content": content})

    routing_messages.append({"role": "user", "content": message})

    raw = await call_ai_messages(routing_messages, system_prompt=INTENT_ROUTER_PROMPT)
    parsed = parse_json_response(raw)

    if (
        isinstance(parsed, dict)
        and parsed.get("intent") in ALLOWED_INTENTS
        and isinstance(parsed.get("confidence"), (int, float))
        and 0.0 <= float(parsed["confidence"]) <= 1.0
        and isinstance(parsed.get("reason"), str)
    ):
        return parsed

    fallback = message.lower()
    generation_keywords = {
        "prd", "sow", "document", "requirements", "spec", "scope", "roadmap",
        "build app", "create app", "build a product", "generate"
    }
    intent = "document_generation" if any(word in fallback for word in generation_keywords) else "general_chat"
    return {
        "intent": intent,
        "confidence": 0.4,
        "reason": "fallback_keyword_router"
    }


async def generate_chat_reply(message, history=None):
    history = history or []
    lowered = message.lower().strip()
    if any(keyword in lowered for keyword in IDENTITY_KEYWORDS):
        return IDENTITY_RESPONSE

    messages = []

    for item in history[-10:]:
        role = item.get("role")
        content = item.get("content", "")
        if role in {"user", "assistant"} and content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": message})

    return await call_ai_messages(messages, system_prompt=GENERAL_CHAT_SYSTEM_PROMPT)

def parse_json_response(raw):
    """Best-effort JSON parser for LLM outputs.

    Supports:
    - raw JSON
    - ```json ... ``` fences
    - leading/trailing junk by extracting the first JSON object/array
    """
    if raw is None:
        return None

    text = str(raw).strip()
    if not text:
        return None

    code_block = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    if code_block:
        text = code_block.group(1).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    decoder = json.JSONDecoder()
    for match in re.finditer(r"[\{\[]", text):
        try:
            parsed, _ = decoder.raw_decode(text[match.start():])
            return parsed
        except json.JSONDecodeError:
            continue

    return None
