from typing import Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api import deps
from app.models.match import Match
from app.schemas.match import MatchResponse

router = APIRouter()

@router.get("/", response_model=List[MatchResponse])
def read_matches(
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    """
    Retrieve matches.
    """
    matches = db.query(Match).order_by(Match.match_date.desc()).all()
    
    # Map model to schemas and calculate has_quiz
    response_data = []
    for match in matches:
        match_dict = {
            "id": match.id,
            "home_team": match.home_team,
            "away_team": match.away_team,
            "home_score": match.home_score,
            "away_score": match.away_score,
            "status": match.status,
            "match_date": match.match_date,
            "stadium": match.stadium,
            "has_quiz": match.quiz is not None and match.status == "FINISHED"
        }
        response_data.append(match_dict)
        
    return response_data
