from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session
from pathlib import Path
from datetime import datetime
import os
from app.database import get_db
from app.core.dependencies import get_current_user_or_guest
from app.models.document import Document, DocumentType
from app.schemas.document import DocumentResponse
from app.schemas.prompt import IntakeInput, ClarificationAnswers
from app.services.ai import call_ai, parse_json_response
from app.services.credits import charge_credits, refund_credits, GENERATION_COSTS
from app.services.document_renderer import render_docx_from_markdown
from app.services.rate_limit import enforce_limit
from app.services.storage import upload_file, get_download_url, delete_file
from app.services.user_context import build_user_context
from app.prompts.intake import INTAKE_PROMPT
from app.prompts.outliner import OUTLINER_PROMPT
from app.prompts.clarification import CLARIFICATION_PROMPT
from app.prompts.sow import (
    SOW_SCOPE_PROMPT,
    SOW_TIMELINE_PROMPT,
    SOW_COMPILER_PROMPT,
)
from app.prompts.prd import (
    PRD_FEATURES_PROMPT,
    PRD_USER_STORIES_PROMPT,
    PRD_COMPILER_PROMPT,
)
import json

router = APIRouter(prefix="/documents", tags=["documents"])


def limit_document_planning(request: Request):
    enforce_limit(request, "document_planning")


def limit_document_compile(request: Request):
    enforce_limit(request, "document_compile")


def limit_document_revise(request: Request):
    enforce_limit(request, "document_revise")


def _owner_fields(owner):
    if owner["type"] == "user":
        return {"user_id": owner["data"].id, "guest_session_id": None}
    return {"user_id": None, "guest_session_id": owner["data"].id}


def _owner_filter(query, owner):
    if owner["type"] == "user":
        return query.filter(Document.user_id == owner["data"].id)
    return query.filter(Document.guest_session_id == owner["data"].id)


def _document_title(doc_type: str, brief: dict) -> str:
    product = brief.get("product_type") if isinstance(brief, dict) else None
    if isinstance(product, dict):
        product = product.get("value")
    product = str(product or "Generated Document").strip()
    return f"{product} {doc_type}".strip()


def _document_payload(document: Document) -> dict:
    return {
        "id": str(document.id),
        "type": document.type.value if hasattr(document.type, "value") else document.type,
        "title": document.title,
        "created_at": document.created_at,
        "updated_at": document.updated_at,
        "docx_path": document.docx_path,
        "download_url": f"/documents/{document.id}/download",
    }


def _safe_remove_local_file(path: str | None) -> None:
    if not path:
        return
    try:
        if os.path.exists(path):
            os.unlink(path)
    except OSError:
        pass


def _cleanup_uploaded_files(storage_keys: list[str]) -> None:
    for key in reversed(storage_keys):
        try:
            delete_file(key)
        except Exception:
            pass


def _brief_context(brief: dict, owner) -> str:
    context = json.dumps(brief, indent=2)
    user_context = build_user_context(owner)
    if user_context:
        context += f"\n\nUser profile context:\n{user_context}"
    return context


def _validate_generation_body(brief, answers, outline, outline_name: str) -> None:
    if not brief:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Brief is missing - please run intake first"
        )

    if not isinstance(answers, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Answers must be a list"
        )

    if not isinstance(outline, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{outline_name} must be a list"
        )


def _generate_sow_payload(
    *,
    db: Session,
    owner,
    brief: dict,
    answers: list,
    sow_outline: list,
    uploaded_files: list[str],
) -> dict:
    brief_context = _brief_context(brief, owner)
    scope_prompt = SOW_SCOPE_PROMPT.format(
        structured_brief=brief_context,
        user_answers=json.dumps(answers, indent=2),
        sow_outline=json.dumps(sow_outline, indent=2),
    )
    scope_raw = call_ai(scope_prompt)
    scope_plan = parse_json_response(scope_raw)

    if not scope_plan:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate SOW scope plan"
        )

    timeline_prompt = SOW_TIMELINE_PROMPT.format(
        structured_brief=brief_context,
        user_answers=json.dumps(answers, indent=2),
        sow_outline=json.dumps(sow_outline, indent=2),
        scope_plan=json.dumps(scope_plan, indent=2),
    )
    timeline_raw = call_ai(timeline_prompt)
    timeline_plan = parse_json_response(timeline_raw)

    if not timeline_plan:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate SOW timeline plan"
        )

    compiler_prompt = SOW_COMPILER_PROMPT.format(
        structured_brief=brief_context,
        user_answers=json.dumps(answers, indent=2),
        sow_outline=json.dumps(sow_outline, indent=2),
        scope_plan=json.dumps(scope_plan, indent=2),
        timeline_plan=json.dumps(timeline_plan, indent=2),
    )
    sow_markdown = call_ai(compiler_prompt)

    if not sow_markdown:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compile SOW document"
        )

    title = _document_title("SOW", brief)
    document = _store_generated_document(
        db=db,
        owner=owner,
        doc_type=DocumentType.SOW,
        title=title,
        markdown=sow_markdown.strip(),
        uploaded_files=uploaded_files,
    )

    return {
        "scope_plan": scope_plan,
        "timeline_plan": timeline_plan,
        "sow_markdown": sow_markdown.strip(),
        "document": _document_payload(document),
    }


def _generate_prd_payload(
    *,
    db: Session,
    owner,
    brief: dict,
    answers: list,
    prd_outline: list,
    uploaded_files: list[str],
) -> dict:
    brief_context = _brief_context(brief, owner)
    features_prompt = PRD_FEATURES_PROMPT.format(
        structured_brief=brief_context,
        user_answers=json.dumps(answers, indent=2),
        prd_outline=json.dumps(prd_outline, indent=2),
    )
    features_raw = call_ai(features_prompt)
    feature_requirements = parse_json_response(features_raw)

    if not feature_requirements:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PRD feature requirements"
        )

    stories_prompt = PRD_USER_STORIES_PROMPT.format(
        structured_brief=brief_context,
        user_answers=json.dumps(answers, indent=2),
        feature_requirements=json.dumps(feature_requirements, indent=2),
    )
    stories_raw = call_ai(stories_prompt)
    user_stories = parse_json_response(stories_raw)

    if not user_stories:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PRD user stories"
        )

    compiler_prompt = PRD_COMPILER_PROMPT.format(
        structured_brief=brief_context,
        user_answers=json.dumps(answers, indent=2),
        prd_outline=json.dumps(prd_outline, indent=2),
        feature_requirements=json.dumps(feature_requirements, indent=2),
        user_stories=json.dumps(user_stories, indent=2),
    )
    prd_markdown = call_ai(compiler_prompt)

    if not prd_markdown:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compile PRD document"
        )

    title = _document_title("PRD", brief)
    document = _store_generated_document(
        db=db,
        owner=owner,
        doc_type=DocumentType.PRD,
        title=title,
        markdown=prd_markdown.strip(),
        uploaded_files=uploaded_files,
    )

    return {
        "feature_requirements": feature_requirements,
        "user_stories": user_stories,
        "prd_markdown": prd_markdown.strip(),
        "document": _document_payload(document),
    }


def _store_generated_document(
    *,
    db: Session,
    owner,
    doc_type: DocumentType,
    title: str,
    markdown: str,
    uploaded_files: list[str],
) -> Document:
    document = Document(
        **_owner_fields(owner),
        type=doc_type,
        title=title,
        content=markdown,
    )
    db.add(document)
    db.flush()

    local_docx = None
    try:
        local_docx = render_docx_from_markdown(
            markdown=markdown,
            title=title,
            document_type=doc_type.value,
        )
        owner_prefix = "users" if owner["type"] == "user" else "guests"
        storage_key = f"{owner_prefix}/{owner['data'].id}/documents/{document.id}/v1.docx"
        stored_key = upload_file(
            local_docx,
            storage_key,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        uploaded_files.append(stored_key)
        document.docx_path = stored_key
    finally:
        _safe_remove_local_file(local_docx)

    return document


def _regenerate_document_file(*, db: Session, owner, document: Document) -> Document:
    previous_key = document.docx_path
    local_docx = None
    stored_key = None
    try:
        local_docx = render_docx_from_markdown(
            markdown=document.content,
            title=document.title,
            document_type=document.type.value,
        )
        owner_prefix = "users" if owner["type"] == "user" else "guests"
        version = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        storage_key = f"{owner_prefix}/{owner['data'].id}/documents/{document.id}/v{version}.docx"
        stored_key = upload_file(
            local_docx,
            storage_key,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        document.docx_path = stored_key
        db.commit()
        db.refresh(document)
    except Exception:
        db.rollback()
        if stored_key:
            _cleanup_uploaded_files([stored_key])
        raise
    finally:
        _safe_remove_local_file(local_docx)

    if previous_key and previous_key != stored_key:
        try:
            delete_file(previous_key)
        except Exception:
            pass
    return document


REVISION_PROMPT = """
You are Clariva, an expert product documentation editor.

Revise the existing {document_type} using the user's instruction.

Rules:
- Return the full revised document, not a summary.
- Preserve strong document structure and professional formatting in Markdown.
- Apply the user's requested edit directly.
- Do not mention that you revised it.
- Do not wrap the response in code fences.

User instruction:
{instruction}

Existing document:
{existing_document}
"""


@router.get("", response_model=list[DocumentResponse])
async def list_documents(
    db: Session = Depends(get_db),
    owner=Depends(get_current_user_or_guest),
):
    query = _owner_filter(db.query(Document), owner)
    return query.order_by(Document.created_at.desc()).all()


@router.delete("")
@router.delete("/", include_in_schema=False)
async def clear_documents(
    db: Session = Depends(get_db),
    owner=Depends(get_current_user_or_guest),
):
    documents = _owner_filter(db.query(Document), owner).all()
    storage_keys = [doc.docx_path for doc in documents if doc.docx_path]
    try:
        for doc in documents:
            db.delete(doc)
        db.commit()
    except Exception:
        db.rollback()
        raise
    _cleanup_uploaded_files(storage_keys)
    return {"message": "All documents cleared"}


@router.delete("/{document_id}")
@router.delete("/{document_id}/", include_in_schema=False)
async def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    owner=Depends(get_current_user_or_guest),
):
    document = _owner_filter(db.query(Document), owner).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    storage_key = document.docx_path
    db.delete(document)
    db.commit()
    _cleanup_uploaded_files([storage_key] if storage_key else [])
    return {"message": "Document deleted"}


@router.get("/{document_id}/download")
async def download_document(
    document_id: str,
    db: Session = Depends(get_db),
    owner=Depends(get_current_user_or_guest),
):
    document = _owner_filter(db.query(Document), owner).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if not document.docx_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document file is not available")

    local_path = Path(document.docx_path)
    if local_path.exists():
        return FileResponse(
            path=local_path,
            filename=f"{document.title}.docx",
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )

    return RedirectResponse(get_download_url(document.docx_path))


@router.post("/{document_id}/revise")
async def revise_document(
    document_id: str,
    body: dict,
    request: Request,
    db: Session = Depends(get_db),
    owner=Depends(get_current_user_or_guest),
    _=Depends(limit_document_revise),
):
    instruction = str(body.get("instruction") or "").strip()
    if len(instruction) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide an edit instruction",
        )

    document = _owner_filter(db.query(Document), owner).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    revised_content = call_ai(
        REVISION_PROMPT.format(
            document_type=document.type.value,
            instruction=instruction,
            existing_document=document.content,
        )
    )

    if not revised_content:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revise document",
        )

    document.content = revised_content.strip()
    document = _regenerate_document_file(db=db, owner=owner, document=document)

    return {
        "document": _document_payload(document),
        "message": f"Updated {document.type.value} document is ready.",
    }


@router.post("/intake")
async def intake(
    body: IntakeInput,
    request: Request,
    db = Depends(get_db),
    _=Depends(limit_document_planning),
):
    if not body.idea or len(body.idea.strip()) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Idea is too short — please provide more detail"
        )

    prompt = INTAKE_PROMPT.format(idea=body.idea)
    raw = call_ai(prompt)
    brief = parse_json_response(raw)

    if not brief:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong — please try again"
        )

    return {"brief": brief}


@router.post("/clarify")
async def clarify(
    body: dict,
    request: Request,
    db = Depends(get_db),
    _=Depends(limit_document_planning),
):
    brief = body.get("brief")

    if not brief:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Brief is missing — please run intake first"
        )

    prompt = CLARIFICATION_PROMPT.format(
        structured_brief=json.dumps(brief, indent=2)
    )
    raw = call_ai(prompt)

    if not raw:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong — please try again"
        )

    questions = []
    for line in raw.strip().split("\n"):
        line = line.strip()
        if line:
            cleaned = line.lstrip("0123456789.-) ").strip()
            if cleaned:
                questions.append(cleaned)

    return {"questions": questions}

@router.post("/outline")
async def outline(
    body: dict,
    request: Request,
    db = Depends(get_db),
    _=Depends(limit_document_planning),
):
    brief = body.get("brief")
    answers = body.get("answers")

    if not brief:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Brief is missing — please run intake first"
        )

    if not answers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Answers are missing — please answer the clarifying questions first"
        )

    prompt = OUTLINER_PROMPT.format(
        structured_brief=json.dumps(brief, indent=2),
        user_answers=json.dumps(answers, indent=2)
    )

    raw = call_ai(prompt)

    if not raw:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong — please try again"
        )

    sow_outline = []
    prd_outline = []
    current = None

    for line in raw.strip().split("\n"):
        line = line.strip()
        if line == "SOW OUTLINE":
            current = "sow"
        elif line == "PRD OUTLINE":
            current = "prd"
        elif line and current:
            cleaned = line.lstrip("0123456789.-) ").strip()
            if cleaned:
                if current == "sow":
                    sow_outline.append(cleaned)
                elif current == "prd":
                    prd_outline.append(cleaned)

    return {
        "sow_outline": sow_outline,
        "prd_outline": prd_outline
    }


@router.post("/sow/compile")
async def compile_sow(
    body: dict,
    request: Request,
    db: Session = Depends(get_db),
    owner=Depends(get_current_user_or_guest),
    _=Depends(limit_document_compile),
):
    brief = body.get("brief")
    answers = body.get("answers", [])
    sow_outline = body.get("sow_outline", [])
    _validate_generation_body(brief, answers, sow_outline, "sow_outline")

    cost = GENERATION_COSTS["sow"]
    charge_credits(owner, db, cost=cost, description="SOW generation")
    uploaded_files: list[str] = []

    try:
        payload = _generate_sow_payload(
            db=db,
            owner=owner,
            brief=brief,
            answers=answers,
            sow_outline=sow_outline,
            uploaded_files=uploaded_files,
        )
        db.commit()
    except HTTPException as exc:
        db.rollback()
        _cleanup_uploaded_files(uploaded_files)
        if exc.status_code >= 500:
            refund_credits(owner, db, amount=cost, reason="SOW generation failed")
        raise
    except Exception:
        db.rollback()
        _cleanup_uploaded_files(uploaded_files)
        refund_credits(owner, db, amount=cost, reason="SOW generation failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Generation failed. Credits refunded.",
        )

    return payload


@router.post("/prd/compile")
async def compile_prd(
    body: dict,
    request: Request,
    db: Session = Depends(get_db),
    owner=Depends(get_current_user_or_guest),
    _=Depends(limit_document_compile),
):
    brief = body.get("brief")
    answers = body.get("answers", [])
    prd_outline = body.get("prd_outline", [])
    _validate_generation_body(brief, answers, prd_outline, "prd_outline")

    cost = GENERATION_COSTS["prd"]
    charge_credits(owner, db, cost=cost, description="PRD generation")
    uploaded_files: list[str] = []

    try:
        payload = _generate_prd_payload(
            db=db,
            owner=owner,
            brief=brief,
            answers=answers,
            prd_outline=prd_outline,
            uploaded_files=uploaded_files,
        )
        db.commit()
    except HTTPException as exc:
        db.rollback()
        _cleanup_uploaded_files(uploaded_files)
        if exc.status_code >= 500:
            refund_credits(owner, db, amount=cost, reason="PRD generation failed")
        raise
    except Exception:
        db.rollback()
        _cleanup_uploaded_files(uploaded_files)
        refund_credits(owner, db, amount=cost, reason="PRD generation failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Generation failed. Credits refunded.",
        )

    return payload


@router.post("/both/compile")
async def compile_both(
    body: dict,
    request: Request,
    db: Session = Depends(get_db),
    owner=Depends(get_current_user_or_guest),
    _=Depends(limit_document_compile),
):
    brief = body.get("brief")
    answers = body.get("answers", [])
    sow_outline = body.get("sow_outline", [])
    prd_outline = body.get("prd_outline", [])

    _validate_generation_body(brief, answers, sow_outline, "sow_outline")
    _validate_generation_body(brief, answers, prd_outline, "prd_outline")

    cost = GENERATION_COSTS["both"]
    charge_credits(owner, db, cost=cost, description="SOW + PRD bundle generation")
    uploaded_files: list[str] = []

    try:
        sow_payload = _generate_sow_payload(
            db=db,
            owner=owner,
            brief=brief,
            answers=answers,
            sow_outline=sow_outline,
            uploaded_files=uploaded_files,
        )
        prd_payload = _generate_prd_payload(
            db=db,
            owner=owner,
            brief=brief,
            answers=answers,
            prd_outline=prd_outline,
            uploaded_files=uploaded_files,
        )
        db.commit()
    except HTTPException as exc:
        db.rollback()
        _cleanup_uploaded_files(uploaded_files)
        if exc.status_code >= 500:
            refund_credits(owner, db, amount=cost, reason="SOW + PRD bundle generation failed")
        raise
    except Exception:
        db.rollback()
        _cleanup_uploaded_files(uploaded_files)
        refund_credits(owner, db, amount=cost, reason="SOW + PRD bundle generation failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Generation failed. Credits refunded.",
        )

    return {
        "sow": sow_payload,
        "prd": prd_payload,
        "documents": [
            sow_payload["document"],
            prd_payload["document"],
        ],
    }
