import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text, func
from app.db.session import SessionLocal
from app.models.mentor import Mentor

db = SessionLocal()
total      = db.query(func.count(Mentor.id)).scalar()
registered = db.query(func.count(Mentor.id)).filter(Mentor.is_registered == True).scalar()
embedded   = db.execute(text("SELECT COUNT(*) FROM mentors WHERE embedding IS NOT NULL AND is_registered = TRUE")).scalar()
print(f"Total mentors:    {total}")
print(f"Registered:       {registered}")
print(f"Already embedded: {embedded}")
print(f"Need embedding:   {registered - (embedded or 0)}")
db.close()
