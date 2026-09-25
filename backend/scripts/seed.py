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
