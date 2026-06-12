from typing import Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api import deps
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter()

@router.get("/global", response_model=List[UserResponse])
def get_global_leaderboard(
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_user)
) -> Any:
    """
    Get the global leaderboard of all users ranked by total score.
    """
    users = db.query(User).order_by(User.total_score.desc()).limit(100).all()
    return users
