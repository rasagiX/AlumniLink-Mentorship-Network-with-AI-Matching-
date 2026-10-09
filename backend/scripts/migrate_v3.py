"""Migration v3 — add class_time to cycles, create session_bookings table."""
from app.db.base import Base
from app.db.session import SessionLocal, engine
from sqlalchemy import text

Base.metadata.create_all(bind=engine)  # creates session_bookings if missing

db = SessionLocal()
try:
    db.execute(text(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM information_schema.columns "
        "WHERE table_name='mentorship_cycles' AND column_name='class_time') "
        "THEN ALTER TABLE mentorship_cycles ADD COLUMN class_time VARCHAR; "
        "END IF; END $$;"
    ))
    db.commit()
    print("Migration v3 complete.")
finally:
    db.close()
