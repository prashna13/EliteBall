from pydantic import BaseModel
from typing import List, Optional

class LeagueBase(BaseModel):
    name: str

class LeagueCreate(LeagueBase):
    pass

class LeagueJoin(LeagueBase):
    pass

class LeagueResponse(LeagueBase):
    id: int
    owner_id: int

    class Config:
        from_attributes = True

class LeagueMemberEntry(BaseModel):
    id: int
    username: str
    total_score: int
    quizzes_completed: int
    profile_picture_url: Optional[str] = None

    class Config:
        from_attributes = True

class LeagueDetailedResponse(LeagueResponse):
    members: List[LeagueMemberEntry]
