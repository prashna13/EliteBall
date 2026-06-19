from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.core.config import settings
from app.api.api_v1.api import api_router
from app.core.database import init_db

# Initialize DB (safe for Supabase — does not run create_all on Postgres)
init_db()

# Dynamically set root_path only when deployed on Vercel
# Vercel environments automatically include VERCEL=1 or you can check if it's not local
IS_VERCEL = os.getenv("VERCEL") == "1" or os.getenv("ENVIRONMENT") != "local"

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    root_path="/_backend" if IS_VERCEL else ""
)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    # Handle single string vs list
    origins = settings.BACKEND_CORS_ORIGINS
    if isinstance(origins, str):
        origins = [origins]
    
    # In production, ensure we allow everything if needed, or add your specific domains
    # To be totally safe with Vercel routing, we can append "*" or keep your strict settings
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin).rstrip("/") for origin in origins] or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # Fallback CORS to avoid pre-flight blockers during routing transitions
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": f"Welcome to the {settings.PROJECT_NAME} API. Check /docs for interactive API documentation."
    }