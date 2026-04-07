from pydantic import BaseModel
from app.models.document import DocumentType

class IntakeInput(BaseModel):
    idea: str

class ClarificationAnswer(BaseModel):
    question: str
    answer: str

class ClarificationAnswers(BaseModel):
    answers: list[ClarificationAnswer]

class DocumentSelection(BaseModel):
    type: DocumentType
    brief: dict
    answers: list[ClarificationAnswer]