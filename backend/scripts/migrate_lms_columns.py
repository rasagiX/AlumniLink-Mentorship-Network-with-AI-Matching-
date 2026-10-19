"""
One-time migration: add new columns introduced in the LMS rebuild.

Columns added:
  mentorship_cycles  : roadmap TEXT
  lms_modules        : learning_resources TEXT, recording_url VARCHAR, recording_title VARCHAR

Safe to re-run — uses IF NOT EXISTS via DO $$ blocks.
"""
from app.db.session import SessionLocal
from sqlalchemy import text

MIGRATIONS = [
    # roadmap on cycles
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'mentorship_cycles' AND column_name = 'roadmap'
        ) THEN
            ALTER TABLE mentorship_cycles ADD COLUMN roadmap TEXT;
            RAISE NOTICE 'Added mentorship_cycles.roadmap';
        ELSE
            RAISE NOTICE 'mentorship_cycles.roadmap already exists — skipped';
        END IF;
    END $$;
    """,
    # learning_resources on lms_modules
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'lms_modules' AND column_name = 'learning_resources'
        ) THEN
            ALTER TABLE lms_modules ADD COLUMN learning_resources TEXT;
            RAISE NOTICE 'Added lms_modules.learning_resources';
        ELSE
            RAISE NOTICE 'lms_modules.learning_resources already exists — skipped';
        END IF;
    END $$;
    """,
    # recording_url on lms_modules
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'lms_modules' AND column_name = 'recording_url'
        ) THEN
            ALTER TABLE lms_modules ADD COLUMN recording_url VARCHAR;
            RAISE NOTICE 'Added lms_modules.recording_url';
        ELSE
            RAISE NOTICE 'lms_modules.recording_url already exists — skipped';
        END IF;
    END $$;
    """,
    # recording_title on lms_modules
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'lms_modules' AND column_name = 'recording_title'
        ) THEN
            ALTER TABLE lms_modules ADD COLUMN recording_title VARCHAR;
            RAISE NOTICE 'Added lms_modules.recording_title';
        ELSE
            RAISE NOTICE 'lms_modules.recording_title already exists — skipped';
        END IF;
    END $$;
    """,
]

def run():
    db = SessionLocal()
    try:
        for sql in MIGRATIONS:
            db.execute(text(sql))
        db.commit()
        print("\nAll migrations applied successfully.")
        print("Restart uvicorn — the backend will now start without column errors.")
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run()
