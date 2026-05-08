from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user_or_guest
from app.database import get_db
from app.models.document import Document

router = APIRouter(prefix="/export", tags=["export"])


def _owner_filter(query, owner):
    if owner["type"] == "user":
        return query.filter(Document.user_id == owner["data"].id)
    return query.filter(Document.guest_session_id == owner["data"].id)


@router.get("/documents/{document_id}")
async def export_document(
    document_id: str,
    format: str = Query(default="docx"),
    db: Session = Depends(get_db),
    owner=Depends(get_current_user_or_guest),
):
    if format.lower() != "docx":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only DOCX export is currently available",
        )

    document = _owner_filter(db.query(Document), owner).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    return RedirectResponse(url=f"/documents/{document_id}/download")
