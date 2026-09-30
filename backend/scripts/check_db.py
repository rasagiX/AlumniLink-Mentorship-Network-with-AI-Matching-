"""Diagnostic: print current table columns and existing cycles."""
from app.db.session import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    # Columns on mentorship_cycles
    r = db.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = 'mentorship_cycles' ORDER BY ordinal_position"
    ))
    print("mentorship_cycles columns:")
    for row in r:
        print(" ", row[0])

    print()
    # Columns on lms_modules
    r2 = db.execute(text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name = 'lms_modules' ORDER BY ordinal_position"
    ))
    print("lms_modules columns:")
    for row in r2:
        print(" ", row[0])

    print()
    # Existing cycles
    r3 = db.execute(text(
        "SELECT id, student_name, mentor_name, is_active FROM mentorship_cycles"
    ))
    rows = r3.fetchall()
    print(f"Existing cycles ({len(rows)} total):")
    for row in rows:
        print(f"  id={row[0][:8]}... student={row[1]} mentor={row[2]} active={row[3]}")

    print()
    # Existing requests
    r4 = db.execute(text(
        "SELECT id, student_id, mentor_id, status FROM mentorship_requests ORDER BY created_at DESC LIMIT 10"
    ))
    print("Recent mentorship_requests:")
    for row in r4:
        print(f"  id={row[0][:8]}... student={row[1][:8]}... mentor={row[2][:8]}... status={row[3]}")

finally:
    db.close()
