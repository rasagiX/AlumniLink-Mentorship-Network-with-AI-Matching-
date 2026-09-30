"""
Add one or more mentors to the approved roster directly via the database.

After running this script, the mentor can go to /login → Register,
enter their email (must match exactly), choose 'Alumni Mentor', and
set their password. They will then appear in the student directory.

Usage (run from the backend/ folder with venv active):
    python -m scripts.add_mentor

You can also import and call add_mentors() from other scripts.
"""

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.mentor import Mentor
from app.models.user import User

Base.metadata.create_all(bind=engine)

# ---------------------------------------------------------------------------
# ✏️  EDIT THIS LIST — add as many mentors as you need.
#
# Fields:
#   name      — full name (required)
#   email     — institutional email the mentor will use to register (required)
#   title     — job title shown in the student directory
#   company   — employer shown in the student directory
#   domain    — expertise area (shown as a tag in the directory)
#   capacity  — max simultaneous mentees: 1 or 2 (default 2)
#
# After adding here, run:  python -m scripts.add_mentor
# The mentor then registers at /login with the same email to set a password.
# ---------------------------------------------------------------------------
MENTORS_TO_ADD = [
    {
        "name": "Arjun Mehta",
        "email": "arjun.mehta@alumnilink.edu",
        "title": "Senior Software Engineer",
        "company": "Google",
        "domain": "Software Engineering",
        "capacity": 2,
    },
    {
        "name": "Sunil Anand",
        "email": "sunilanand@example.com",
        "title": "Product Manager",
        "company": "Meta",
        "domain": "Product Management",
        "capacity": 1,
    },
    # Add more mentors below:
    # {
    #     "name": "Wei Lin",
    #     "email": "wei.lin@alumnilink.edu",
    #     "title": "Lead Data Scientist",
    #     "company": "Stratos Bank",
    #     "domain": "Data Science",
    #     "capacity": 2,
    # },
]


def add_mentors(mentors: list[dict]) -> None:
    db = SessionLocal()
    try:
        added = 0
        skipped = 0
        for m in mentors:
            email = m["email"].lower()
            existing = db.query(Mentor).filter(Mentor.email == email).first()
            if existing:
                print(f"  SKIP  {email}  (already on roster)")
                skipped += 1
                continue

            mentor = Mentor(
                name=m["name"],
                email=email,
                title=m.get("title"),
                company=m.get("company"),
                domain=m.get("domain"),
                capacity=m.get("capacity", 2),
                is_registered=False,  # they register themselves via /login
            )
            db.add(mentor)
            print(f"  ADDED {email}  → {m['name']} ({m.get('title', '')}, {m.get('company', '')})")
            added += 1

        db.commit()
        print(f"\nDone: {added} added, {skipped} skipped.")
        print("Each mentor can now go to /login → Register with their email to set a password.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("Adding mentors to roster…\n")
    add_mentors(MENTORS_TO_ADD)
