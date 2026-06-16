from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, List, Tuple

from app.schemas.admin import AdminMatchUpsert, AdminQuestionCreate, AdminQuizImportPayload


def _parse_teams(match_str: str) -> Tuple[str, str]:
    for sep in (" vs ", " v ", " VS ", " V "):
        if sep.lower() in match_str.lower():
            parts = re.split(re.escape(sep), match_str, maxsplit=1, flags=re.IGNORECASE)
            if len(parts) == 2:
                return parts[0].strip(), parts[1].strip()
    raise ValueError(
        f'Could not parse teams from match string "{match_str}". Use format "Team A vs Team B".'
    )


def _parse_match_date(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    if not isinstance(value, str) or not value.strip():
        raise ValueError("match_date is required")

    text = value.strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", text):
        return datetime.fromisoformat(f"{text}T12:00:00").replace(tzinfo=timezone.utc)

    dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _extract_score(quiz_items: List[dict], summary: str | None) -> Tuple[int | None, int | None]:
    for item in quiz_items:
        question = str(item.get("question", "")).lower()
        if "final score" in question or "score" in question and "goal" not in question:
            answer = str(item.get("correct_answer", "")).strip()
            m = re.search(r"(\d+)\s*-\s*(\d+)", answer)
            if m:
                return int(m.group(1)), int(m.group(2))

    if summary:
        m = re.search(r"(\d+)\s*-\s*(\d+)", summary)
        if m:
            return int(m.group(1)), int(m.group(2))

    return None, None


def _convert_ai_question(item: dict, default_explanation: str | None) -> AdminQuestionCreate:
    question_text = item.get("question_text") or item.get("question")
    options = item.get("options")

    if not question_text:
        raise ValueError("Each quiz item must include a question")

    if isinstance(options, list):
        if len(options) != 4:
            raise ValueError(
                f'Question "{question_text}" must have exactly 4 options (found {len(options)})'
            )
        option_a, option_b, option_c, option_d = [str(o).strip() for o in options]
    else:
        option_a = item.get("option_a")
        option_b = item.get("option_b")
        option_c = item.get("option_c")
        option_d = item.get("option_d")
        if not all([option_a, option_b, option_c, option_d]):
            raise ValueError(
                f'Question "{question_text}" must include options as an array of 4 items '
                'or option_a/option_b/option_c/option_d fields'
            )

    correct_option = item.get("correct_option")
    if correct_option:
        letter = str(correct_option).upper().strip()
        if letter not in {"A", "B", "C", "D"}:
            raise ValueError(f'Invalid correct_option "{correct_option}" for question "{question_text}"')
    else:
        correct_answer = str(item.get("correct_answer", "")).strip()
        if not correct_answer:
            raise ValueError(f'Question "{question_text}" is missing correct_answer or correct_option')

        labeled = {
            "A": option_a,
            "B": option_b,
            "C": option_c,
            "D": option_d,
        }
        letter = None
        for key, value in labeled.items():
            if value.strip().lower() == correct_answer.lower():
                letter = key
                break
        if not letter:
            raise ValueError(
                f'correct_answer "{correct_answer}" does not match any option for question "{question_text}"'
            )

    explanation = item.get("explanation") or default_explanation

    return AdminQuestionCreate(
        question_text=str(question_text).strip(),
        option_a=option_a,
        option_b=option_b,
        option_c=option_c,
        option_d=option_d,
        correct_option=letter,
        explanation=explanation,
    )


def _normalize_ai_format(data: dict) -> AdminQuizImportPayload:
    match_str = data.get("match")
    quiz_items = data.get("quiz")

    if not isinstance(match_str, str) or not match_str.strip():
        raise ValueError('AI format requires "match" as a string like "Argentina vs Brazil"')
    if not isinstance(quiz_items, list) or not quiz_items:
        raise ValueError('AI format requires "quiz" as a non-empty array of questions')

    home_team, away_team = _parse_teams(match_str)
    match_date = _parse_match_date(data.get("match_date"))
    summary = data.get("summary")
    competition = data.get("competition") or "Match Quiz"
    home_score, away_score = _extract_score(quiz_items, summary if isinstance(summary, str) else None)

    title = data.get("quiz_title") or f"{competition}: {home_team} vs {away_team}"
    default_explanation = summary if isinstance(summary, str) else None

    questions = [_convert_ai_question(item, default_explanation) for item in quiz_items]

    return AdminQuizImportPayload(
        match=AdminMatchUpsert(
            id=data.get("match_id"),
            home_team=home_team,
            away_team=away_team,
            home_score=home_score,
            away_score=away_score,
            status=str(data.get("status", "FINISHED")),
            match_date=match_date,
            stadium=data.get("stadium"),
        ),
        quiz={"title": title},
        questions=questions,
        replace_existing=bool(data.get("replace_existing", False)),
    )


def _normalize_structured_format(data: dict) -> AdminQuizImportPayload:
    match_data = data.get("match")
    if not isinstance(match_data, dict):
        raise ValueError('"match" must be an object with home_team and away_team')

    questions_raw = data.get("questions")
    if not isinstance(questions_raw, list) or not questions_raw:
        raise ValueError('"questions" must be a non-empty array')

    quiz_meta = data.get("quiz") if isinstance(data.get("quiz"), dict) else {}
    title = quiz_meta.get("title")
    if not title:
        raise ValueError('quiz.title is required in structured format')

    questions = [_convert_ai_question(item, None) for item in questions_raw]

    return AdminQuizImportPayload(
        match=AdminMatchUpsert(
            id=match_data.get("id"),
            home_team=match_data["home_team"],
            away_team=match_data["away_team"],
            home_score=match_data.get("home_score"),
            away_score=match_data.get("away_score"),
            status=str(match_data.get("status", "FINISHED")),
            match_date=_parse_match_date(match_data["match_date"]),
            stadium=match_data.get("stadium"),
        ),
        quiz={"title": title},
        questions=questions,
        replace_existing=bool(data.get("replace_existing", False)),
    )


def normalize_quiz_import(data: Any) -> AdminQuizImportPayload:
    if not isinstance(data, dict):
        raise ValueError("Import payload must be a JSON object")

    match_value = data.get("match")
    quiz_value = data.get("quiz")

    if isinstance(match_value, str) and isinstance(quiz_value, list):
        return _normalize_ai_format(data)

    if isinstance(match_value, dict) and isinstance(data.get("questions"), list):
        return _normalize_structured_format(data)

    raise ValueError(
        "Unrecognized quiz JSON format. Use either the AI format "
        '(match: "Team A vs Team B", quiz: [...]) or the structured format '
        "(match: {...}, quiz: {title: ...}, questions: [...])."
    )
