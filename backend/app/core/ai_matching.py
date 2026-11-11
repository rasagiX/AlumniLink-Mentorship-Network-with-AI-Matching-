"""
AI Mentor Matching Engine
=========================

Pipeline:
  1. EMBED  — build a 384-dim vector for the student query using
              sentence-transformers/all-MiniLM-L6-v2 (runs locally, no key).
  2. SEARCH — cosine similarity search over pgvector HNSW index on mentors
              table to retrieve the top-N candidates.
  3. RERANK — send candidate list + student profile to Groq LLM
              (llama-3.3-70b-versatile, free tier) which applies the
              evaluation rubric and returns structured JSON recommendations.

Graceful degradation:
  - If GROQ_API_KEY is not set, skips LLM re-ranking and returns the
    vector-search results with estimated scores (cosine similarity × 100).
  - If fewer than 2 registered mentors exist, returns them all without
    vector search (not enough data to be meaningful).
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.mentor import Mentor
from app.models.user import User

logger = logging.getLogger(__name__)

# ─── Lazy-loaded sentence-transformer model ───────────────────────────────────
_embedder = None

def _get_embedder():
    global _embedder
    if _embedder is None:
        from sentence_transformers import SentenceTransformer
        logger.info("Loading sentence-transformers/all-MiniLM-L6-v2 …")
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Model loaded.")
    return _embedder


# ─── Data classes ─────────────────────────────────────────────────────────────

@dataclass
class MentorCandidate:
    mentor_id: str
    name: str
    title: Optional[str]
    company: Optional[str]
    domain: Optional[str]
    bio: Optional[str]
    skills: Optional[str]
    capacity: int
    similarity: float          # cosine similarity [0, 1]


@dataclass
class MatchRecommendation:
    mentor_id: str
    mentor_name: str
    title: Optional[str]
    company: Optional[str]
    domain: Optional[str]
    bio: Optional[str]
    skills: Optional[str]
    capacity: int
    match_score: int           # 1-100
    match_reasons: list[str]
    suggested_icebreaker: str
    recommended_focus_areas: list[str]
    similarity: float


# ─── Step 1: Embed ────────────────────────────────────────────────────────────

def embed_text(text_input: str) -> list[float]:
    """Convert text to a 384-dim float list using all-MiniLM-L6-v2."""
    model = _get_embedder()
    vec = model.encode(text_input, normalize_embeddings=True)
    return vec.tolist()


def build_mentor_text(mentor: Mentor, user: Optional[User]) -> str:
    """Concatenate all mentor signals into a single embeddable string."""
    parts = []
    if mentor.name:   parts.append(mentor.name)
    if mentor.title:  parts.append(mentor.title)
    if mentor.company:parts.append(f"works at {mentor.company}")
    if mentor.domain: parts.append(f"domain: {mentor.domain}")
    if user:
        if user.bio:    parts.append(user.bio)
        if user.skills: parts.append(f"skills: {user.skills}")
        if user.branch: parts.append(f"studied {user.branch}")
    return ". ".join(filter(None, parts))


def build_student_query(
    target_role: str,
    semester: str,
    skills_and_interests: str,
    bio: str,
) -> str:
    """Build the student's search query string."""
    parts = [
        f"Target role: {target_role}",
        f"Year/semester: {semester}",
        f"Skills and interests: {skills_and_interests}",
    ]
    if bio:
        parts.append(bio)
    return ". ".join(filter(None, parts))


# ─── Step 2: Vector search ────────────────────────────────────────────────────

def vector_search(
    db: Session,
    query_vector: list[float],
    limit: int = 10,
) -> list[MentorCandidate]:
    """
    Retrieve top-N mentors by cosine similarity from pgvector HNSW index.
    Falls back to returning all registered mentors if none have embeddings yet.
    """
    from pgvector.sqlalchemy import Vector
    from sqlalchemy import cast

    # Build the query using SQLAlchemy ORM to avoid raw cast syntax issues
    rows = db.execute(text("""
        SELECT
            m.id,
            m.name,
            m.title,
            m.company,
            m.domain,
            m.capacity,
            u.bio,
            u.skills,
            1 - (m.embedding <=> :vec) AS similarity
        FROM mentors m
        LEFT JOIN users u ON u.id = m.user_id
        WHERE m.is_registered = TRUE
          AND m.embedding IS NOT NULL
        ORDER BY m.embedding <=> :vec
        LIMIT :lim
    """), {"vec": query_vector, "lim": limit}).fetchall()

    if not rows:
        # No embeddings yet — fall back to returning all registered mentors
        # with a default similarity score so the endpoint still works.
        rows_fb = db.execute(text("""
            SELECT m.id, m.name, m.title, m.company, m.domain, m.capacity,
                   u.bio, u.skills
            FROM mentors m
            LEFT JOIN users u ON u.id = m.user_id
            WHERE m.is_registered = TRUE
            LIMIT :lim
        """), {"lim": limit}).fetchall()
        return [
            MentorCandidate(
                mentor_id=r[0], name=r[1], title=r[2], company=r[3],
                domain=r[4], capacity=r[5], bio=r[6], skills=r[7],
                similarity=0.5,
            )
            for r in rows_fb
        ]

    return [
        MentorCandidate(
            mentor_id=r[0], name=r[1], title=r[2], company=r[3],
            domain=r[4], capacity=r[5], bio=r[6], skills=r[7],
            similarity=float(r[8]),
        )
        for r in rows
    ]


# ─── Step 3: LLM re-ranking ───────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert AI Career Mentor Matching Engine for AlumniLink.
Your task is to evaluate pre-filtered alumni mentor candidates for a given student
and return the best matches with transparent reasoning.

EVALUATION CRITERIA:
1. Career Path Alignment: How directly the mentor's past and current domain aligns with the student's target role.
2. Skill Overlap & Gap Coverage: Mentors possessing skills the student explicitly wants to learn or improve upon.
3. Industry & Trajectory Relevance: Shared background, education trajectory, or relevant industry progression.
4. Mentorship Impact: Actionable guidance potential and relevance to the student's immediate goals.

Return strictly valid JSON with no introductory or conversational text. No markdown fences."""

USER_TEMPLATE = """\
[STUDENT PROFILE]
- Target Role: {student_target_role}
- Current Semester / Year: {student_semester}
- Technical Skills & Interests: {student_skills_and_interests}
- Career Goals / Bio: {student_bio}

[CANDIDATE MENTORS (pre-filtered via sentence-transformers/all-MiniLM-L6-v2 cosine similarity)]
{candidates_json}

[OUTPUT FORMAT]
Return a JSON object exactly matching this schema:
{{
  "recommendations": [
    {{
      "mentor_id": "<mentor_id>",
      "match_score": <integer 1-100>,
      "match_reasons": ["<reason 1>", "<reason 2>"],
      "suggested_icebreaker": "<1-2 sentence message the student can send>",
      "recommended_focus_areas": ["<topic 1>", "<topic 2>"]
    }}
  ]
}}

Rank the best {top_k} mentors from the candidates. Include only mentor_ids from the list provided."""


def llm_rerank(
    candidates: list[MentorCandidate],
    target_role: str,
    semester: str,
    skills_and_interests: str,
    bio: str,
    top_k: int,
) -> list[dict] | None:
    """
    Call Groq LLM to re-rank candidates and generate structured recommendations.
    Returns None if GROQ_API_KEY is not configured.
    """
    if not settings.GROQ_API_KEY:
        return None

    from groq import Groq
    client = Groq(api_key=settings.GROQ_API_KEY)

    candidates_data = [
        {
            "mentor_id": c.mentor_id,
            "name": c.name,
            "title": c.title or "",
            "company": c.company or "",
            "domain": c.domain or "",
            "bio": (c.bio or "")[:400],     # trim to keep prompt concise
            "skills": c.skills or "",
            "vector_similarity_score": round(c.similarity * 100, 1),
        }
        for c in candidates
    ]

    user_msg = USER_TEMPLATE.format(
        student_target_role=target_role,
        student_semester=semester,
        student_skills_and_interests=skills_and_interests,
        student_bio=bio or "Not provided",
        candidates_json=json.dumps(candidates_data, indent=2),
        top_k=min(top_k, len(candidates)),
    )

    try:
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": user_msg},
            ],
            temperature=0.2,
            max_tokens=2048,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content or ""
        data = json.loads(raw)
        return data.get("recommendations", [])
    except Exception as exc:
        logger.warning("Groq re-ranking failed: %s — falling back to vector scores", exc)
        return None


# ─── Fallback scoring (no LLM) ────────────────────────────────────────────────

def _fallback_recommendations(
    candidates: list[MentorCandidate],
    top_k: int,
) -> list[dict]:
    """When Groq is unavailable, derive scores from cosine similarity."""
    top = sorted(candidates, key=lambda c: c.similarity, reverse=True)[:top_k]
    results = []
    for c in top:
        score = max(1, min(100, int(c.similarity * 100)))
        results.append({
            "mentor_id":    c.mentor_id,
            "match_score":  score,
            "match_reasons": [
                f"Domain '{c.domain}' aligns with your target role" if c.domain else "Registered mentor in the system",
                f"Works at {c.company}" if c.company else "Experienced professional",
            ],
            "suggested_icebreaker": (
                f"Hi {c.name}, I'm exploring a career path toward {c.domain or 'your domain'} "
                f"and would love to learn from your experience at {c.company or 'your organisation'}."
            ),
            "recommended_focus_areas": [
                c.domain or "Career guidance",
                "Resume & interview preparation",
            ],
        })
    return results


# ─── Public entry point ───────────────────────────────────────────────────────

def run_matching(
    db: Session,
    target_role: str,
    semester: str,
    skills_and_interests: str,
    bio: str,
) -> list[MatchRecommendation]:
    """
    Full pipeline: embed → vector search → LLM re-rank → MatchRecommendation list.
    """
    # 1. Embed the student query
    query_text   = build_student_query(target_role, semester, skills_and_interests, bio)
    query_vector = embed_text(query_text)

    # 2. Vector search for top candidates
    candidates = vector_search(db, query_vector, limit=settings.AI_MATCH_CANDIDATES)
    if not candidates:
        return []

    # Build a quick lookup by mentor_id for the response assembly step
    candidate_map = {c.mentor_id: c for c in candidates}

    # 3. LLM re-ranking (or fallback)
    llm_results = llm_rerank(
        candidates=candidates,
        target_role=target_role,
        semester=semester,
        skills_and_interests=skills_and_interests,
        bio=bio,
        top_k=settings.AI_MATCH_TOP_K,
    )

    if llm_results is None:
        llm_results = _fallback_recommendations(candidates, settings.AI_MATCH_TOP_K)

    # 4. Assemble final recommendations, merging LLM output with DB data
    recommendations: list[MatchRecommendation] = []
    for rec in llm_results[: settings.AI_MATCH_TOP_K]:
        mid = rec.get("mentor_id", "")
        c   = candidate_map.get(mid)
        if c is None:
            continue
        recommendations.append(
            MatchRecommendation(
                mentor_id=mid,
                mentor_name=c.name,
                title=c.title,
                company=c.company,
                domain=c.domain,
                bio=c.bio,
                skills=c.skills,
                capacity=c.capacity,
                match_score=int(rec.get("match_score", 50)),
                match_reasons=rec.get("match_reasons", []),
                suggested_icebreaker=rec.get("suggested_icebreaker", ""),
                recommended_focus_areas=rec.get("recommended_focus_areas", []),
                similarity=c.similarity,
            )
        )

    return recommendations
