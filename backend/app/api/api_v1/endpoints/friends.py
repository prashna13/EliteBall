from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.api import deps
from app.models.friendship import Friendship
from app.models.user import User
from app.schemas.friendship import (
    FriendshipResponse,
    FriendshipRequestCreate,
    FriendshipAction,
    UserSearchResponse,
    FriendLeaderboardEntry
)
from app.schemas.user import UserResponse

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
def get_friends(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Get list of accepted friends.
    """
    friendships = db.query(Friendship).filter(
        and_(
            or_(Friendship.user_id == current_user.id, Friendship.friend_id == current_user.id),
            Friendship.status == "ACCEPTED"
        )
    ).all()

    friends = []
    for f in friendships:
        if f.user_id == current_user.id:
            friends.append(f.friend)
        else:
            friends.append(f.user)
            
    return friends

@router.get("/requests/pending", response_model=List[FriendshipResponse])
def get_pending_requests(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Get list of pending incoming friend requests.
    """
    requests = db.query(Friendship).filter(
        Friendship.friend_id == current_user.id,
        Friendship.status == "PENDING"
    ).all()
    return requests

@router.post("/request", status_code=status.HTTP_201_CREATED)
def send_friend_request(
    request_in: FriendshipRequestCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Send a friend request to another user.
    """
    if request_in.friend_username == current_user.username:
        raise HTTPException(status_code=400, detail="You cannot add yourself as a friend")

    friend = db.query(User).filter(User.username == request_in.friend_username).first()
    if not friend:
        raise HTTPException(status_code=404, detail="User not found")

    # Check existing relationship (either direction)
    existing = db.query(Friendship).filter(
        or_(
            and_(Friendship.user_id == current_user.id, Friendship.friend_id == friend.id),
            and_(Friendship.user_id == friend.id, Friendship.friend_id == current_user.id)
        )
    ).first()

    if existing:
        if existing.status == "ACCEPTED":
            raise HTTPException(status_code=400, detail="You are already friends")
        elif existing.user_id == current_user.id:
            raise HTTPException(status_code=400, detail="Friend request already sent")
        else:
            # The other user sent a request first; accept it automatically
            existing.status = "ACCEPTED"
            db.commit()
            return {"detail": "Friend request accepted (they had sent a request to you first)"}

    # Create new friendship row
    new_friendship = Friendship(
        user_id=current_user.id,
        friend_id=friend.id,
        status="PENDING"
    )
    db.add(new_friendship)
    db.commit()
    return {"detail": "Friend request sent"}

@router.post("/accept")
def accept_friend_request(
    action_in: FriendshipAction,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Accept a friend request.
    """
    friendship = db.query(Friendship).filter(
        Friendship.id == action_in.friendship_id,
        Friendship.friend_id == current_user.id,
        Friendship.status == "PENDING"
    ).first()

    if not friendship:
        raise HTTPException(status_code=404, detail="Pending friend request not found")

    friendship.status = "ACCEPTED"
    db.commit()
    return {"detail": "Friend request accepted"}

@router.post("/decline")
def decline_friend_request(
    action_in: FriendshipAction,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Decline or cancel a friend request / remove a friend.
    """
    friendship = db.query(Friendship).filter(
        Friendship.id == action_in.friendship_id,
        or_(Friendship.user_id == current_user.id, Friendship.friend_id == current_user.id)
    ).first()

    if not friendship:
        raise HTTPException(status_code=404, detail="Relationship not found")

    db.delete(friendship)
    db.commit()
    return {"detail": "Relationship removed"}

@router.get("/search", response_model=List[UserSearchResponse])
def search_users(
    username: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Search for users and show their friendship status relative to the current user.
    """
    if len(username.strip()) < 2:
        raise HTTPException(status_code=400, detail="Search query must be at least 2 characters")

    # Fetch users matching query, excluding current user
    users = db.query(User).filter(
        and_(
            User.username.ilike(f"%{username}%"),
            User.id != current_user.id
        )
    ).limit(20).all()

    # Fetch all friendships involving current user to map statuses quickly
    friendships = db.query(Friendship).filter(
        or_(Friendship.user_id == current_user.id, Friendship.friend_id == current_user.id)
    ).all()

    # Map relationships: key = external_user_id, value = (status, friendship_id, is_sender)
    rel_map = {}
    for f in friendships:
        if f.user_id == current_user.id:
            rel_map[f.friend_id] = (f.status, f.id, True)
        else:
            rel_map[f.user_id] = (f.status, f.id, False)

    response = []
    for u in users:
        friendship_status = "NONE"
        friendship_id = None

        if u.id in rel_map:
            status_str, fid, is_sender = rel_map[u.id]
            if status_str == "ACCEPTED":
                friendship_status = "ACCEPTED"
            elif status_str == "PENDING":
                friendship_status = "PENDING_SENT" if is_sender else "PENDING_RECEIVED"
            friendship_id = fid

        response.append({
            "id": u.id,
            "username": u.username,
            "profile_picture_url": u.profile_picture_url,
            "friendship_status": friendship_status,
            "friendship_id": friendship_id
        })

    return response

@router.get("/leaderboard", response_model=List[FriendLeaderboardEntry])
def get_friend_leaderboard(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Get a comparative leaderboard of the current user and their friends.
    """
    # 1. Fetch current user's accepted friends
    friendships = db.query(Friendship).filter(
        and_(
            or_(Friendship.user_id == current_user.id, Friendship.friend_id == current_user.id),
            Friendship.status == "ACCEPTED"
        )
    ).all()

    competitors = [current_user]
    for f in friendships:
        if f.user_id == current_user.id:
            competitors.append(f.friend)
        else:
            competitors.append(f.user)

    # Sort competitors by score descending
    competitors.sort(key=lambda x: x.total_score, reverse=True)

    leaderboard = []
    for index, user in enumerate(competitors):
        # Calculate accuracy: correct answers / (10 * completed quizzes)
        accuracy = 0.0
        total_possible = user.quizzes_completed * 10
        if total_possible > 0:
            accuracy = round((user.total_correct_answers / total_possible) * 100, 1)

        leaderboard.append({
            "rank": index + 1,
            "username": user.username,
            "total_score": user.total_score,
            "quizzes_completed": user.quizzes_completed,
            "accuracy": accuracy
        })

    return leaderboard
