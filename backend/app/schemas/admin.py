from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class AdminMatchUpsert(BaseModel):
    """
    Match metadata that can either create a new match or update an existing one.
    If `id` is provided, we update that match; otherwise we create a new match.
    """

    id: Optional[int] = None
    home_team: str
    away_team: str
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    status: str = "FINISHED"
    match_date: datetime
    stadium: Optional[str] = None


class AdminQuestionCreate(BaseModel):
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_option: str = Field(..., description='One of "A","B","C","D"')
    explanation: Optional[str] = None


class AdminQuizImportPayload(BaseModel):
    """
    Payload you can paste/upload as JSON from the admin page.

    Minimal viable example:
    {
      "match": { "home_team": "...", "away_team": "...", "match_date": "2026-06-16T12:00:00Z", "status": "FINISHED" },
      "quiz": { "title": "..." },
      "questions": [ ... ]
    }
    """

    match: AdminMatchUpsert
    quiz: dict = Field(default_factory=dict, description='Must include "title"')
    questions: List[AdminQuestionCreate]
    replace_existing: bool = False


class AdminQuizImportResult(BaseModel):
    match_id: int
    quiz_id: int
    questions_created: int
