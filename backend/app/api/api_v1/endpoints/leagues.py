from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.models.league import League
from app.models.user import User
from app.schemas.league import (
    LeagueCreate,
    LeagueDetailedResponse,
    LeagueJoin,
    LeagueResponse,
)

router = APIRouter()


@router.post("/", response_model=LeagueResponse, status_code=status.HTTP_201_CREATED)
def create_league(
    *,
    db: Session = Depends(deps.get_db),
    league_in: LeagueCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create a new private league and automatically join it as owner and member.
    """
    existing_league = db.query(League).filter(League.name.ilike(league_in.name.strip())).first()
    if existing_league:
        raise HTTPException(
            status_code=400,
            detail="A league with this name already exists. Choose a unique name.",
        )

    league = League(
        name=league_in.name.strip(),
        owner_id=current_user.id,
    )
    # Add owner to members list
    league.members.append(current_user)
    
    db.add(league)
    db.commit()
    db.refresh(league)
    return league


@router.post("/join", response_model=LeagueResponse)
def join_league(
    *,
    db: Session = Depends(deps.get_db),
    league_in: LeagueJoin,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Join a private league by its name.
    """
    league = db.query(League).filter(League.name.ilike(league_in.name.strip())).first()
    if not league:
        raise HTTPException(
            status_code=404,
            detail="League not found. Check the name and try again.",
        )

    if current_user in league.members:
        raise HTTPException(
            status_code=400,
            detail="You are already a member of this league.",
        )

    league.members.append(current_user)
    db.commit()
    db.refresh(league)
    return league


@router.get("/", response_model=List[LeagueResponse])
def get_my_leagues(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get all leagues the current user is a member of.
    """
    return current_user.leagues


@router.get("/{league_id}", response_model=LeagueDetailedResponse)
def get_league_details(
    league_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get private league details and standings leaderboard.
    """
    league = db.query(League).filter(League.id == league_id).first()
    if not league:
        raise HTTPException(status_code=404, detail="League not found.")

    if current_user not in league.members:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this league to view details.",
        )

    # Sort members by total_score descending
    sorted_members = sorted(league.members, key=lambda u: u.total_score, reverse=True)
    
    # Map to schema-like dictionary to avoid lazy loading issues inside response
    return {
        "id": league.id,
        "name": league.name,
        "owner_id": league.owner_id,
        "members": sorted_members,
    }


@router.post("/{league_id}/leave", status_code=status.HTTP_200_OK)
def leave_league(
    league_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Leave a private league. Owners cannot leave.
    """
    league = db.query(League).filter(League.id == league_id).first()
    if not league:
        raise HTTPException(status_code=404, detail="League not found.")

    if current_user not in league.members:
        raise HTTPException(
            status_code=400,
            detail="You are not a member of this league.",
        )

    if league.owner_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="As owner, you cannot leave the league. Delete the league instead.",
        )

    league.members.remove(current_user)
    db.commit()
    return {"detail": "Successfully left the league."}


@router.delete("/{league_id}", status_code=status.HTTP_200_OK)
def delete_league(
    league_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Delete a private league. Only the owner can delete it.
    """
    league = db.query(League).filter(League.id == league_id).first()
    if not league:
        raise HTTPException(status_code=404, detail="League not found.")

    if league.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the league owner can delete this league.",
        )

    # Clear memberships first to avoid constraint issues, then delete league
    league.members.clear()
    db.delete(league)
    db.commit()
    return {"detail": "League successfully deleted."}
