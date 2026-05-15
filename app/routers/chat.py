from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.core.dependencies import get_current_user_or_guest
from app.models.chat import ChatSession, ChatMessageRecord
from app.schemas.chat import ChatSessionCreate, ChatMessageCreate
from app.prompts.intake import INTAKE_PROMPT
from app.prompts.clarification import CLARIFICATION_PROMPT
from app.services.rate_limit import enforce_limit
from app.services.ai import (
    call_ai,
    classify_intent,
    generate_chat_reply,
    parse_json_response,
)
from app.services.credits import charge_credits, GENERATION_COSTS
import json
import re


router = APIRouter(prefix="/chat", tags=["chat"])


def limit_chat_general(request: Request):
    enforce_limit(request, "chat_general")


def limit_chat_generation(request: Request):
    enforce_limit(request, "chat_generation")


def limit_chat_history_write(request: Request):
    enforce_limit(request, "chat_history_write")


INTAKE_JSON_REPAIR_PROMPT = """
You are a JSON formatter.

Convert the text below into a valid JSON object using exactly this structure:
{{
    "product_type": {{"value": "...", "inferred": false}},
    "target_audience": {{"value": "...", "inferred": false}},
    "core_problem": {{"value": "...", "inferred": false}},
    "key_features": [
        {{"feature": "...", "inferred": false}}
    ],
    "primary_goal": {{"value": "...", "inferred": false}},
    "user_actions": [
        {{"action": "...", "inferred": false}}
    ],
    "estimated_complexity": {{
        "level": "Low|Medium|High",
        "reason": "..."
    }}
}}

Rules:
- Return ONLY JSON
- No markdown or explanations
- Preserve original meaning
- If missing, use "unknown" and set inferred=true for value-bearing fields
- Ensure inferred is always true or false

Text:
{raw}
"""


DOC_TYPE_KEYWORDS = {
    "PRD": ("prd", "product requirements document", "product req"),
    "SOW": ("sow", "statement of work", "statement"),
}


def detect_doc_type(text: str) -> str | None:
    lowered = text.lower()
    for doc_type, keywords in DOC_TYPE_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return doc_type
    return None


def is_doc_type_only(text: str) -> bool:
    cleaned = text.strip().lower().replace("?", "").replace("!", "").replace(".", "")
    return cleaned in {"prd", "sow", "product requirements document", "statement of work"}


def _brief_field_text(value) -> str:
    if value is None:
        return ""

    if isinstance(value, dict):
        if "value" in value:
            return str(value.get("value") or "").strip().lower()
        if "level" in value:
            return str(value.get("level") or "").strip().lower()
        return ""

    return str(value).strip().lower()


def brief_has_enough_signal(brief: dict) -> bool:
    product_type = _brief_field_text(brief.get("product_type"))
    target_audience = _brief_field_text(brief.get("target_audience"))
    core_problem = _brief_field_text(brief.get("core_problem"))

    unknown_markers = {"unknown", "inferred: true", "insufficient information"}

    fields = [product_type, target_audience, core_problem]
    unknown_count = 0
    for field in fields:
        if not field or any(marker in field for marker in unknown_markers):
            unknown_count += 1

    return unknown_count <= 1


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=5000)
    history: list[ChatMessage] = Field(default_factory=list)


def _owner_fields(owner):
    if owner["type"] == "user":
        return {"user_id": owner["data"].id, "guest_session_id": None}
    return {"user_id": None, "guest_session_id": owner["data"].id}


def _owner_filter(query, owner):
    if owner["type"] == "user":
        return query.filter(ChatSession.user_id == owner["data"].id)
    return query.filter(ChatSession.guest_session_id == owner["data"].id)


def _session_payload(session: ChatSession) -> dict:
    return {
        "id": str(session.id),
        "title": session.title,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
    }


def _message_payload(message: ChatMessageRecord) -> dict:
    return {
        "id": str(message.id),
        "role": message.role,
        "content": message.content,
        "metadata": message.message_metadata,
        "created_at": message.created_at,
    }


def _clean_title(value: str | None) -> str:
    title = re.sub(r"\*\*", "", value or "")
    title = re.sub(r"\s+", " ", title).strip()
    if title.lower().startswith("loaded "):
        title = title[7:].strip()
    title = title.split(". Tell me", 1)[0].strip()
    return title[:120] or "New chat"


@router.get("/sessions")
async def list_chat_sessions(
    db: Session = Depends(get_db),
    owner=Depends(get_current_user_or_guest),
):
    sessions = _owner_filter(db.query(ChatSession), owner).order_by(ChatSession.updated_at.desc()).all()
    return [_session_payload(session) for session in sessions]


@router.delete("/sessions")
@router.delete("/sessions/", include_in_schema=False)
async def clear_chat_sessions(
    db: Session = Depends(get_db),
    owner=Depends(get_current_user_or_guest),
):
    sessions = _owner_filter(db.query(ChatSession), owner).all()
    for session in sessions:
        db.delete(session)
    db.commit()
    return {"message": "Chat history cleared"}


@router.post("/sessions")
async def create_chat_session(
    body: ChatSessionCreate,
    db: Session = Depends(get_db),
    owner=Depends(get_current_user_or_guest),
):
    title = _clean_title(body.title)
    session = ChatSession(title=title, **_owner_fields(owner))
    db.add(session)
    db.commit()
    db.refresh(session)
    return _session_payload(session)


@router.get("/sessions/{session_id}")
async def get_chat_session(
    session_id: str,
    db: Session = Depends(get_db),
    owner=Depends(get_current_user_or_guest),
):
    session = _owner_filter(db.query(ChatSession), owner).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")

    messages = (
        db.query(ChatMessageRecord)
        .filter(ChatMessageRecord.chat_session_id == session.id)
        .order_by(ChatMessageRecord.created_at.asc(), ChatMessageRecord.id.asc())
        .all()
    )
    payload = _session_payload(session)
    payload["messages"] = [_message_payload(message) for message in messages]
    return payload


@router.delete("/sessions/{session_id}")
@router.delete("/sessions/{session_id}/", include_in_schema=False)
async def delete_chat_session(
    session_id: str,
    db: Session = Depends(get_db),
    owner=Depends(get_current_user_or_guest),
):
    session = _owner_filter(db.query(ChatSession), owner).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    db.delete(session)
    db.commit()
    return {"message": "Chat session deleted"}


@router.post("/sessions/{session_id}/messages")
async def save_chat_message(
    session_id: str,
    body: ChatMessageCreate,
    request: Request,
    db: Session = Depends(get_db),
    owner=Depends(get_current_user_or_guest),
    _=Depends(limit_chat_history_write),
):
    session = _owner_filter(db.query(ChatSession), owner).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")

    message = ChatMessageRecord(
        chat_session_id=session.id,
        role=body.role,
        content=body.content,
        message_metadata=body.metadata,
    )
    if session.title == "New chat" and body.role == "user":
        session.title = _clean_title(body.content)[:60]
    session.updated_at = datetime.utcnow()

    db.add(message)
    db.commit()
    db.refresh(message)
    return _message_payload(message)


@router.post("/reply")
async def chat_reply(
    body: ChatRequest,
    request: Request,
    db=Depends(get_db),
    owner=Depends(get_current_user_or_guest),
    _=Depends(limit_chat_general),
):
    charge_credits(owner, db, cost=GENERATION_COSTS["message"], description="General chat message")
    text = body.message.strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty"
        )

    history = [{"role": item.role, "content": item.content} for item in body.history]
    reply = generate_chat_reply(text, history=history)
    return {
        "intent": "general_chat",
        "reply": reply,
    }


@router.post("/message")
async def chat_message(
    body: ChatRequest,
    request: Request,
    db=Depends(get_db),
    owner=Depends(get_current_user_or_guest),
):
    charge_credits(owner, db, cost=GENERATION_COSTS["message"], description="AI intake/chat message")
    text = body.message.strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty"
        )

    history = [{"role": item.role, "content": item.content} for item in body.history]

    if is_doc_type_only(text):
        enforce_limit(request, "chat_generation")
        selected_type = detect_doc_type(text)
        return {
            "intent": "document_generation",
            "reply": (
                f"Great, I can create a {selected_type}. "
                "First, share your product idea in a few lines: who it is for, "
                "what problem it solves, and the key features."
            ) if selected_type else (
                "Great, I can help with that. First, share your product idea in a few lines: "
                "who it is for, what problem it solves, and the key features."
            ),
            "questions": [],
            "metadata": {
                "phase": "awaiting_idea",
                "selected_doc_type": selected_type,
                "reason": "doc_type_only_input",
            },
        }

    routing = classify_intent(text, history=history)
    intent = routing.get("intent", "general_chat")

    if intent == "general_chat":
        enforce_limit(request, "chat_general")
        reply = generate_chat_reply(text, history=history)
        return {
            "intent": "general_chat",
            "reply": reply,
            "metadata": {
                "confidence": routing.get("confidence"),
                "reason": routing.get("reason"),
            },
        }

    enforce_limit(request, "chat_generation")

    intake_prompt = INTAKE_PROMPT.format(idea=text)
    intake_raw = call_ai(intake_prompt)
    brief = parse_json_response(intake_raw)

    if not brief:
        repair_prompt = INTAKE_JSON_REPAIR_PROMPT.format(raw=intake_raw)
        repaired_raw = call_ai(repair_prompt)
        brief = parse_json_response(repaired_raw)

    if not brief:
        selected_type = detect_doc_type(text)
        return {
            "intent": "document_generation",
            "reply": (
                f"I can generate a {selected_type} for you, but I still need a clearer product idea first. "
                "Please describe who it is for, the core problem, and the main features."
            ) if selected_type else (
                "I can help generate your document, but I need a clearer product idea first. "
                "Please describe who it is for, the core problem, and the main features."
            ),
            "questions": [],
            "metadata": {
                "phase": "awaiting_idea",
                "selected_doc_type": selected_type,
                "reason": "brief_parse_failed",
                "confidence": routing.get("confidence"),
            },
        }

    if not brief_has_enough_signal(brief):
        selected_type = detect_doc_type(text)
        return {
            "intent": "document_generation",
            "reply": (
                f"I can generate a {selected_type} for you, but I need your product idea first. "
                "Please describe who the product is for, the core problem, and the main features."
            ) if selected_type else (
                "I need a bit more detail before I can generate the document. "
                "Please describe who the product is for, the core problem, and the main features."
            ),
            "questions": [],
            "metadata": {
                "phase": "awaiting_idea",
                "selected_doc_type": selected_type,
                "reason": "insufficient_idea_signal",
                "confidence": routing.get("confidence"),
            },
        }

    clarify_prompt = CLARIFICATION_PROMPT.format(
        structured_brief=json.dumps(brief, indent=2)
    )
    clarify_raw = call_ai(clarify_prompt)

    questions = []
    for line in clarify_raw.strip().split("\n"):
        line = line.strip()
        if line:
            cleaned = line.lstrip("0123456789.-) ").strip()
            if cleaned:
                questions.append(cleaned)

    return {
        "intent": "document_generation",
        "reply": "I parsed your idea and prepared the next clarifying question.",
        "brief": brief,
        "questions": questions,
        "next_question": questions[0] if questions else None,
        "metadata": {
            "confidence": routing.get("confidence"),
            "reason": routing.get("reason"),
        },
    }
