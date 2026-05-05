from groq import Groq
from app.config import settings
import json

client = Groq(api_key=settings.GROQ_API_KEY)


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

def call_ai(prompt):
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content


def call_ai_messages(messages, system_prompt=None):
    payload = []
    if system_prompt:
        payload.append({"role": "system", "content": system_prompt})
    payload.extend(messages)

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=payload
    )
    return response.choices[0].message.content


def classify_intent(message, history=None):
    history = history or []
    routing_messages = []

    for item in history[-5:]:
        role = item.get("role")
        content = item.get("content", "")
        if role in {"user", "assistant"} and content:
            routing_messages.append({"role": role, "content": content})

    routing_messages.append({"role": "user", "content": message})

    raw = call_ai_messages(routing_messages, system_prompt=INTENT_ROUTER_PROMPT)
    parsed = parse_json_response(raw)

    if parsed and parsed.get("intent") in {"general_chat", "document_generation"}:
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


def generate_chat_reply(message, history=None):
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

    return call_ai_messages(messages, system_prompt=GENERAL_CHAT_SYSTEM_PROMPT)

def parse_json_response(raw):
    try:
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        return json.loads(clean.strip())
    except Exception:
        return None