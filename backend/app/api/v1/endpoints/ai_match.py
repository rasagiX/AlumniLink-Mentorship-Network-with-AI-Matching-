"""
AI Mentor Matching endpoint.

POST /ai-match/mentors
  — Authenticated (student or senior role).
  — Accepts the student's target role, semester, skills, and bio.
  — Runs the full AI pipeline: embed → vector search → LLM re-rank.
  — Returns ranked mentor recommendations with match scores, reasons,
    icebreaker suggestions, and recommended focus areas.
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.core.ai_matching import run_matching
from app.db.session import get_db
from app.models.user import User

router = APIRouter(prefix="/ai-match", tags=["ai-match"])


# ── Request schema ────────────────────────────────────────────────────────────

class MentorMatchRequest(BaseModel):
    target_role: str        = Field(min_length=2, max_length=200,
                                   description="e.g. 'Software Engineer at a product startup'")
    semester:    str        = Field(min_length=1, max_length=50,
                                   description="e.g. '5th semester, 3rd year'")
    skills_and_interests: str = Field(default="", max_length=500,
                                      description="Comma-separated skills/interests")
    bio: Optional[str]      = Field(default=None, max_length=1000,
                                    description="Career goals or personal statement")


# ── Response schemas ──────────────────────────────────────────────────────────

class MentorMatchItem(BaseModel):
    mentor_id:               str
    mentor_name:             str
    title:                   Optional[str]
    company:                 Optional[str]
    domain:                  Optional[str]
    bio:                     Optional[str]
    skills:                  Optional[str]
    capacity:                int
    match_score:             int             # 1-100
    match_reasons:           List[str]
    suggested_icebreaker:    str
    recommended_focus_areas: List[str]
    similarity:              float           # raw cosine similarity [0,1]


class MentorMatchResponse(BaseModel):
    query_summary: str
    total_candidates_evaluated: int
    recommendations: List[MentorMatchItem]


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/mentors", response_model=MentorMatchResponse)
def ai_match_mentors(
    payload: MentorMatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("student", "senior")),
):
    """
    Run the AI mentor matching pipeline for the authenticated student.

    - Uses sentence-transformers/all-MiniLM-L6-v2 locally for embedding.
    - Retrieves top candidates via pgvector cosine similarity (HNSW index).
    - Re-ranks with Groq LLaMA-3.3-70B for structured reasoning and icebreakers.
    - Falls back to vector-score ranking if GROQ_API_KEY is not configured.
    """
    # Merge request bio with the student's saved profile bio (request takes priority)
    effective_bio = payload.bio or current_user.bio or ""
    effective_skills = payload.skills_and_interests or current_user.skills or ""

    try:
        results = run_matching(
            db=db,
            target_role=payload.target_role,
            semester=payload.semester,
            skills_and_interests=effective_skills,
            bio=effective_bio,
        )
    except Exception as exc:
        import logging
        logging.getLogger(__name__).exception("AI matching pipeline error")
        raise HTTPException(status_code=500, detail=f"Matching engine error: {exc}")

    return MentorMatchResponse(
        query_summary=(
            f"{current_user.name} → {payload.target_role} "
            f"({payload.semester})"
        ),
        total_candidates_evaluated=len(results),
        recommendations=[
            MentorMatchItem(
                mentor_id=r.mentor_id,
                mentor_name=r.mentor_name,
                title=r.title,
                company=r.company,
                domain=r.domain,
                bio=r.bio,
                skills=r.skills,
                capacity=r.capacity,
                match_score=r.match_score,
                match_reasons=r.match_reasons,
                suggested_icebreaker=r.suggested_icebreaker,
                recommended_focus_areas=r.recommended_focus_areas,
                similarity=round(r.similarity, 4),
            )
            for r in results
        ],
    )
