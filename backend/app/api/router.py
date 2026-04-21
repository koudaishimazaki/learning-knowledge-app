from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.automation import router as automation_router
from app.api.notes import router as notes_router
from app.api.stats import router as stats_router
from app.api.tags import router as tags_router
from app.api.topics import router as topics_router

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(automation_router)
api_router.include_router(notes_router)
api_router.include_router(stats_router)
api_router.include_router(tags_router)
api_router.include_router(topics_router)

