"""
Migration v2 — add new columns and create support_tickets table.
Safe to re-run (uses IF NOT EXISTS).
"""
from app.db.base import Base
from app.db.session import SessionLocal, engine
from sqlalchemy import text

Base.metadata.create_all(bind=engine)   # creates support_tickets if missing

MIGRATIONS = [
    # mentorship_requests: desired_weeks, available_asap
    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentorship_requests' AND column_name='desired_weeks') THEN ALTER TABLE mentorship_requests ADD COLUMN desired_weeks INTEGER; END IF; END $$;",
    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentorship_requests' AND column_name='available_asap') THEN ALTER TABLE mentorship_requests ADD COLUMN available_asap BOOLEAN NOT NULL DEFAULT TRUE; END IF; END $$;",
    # mentorship_cycles: available_days, class_start_date
    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentorship_cycles' AND column_name='available_days') THEN ALTER TABLE mentorship_cycles ADD COLUMN available_days VARCHAR; END IF; END $$;",
    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mentorship_cycles' AND column_name='class_start_date') THEN ALTER TABLE mentorship_cycles ADD COLUMN class_start_date DATE; END IF; END $$;",
]

def run():
    db = SessionLocal()
    try:
        for sql in MIGRATIONS:
            db.execute(text(sql))
        db.commit()
        print("Migration v2 complete.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run()
