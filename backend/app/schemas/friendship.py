from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.schemas.user import UserResponse

class FriendshipBase(BaseModel):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class FriendshipResponse(FriendshipBase):
    user: UserResponse
    friend: UserResponse

class FriendshipRequestCreate(BaseModel):
    friend_username: str

class FriendshipAction(BaseModel):
    friendship_id: int
    action: str  # "ACCEPT" or "DECLINE"

class FriendshipStatusEnum(BaseModel):
    # Status of friendship with respect to another user
    status: str  # "NONE", "PENDING_SENT", "PENDING_RECEIVED", "ACCEPTED"
    friendship_id: Optional[int] = None

class UserSearchResponse(BaseModel):
    id: int
    username: str
    profile_picture_url: Optional[str] = None
    friendship_status: str  # "NONE", "PENDING_SENT", "PENDING_RECEIVED", "ACCEPTED"
    friendship_id: Optional[int] = None

    class Config:
        from_attributes = True

class FriendLeaderboardEntry(BaseModel):
    rank: int
    username: str
    total_score: int
    quizzes_completed: int
    accuracy: float  # Percentage of correct answers

    class Config:
        from_attributes = True
