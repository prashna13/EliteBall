from fastapi import APIRouter

from app.api.api_v1.endpoints import auth, matches, quiz, leaderboard, friends

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(matches.router, prefix="/matches", tags=["matches"])
api_router.include_router(quiz.router, prefix="/quiz", tags=["quiz"])
api_router.include_router(leaderboard.router, prefix="/leaderboard", tags=["leaderboard"])
api_router.include_router(friends.router, prefix="/friends", tags=["friends"])
