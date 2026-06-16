from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.core.database import fix_postgres_sequences
from app.models.match import Match
from app.models.quiz import Quiz, Question
from app.models.user import User
from app.schemas.admin import AdminQuizImportResult
from app.utils.quiz_import import normalize_quiz_import


router = APIRouter()


def _apply_match_fields(match: Match, match_in, match_status: str) -> None:
    match.home_team = match_in.home_team
    match.away_team = match_in.away_team
    match.home_score = match_in.home_score
    match.away_score = match_in.away_score
    match.status = match_status
    match.match_date = match_in.match_date
    match.stadium = match_in.stadium


def _find_or_create_match(db: Session, match_in, match_status: str) -> Match:
    if match_in.id is not None:
        match = db.query(Match).filter(Match.id == match_in.id).first()
        if not match:
            raise HTTPException(status_code=404, detail="Match not found for provided match.id")
        _apply_match_fields(match, match_in, match_status)
        return match

    match = (
        db.query(Match)
        .filter(
            Match.home_team.ilike(match_in.home_team.strip()),
            Match.away_team.ilike(match_in.away_team.strip()),
        )
        .first()
    )
    if match:
        _apply_match_fields(match, match_in, match_status)
        return match

    match = Match(
        home_team=match_in.home_team,
        away_team=match_in.away_team,
        home_score=match_in.home_score,
        away_score=match_in.away_score,
        status=match_status,
        match_date=match_in.match_date,
        stadium=match_in.stadium,
    )
    db.add(match)
    return match


def _commit_with_sequence_fix(db: Session) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if "duplicate key value violates unique constraint" in str(exc).lower():
            fix_postgres_sequences()
            raise HTTPException(
                status_code=409,
                detail="Database ID sequence was out of sync. Sequences were reset — please click Import again.",
            ) from exc
        raise


def _require_admin(current_user: User) -> None:
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )


@router.post("/quizzes/import", response_model=AdminQuizImportResult)
def import_quiz_from_json(
    raw_payload: dict = Body(...),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Admin-only endpoint to import (or replace) a match quiz from JSON.
    Accepts both structured format and AI-generated format.
    """
    _require_admin(current_user)

    fix_postgres_sequences()

    try:
        payload = normalize_quiz_import(raw_payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    title = payload.quiz.get("title")
    if not title or not isinstance(title, str):
        raise HTTPException(status_code=400, detail='quiz.title is required')

    if not payload.questions:
        raise HTTPException(status_code=400, detail="questions must be a non-empty array")

    # 1) Upsert match
    match_in = payload.match
    match_status = match_in.status.upper().strip()
    if match_status not in {"FINISHED", "UPCOMING"}:
        raise HTTPException(
            status_code=400,
            detail='match.status must be "FINISHED" or "UPCOMING"',
        )

    match: Match | None = None

    match = _find_or_create_match(db, match_in, match_status)

    _commit_with_sequence_fix(db)
    db.refresh(match)

    # 2) Create/replace quiz for match
    existing_quiz = db.query(Quiz).filter(Quiz.match_id == match.id).first()
    if existing_quiz:
        if not payload.replace_existing:
            raise HTTPException(
                status_code=400,
                detail="Quiz already exists for this match. Set replace_existing=true to overwrite.",
            )
        # Delete old questions first (safe even with cascade, keeps intent explicit)
        db.query(Question).filter(Question.quiz_id == existing_quiz.id).delete()
        existing_quiz.title = title
        quiz = existing_quiz
    else:
        quiz = Quiz(match_id=match.id, title=title)
        db.add(quiz)

    _commit_with_sequence_fix(db)
    db.refresh(quiz)

    # 3) Insert questions
    created = 0
    for q in payload.questions:
        correct = q.correct_option.upper().strip()
        if correct not in {"A", "B", "C", "D"}:
            raise HTTPException(status_code=400, detail=f"Invalid correct_option: {q.correct_option}")
        db.add(
            Question(
                quiz_id=quiz.id,
                question_text=q.question_text,
                option_a=q.option_a,
                option_b=q.option_b,
                option_c=q.option_c,
                option_d=q.option_d,
                correct_option=correct,
                explanation=q.explanation,
            )
        )
        created += 1

    _commit_with_sequence_fix(db)

    return {
        "match_id": match.id,
        "quiz_id": quiz.id,
        "questions_created": created,
    }

