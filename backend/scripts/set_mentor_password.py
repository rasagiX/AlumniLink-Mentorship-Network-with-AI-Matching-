"""
Set (or reset) a password for an existing approved mentor.

This handles two cases:
  1. Mentor is in the `mentors` roster but has never registered (no user account yet)
     → Creates the user account and links it to the roster entry.
  2. Mentor already has a user account
     → Updates the password hash in place.

Usage (run from the backend/ folder with venv active):
    python -m scripts.set_mentor_password

Edit MENTOR_EMAIL and NEW_PASSWORD below before running.
"""

import sys
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.mentor import Mentor
from app.models.user import User

Base.metadata.create_all(bind=engine)

# ✏️  EDIT THESE TWO VALUES
MENTOR_EMAIL = "arjun.mehta@alumnilink.edu"   # must match exactly what's in the mentors table
NEW_PASSWORD = "Welcome@123"                   # the password the mentor will use to log in


def set_password(email: str, password: str) -> None:
    db = SessionLocal()
    try:
        email = email.lower().strip()

        # Check the mentor roster
        roster = db.query(Mentor).filter(Mentor.email == email).first()
        if not roster:
            print(f"ERROR: '{email}' is not on the approved mentor roster.")
            print("Add them first with: python -m scripts.add_mentor")
            sys.exit(1)

        pw_hash = hash_password(password)

        # Case 1: mentor already has a user account — just update the password
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            existing_user.password_hash = pw_hash
            roster.is_registered = True
            roster.user_id = existing_user.id
            db.commit()
            print(f"✓ Password updated for existing account: {email}")
        else:
            # Case 2: no user account yet — create one and link it
            user = User(
                name=roster.name,
                email=email,
                password_hash=pw_hash,
                role="mentor",
            )
            db.add(user)
            db.flush()  # get user.id

            roster.is_registered = True
            roster.user_id = user.id
            db.commit()
            print(f"✓ Account created and linked for: {email}")

        print(f"\n  Email    : {email}")
        print(f"  Password : {password}")
        print(f"  Role     : mentor")
        print(f"\nThe mentor can now log in at /login with these credentials.")
        print("They will appear in the student directory immediately.")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    set_password(MENTOR_EMAIL, NEW_PASSWORD)
