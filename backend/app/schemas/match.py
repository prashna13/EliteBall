from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class MatchBase(BaseModel):
    home_team: str
    away_team: str
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    status: str  # "UPCOMING" or "FINISHED"
    match_date: datetime
    stadium: Optional[str] = None

class MatchCreate(MatchBase):
    pass

class MatchResponse(MatchBase):
    id: int
    has_quiz: bool = False

    class Config:
        from_attributes = True
