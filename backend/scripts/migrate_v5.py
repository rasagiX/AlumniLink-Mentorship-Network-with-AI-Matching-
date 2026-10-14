"""
Migration v5 — add is_completed to lms_modules, create module_files table.
Safe to re-run.
"""
from app.db.base import Base
from app.db.session import SessionLocal, engine
from sqlalchemy import text

Base.metadata.create_all(bind=engine)  # creates module_files table

db = SessionLocal()
try:
    db.execute(text(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
        "WHERE table_name='lms_modules' AND column_name='is_completed') "
        "THEN ALTER TABLE lms_modules ADD COLUMN is_completed BOOLEAN NOT NULL DEFAULT FALSE; "
        "END IF; END $$;"
    ))
    db.commit()
    print("Migration v5 complete.")
finally:
    db.close()
