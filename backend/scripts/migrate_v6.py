"""Migration v6 — add storage_key to assignments table."""
from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    db.execute(text(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
        "WHERE table_name='assignments' AND column_name='storage_key') "
        "THEN ALTER TABLE assignments ADD COLUMN storage_key VARCHAR; "
        "END IF; END $$;"
    ))
    db.commit()
    print("Migration v6 complete.")
finally:
    db.close()
