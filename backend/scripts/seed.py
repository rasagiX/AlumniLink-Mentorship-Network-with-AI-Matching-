"""
Seeds the three demo personas (student / mentor / admin) so the frontend's
"explore instantly" buttons — and plain sign-in — have real accounts to
authenticate against. Safe to re-run; existing rows are updated in place.

Also seeds the mentor roster: the registered demo mentor is added as an
approved+registered roster entry, plus one extra roster entry that's
approved but hasn't registered yet, to demonstrate that flow.

Run from the project root with the venv active:
    python -m scripts.seed
"""
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.mentor import Mentor
from app.models.user import User

Base.metadata.create_all(bind=engine)

DEMO_PASSWORD = "demo1234"

DEMO_USERS = [
    {"id": "stu-014", "name": "Priya Raman", "email": "priya.raman@demo.alumnilink.edu", "role": "student"},
    {"id": "men-003", "name": "Devika Sharma", "email": "devika.sharma@demo.alumnilink.edu", "role": "mentor"},
    {"id": "men-004", "name": "Arjun Mehta", "email": "arjun.mehta@demo.alumnilink.edu", "role": "mentor"},
    {"id": "men-005", "name": "Sofia Alvarez", "email": "sofia.alvarez@demo.alumnilink.edu", "role": "mentor"},
    {"id": "men-006", "name": "Nadia Okafor", "email": "nadia.okafor@demo.alumnilink.edu", "role": "mentor"},
    {"id": "men-007", "name": "Rahul Iyer", "email": "rahul.iyer@demo.alumnilink.edu", "role": "mentor"},
    {"id": "men-008", "name": "Elena Petrova", "email": "elena.petrova@demo.alumnilink.edu", "role": "mentor"},
    {"id": "men-009", "name": "Marcus Green", "email": "marcus.green@demo.alumnilink.edu", "role": "mentor"},
    {"id": "adm-001", "name": "Registrar Office", "email": "registrar@demo.alumnilink.edu", "role": "admin"},
]

# Approved by admin, already registered — corresponds to the men-003 user above.
REGISTERED_ROSTER_MENTOR = {
    "name": "Devika Sharma",
    "email": "devika.sharma@demo.alumnilink.edu",
    "title": "Senior PM",
    "company": "Meridian Health",
    "domain": "Product Management",
    "capacity": 2,
}

# Approved by admin, but hasn't registered yet — demonstrates the
# "please register" message on login, as opposed to "contact admin" for a
# completely unknown email.
PENDING_ROSTER_MENTOR = {
    "name": "James Wu",
    "email": "james.wu@demo.alumnilink.edu",
    "title": "Staff Engineer",
    "company": "Northwind Labs",
    "domain": "Software Engineering",
    "capacity": 2,
}

# ---------------------------------------------------------------------------
# Add your real mentors here.
# Each mentor in this list will be added to the approved roster.
# They can then register at /login using this email + a password they choose.
# Set capacity to 1 or 2 (max number of students they can mentor at once).
# ---------------------------------------------------------------------------
REAL_MENTORS = [
    {"user_id": "men-004", "name": "Arjun Mehta", "email": "arjun.mehta@demo.alumnilink.edu", "title": "Senior Software Engineer", "company": "Google", "domain": "Software Engineering", "capacity": 2},
    {"user_id": "men-005", "name": "Sofia Alvarez", "email": "sofia.alvarez@demo.alumnilink.edu", "title": "Product Manager", "company": "Meta", "domain": "Product Management", "capacity": 2},
    {"user_id": "men-006", "name": "Nadia Okafor", "email": "nadia.okafor@demo.alumnilink.edu", "title": "Data Science Lead", "company": "Vantage Analytics", "domain": "Data Science", "capacity": 2},
    {"user_id": "men-007", "name": "Rahul Iyer", "email": "rahul.iyer@demo.alumnilink.edu", "title": "UX Design Manager", "company": "Harbor Studio", "domain": "UX Design", "capacity": 2},
    {"user_id": "men-008", "name": "Elena Petrova", "email": "elena.petrova@demo.alumnilink.edu", "title": "Cybersecurity Architect", "company": "Sentinel Systems", "domain": "Cybersecurity", "capacity": 2},
    {"user_id": "men-009", "name": "Marcus Green", "email": "marcus.green@demo.alumnilink.edu", "title": "Financial Analyst", "company": "Kestrel Capital", "domain": "Finance", "capacity": 2},
]


def seed() -> None:
    db = SessionLocal()
    try:
        password_hash = hash_password(DEMO_PASSWORD)
        users_by_id = {}
        for u in DEMO_USERS:
            existing = db.query(User).filter(User.id == u["id"]).first()
            if existing:
                existing.name = u["name"]
                existing.email = u["email"]
                existing.password_hash = password_hash
                existing.role = u["role"]
                users_by_id[u["id"]] = existing
            else:
                new_user = User(
                    id=u["id"], name=u["name"], email=u["email"],
                    password_hash=password_hash, role=u["role"],
                )
                db.add(new_user)
                users_by_id[u["id"]] = new_user
        db.flush()

        mentor_user = users_by_id["men-003"]

        def upsert_roster(entry: dict, *, registered_to=None) -> None:
            row = db.query(Mentor).filter(Mentor.email == entry["email"]).first()
            if row is None:
                row = Mentor(**entry)
                db.add(row)
            else:
                for key, value in entry.items():
                    setattr(row, key, value)
            if registered_to is not None:
                row.is_registered = True
                row.user_id = registered_to.id

        upsert_roster(REGISTERED_ROSTER_MENTOR, registered_to=mentor_user)
        upsert_roster(PENDING_ROSTER_MENTOR)

        # Seed additional demo mentors as registered profiles so students can
        # discover them immediately in the directory.
        for mentor_data in REAL_MENTORS:
            upsert_roster(mentor_data, registered_to=users_by_id[mentor_data["user_id"]])
            print(f"  - registered      {mentor_data['email']}")

        db.commit()
        print(f'Seeded {len(DEMO_USERS)} demo accounts (password for all: "{DEMO_PASSWORD}"):')
        for u in DEMO_USERS:
            print(f"  - {u['role']:<7} {u['email']}")
        print("Seeded mentor roster:")
        print(f"  - registered      {REGISTERED_ROSTER_MENTOR['email']}")
        print(f"  - pending sign-up {PENDING_ROSTER_MENTOR['email']}  (try logging in — no account exists yet)")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
