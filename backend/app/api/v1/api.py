from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin, auth, lms, mentors, mentorship_requests,
    peer_sessions, profile, sessions,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(mentors.router)
api_router.include_router(mentorship_requests.router)
api_router.include_router(lms.router)
api_router.include_router(admin.router)
api_router.include_router(sessions.router)
api_router.include_router(profile.router)
api_router.include_router(peer_sessions.router)
