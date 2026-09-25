from fastapi import APIRouter

from app.api.v1.endpoints import auth, mentors, mentorship_requests

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(mentors.router)
api_router.include_router(mentorship_requests.router)

# As the backend grows, new endpoint modules get one line each here, e.g.:
# from app.api.v1.endpoints import payouts
# api_router.include_router(payouts.router)
