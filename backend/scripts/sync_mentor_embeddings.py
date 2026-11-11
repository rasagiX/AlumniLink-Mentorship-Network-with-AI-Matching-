"""
Mentor Embedding Sync Script
=============================

Generates/refreshes sentence-transformer embeddings for every registered
mentor and upserts them into the mentors.embedding (vector(384)) column.

Run after:
  - Adding new mentors to the roster
  - Mentors updating their profile (bio, skills)
  - Initial setup after enabling pgvector

Usage:
  cd backend
  venv\\Scripts\\python scripts\\sync_mentor_embeddings.py

  # Re-embed only mentors whose embedding is NULL (new ones):
  venv\\Scripts\\python scripts\\sync_mentor_embeddings.py --only-missing

  # Re-embed a specific mentor by ID:
  venv\\Scripts\\python scripts\\sync_mentor_embeddings.py --mentor-id <uuid>
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text

from app.core.ai_matching import build_mentor_text, embed_text
from app.db.session import SessionLocal
from app.models.mentor import Mentor
from app.models.user import User


def sync(only_missing: bool = False, mentor_id: str | None = None) -> None:
    db = SessionLocal()
    try:
        query = db.query(Mentor).filter(Mentor.is_registered.is_(True))

        if mentor_id:
            query = query.filter(Mentor.id == mentor_id)
        elif only_missing:
            query = query.filter(Mentor.embedding.is_(None))

        mentors = query.all()

        if not mentors:
            print("No mentors to embed.")
            return

        print(f"Embedding {len(mentors)} mentor(s)…")

        for i, mentor in enumerate(mentors, 1):
            user = db.query(User).filter(User.id == mentor.user_id).first() if mentor.user_id else None
            corpus = build_mentor_text(mentor, user)
            vec    = embed_text(corpus)

            # Use pgvector's Vector type to avoid SQLAlchemy / psycopg2 cast issues
            from pgvector.sqlalchemy import Vector
            from sqlalchemy import update as sa_update
            from app.models.mentor import Mentor as MentorModel
            db.execute(
                sa_update(MentorModel)
                .where(MentorModel.id == mentor.id)
                .values(embedding=vec)
            )
            db.commit()
            print(f"  [{i}/{len(mentors)}] {mentor.name} ({mentor.id[:8]}…) ✓")

        print(f"\nDone. {len(mentors)} mentor embedding(s) updated.")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sync mentor embeddings into pgvector.")
    parser.add_argument("--only-missing", action="store_true",
                        help="Only embed mentors whose embedding column is NULL")
    parser.add_argument("--mentor-id", type=str, default=None,
                        help="Re-embed a single mentor by ID")
    args = parser.parse_args()
    sync(only_missing=args.only_missing, mentor_id=args.mentor_id)
