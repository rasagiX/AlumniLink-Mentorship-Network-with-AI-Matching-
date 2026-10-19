"""
Migration v4 — add profile columns to users table.
Safe to re-run (IF NOT EXISTS).
"""
from app.db.session import SessionLocal
from sqlalchemy import text

COLUMNS = [
    ("bio",              "TEXT"),
    ("year",             "INTEGER"),
    ("branch",           "VARCHAR"),
    ("avatar_color",     "VARCHAR"),
    ("skills",           "VARCHAR"),
    ("linkedin_url",     "VARCHAR"),
    ("campus_location",  "VARCHAR"),
]

def run():
    db = SessionLocal()
    try:
        for col, typ in COLUMNS:
            db.execute(text(
                f"DO $$ BEGIN "
                f"IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
                f"WHERE table_name='users' AND column_name='{col}') "
                f"THEN ALTER TABLE users ADD COLUMN {col} {typ}; "
                f"END IF; END $$;"
            ))
        db.commit()
        print("Migration v4 complete — profile columns added to users.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run()
