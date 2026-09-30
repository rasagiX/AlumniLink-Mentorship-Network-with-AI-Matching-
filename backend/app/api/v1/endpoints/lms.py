"""
LMS endpoints — full feature set.

Mentor:
  GET    /lms/cycles                               list my active cycles
  GET    /lms/cycles/{cycle_id}                    cycle detail + modules
  PATCH  /lms/cycles/{cycle_id}/roadmap            update programme roadmap
  POST   /lms/cycles/{cycle_id}/modules            add a week
  PUT    /lms/cycles/{cycle_id}/modules/{mod_id}   edit a week
  DELETE /lms/cycles/{cycle_id}/modules/{mod_id}   remove a week
  PATCH  /lms/cycles/{cycle_id}/modules/{mod_id}/recording  add/update recording URL
  PATCH  /lms/cycles/{cycle_id}/advance-week       move to next week

  GET    /lms/modules/{mod_id}/assignment          view student submission
  POST   /lms/modules/{mod_id}/grade               grade submission

Student:
  GET    /lms/my-cycles                            my active cycles
  GET    /lms/my-cycles/{cycle_id}                 cycle detail + modules + my submissions
  POST   /lms/modules/{mod_id}/submit              submit assignment
"""

import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.core.config import settings
from app.db.session import get_db
from app.models.mentor import Mentor
from app.models.mentorship_cycle import Assignment, LMSModule, MentorshipCycle
from app.models.user import User
from app.schemas.lms import (
    AdvanceWeekOut,
    AssignmentGrade,
    AssignmentOut,
    AssignmentSubmit,
    CycleRoadmapUpdate,
    LearningResource,
    LMSModuleCreate,
    LMSModuleOut,
    LMSModuleUpdate,
    MentorshipCycleOut,
    RecordingUpdate,
)

router = APIRouter(prefix="/lms", tags=["lms"])
MATERIALS_DIR = Path(settings.UPLOAD_DIR) / "materials"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _module_status(week: int, current: int) -> Literal["locked", "active", "completed"]:
    if week < current:
        return "completed"
    if week == current:
        return "active"
    return "locked"


def _resources_from_db(raw: Optional[str]) -> List[LearningResource]:
    """Deserialise JSON-encoded list of {label, url} stored in the Text column."""
    if not raw:
        return []
    try:
        items = json.loads(raw)
        return [LearningResource(**i) for i in items if "label" in i and "url" in i]
    except Exception:
        return []


def _resources_to_db(resources: Optional[List[LearningResource]]) -> Optional[str]:
    if resources is None:
        return None
    return json.dumps([r.model_dump() for r in resources])


def _build_module_out(
    module: LMSModule,
    current_week: int,
    assignment: Optional[Assignment] = None,
) -> LMSModuleOut:
    return LMSModuleOut(
        id=module.id,
        cycle_id=module.cycle_id,
        week_number=module.week_number,
        title=module.title,
        objectives=module.objectives,
        learning_resources=_resources_from_db(module.learning_resources),
        assignment_prompt=module.assignment_prompt,
        live_class_url=module.live_class_url,
        recording_url=module.recording_url,
        recording_title=module.recording_title,
        is_published=module.is_published,
        status=_module_status(module.week_number, current_week),
        assignment=AssignmentOut.model_validate(assignment) if assignment else None,
    )


def _build_cycle_out(
    cycle: MentorshipCycle,
    db: Session,
    student_id: Optional[str] = None,
) -> MentorshipCycleOut:
    modules = (
        db.query(LMSModule)
        .filter(LMSModule.cycle_id == cycle.id)
        .order_by(LMSModule.week_number)
        .all()
    )
    module_outs = []
    for m in modules:
        assignment = None
        if student_id:
            assignment = (
                db.query(Assignment)
                .filter(Assignment.module_id == m.id, Assignment.student_id == student_id)
                .first()
            )
        module_outs.append(_build_module_out(m, cycle.current_week, assignment))

    return MentorshipCycleOut(
        id=cycle.id,
        request_id=cycle.request_id,
        student_id=cycle.student_id,
        mentor_id=cycle.mentor_id,
        student_name=cycle.student_name,
        mentor_name=cycle.mentor_name,
        domain=cycle.domain,
        total_weeks=cycle.total_weeks,
        current_week=cycle.current_week,
        roadmap=cycle.roadmap,
        started_at=cycle.started_at,
        is_active=cycle.is_active,
        modules=module_outs,
    )


def _get_mentor_or_404(db: Session, mentor_user: User) -> Mentor:
    mentor = db.query(Mentor).filter(Mentor.user_id == mentor_user.id).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor profile not found.")
    return mentor


def _get_mentor_cycle_or_404(db: Session, cycle_id: str, mentor: Mentor) -> MentorshipCycle:
    cycle = (
        db.query(MentorshipCycle)
        .filter(MentorshipCycle.id == cycle_id, MentorshipCycle.mentor_id == mentor.id)
        .first()
    )
    if not cycle:
        raise HTTPException(status_code=404, detail="Cycle not found.")
    return cycle


def _get_module_or_404(db: Session, module_id: str, cycle_id: str) -> LMSModule:
    module = (
        db.query(LMSModule)
        .filter(LMSModule.id == module_id, LMSModule.cycle_id == cycle_id)
        .first()
    )
    if not module:
        raise HTTPException(status_code=404, detail="Module not found.")
    return module


# ---------------------------------------------------------------------------
# Mentor — cycle list & roadmap
# ---------------------------------------------------------------------------

@router.get("/cycles", response_model=List[MentorshipCycleOut])
def list_mentor_cycles(
    db: Session = Depends(get_db),
    mentor_user: User = Depends(require_role("mentor")),
):
    mentor = _get_mentor_or_404(db, mentor_user)
    cycles = (
        db.query(MentorshipCycle)
        .filter(MentorshipCycle.mentor_id == mentor.id, MentorshipCycle.is_active.is_(True))
        .order_by(MentorshipCycle.started_at.desc())
        .all()
    )
    return [_build_cycle_out(c, db) for c in cycles]


@router.get("/cycles/{cycle_id}", response_model=MentorshipCycleOut)
def get_mentor_cycle(
    cycle_id: str,
    db: Session = Depends(get_db),
    mentor_user: User = Depends(require_role("mentor")),
):
    mentor = _get_mentor_or_404(db, mentor_user)
    cycle = _get_mentor_cycle_or_404(db, cycle_id, mentor)
    return _build_cycle_out(cycle, db)


@router.patch("/cycles/{cycle_id}/roadmap", response_model=MentorshipCycleOut)
def update_roadmap(
    cycle_id: str,
    payload: CycleRoadmapUpdate,
    db: Session = Depends(get_db),
    mentor_user: User = Depends(require_role("mentor")),
):
    """Mentor writes / updates the free-form programme roadmap."""
    mentor = _get_mentor_or_404(db, mentor_user)
    cycle = _get_mentor_cycle_or_404(db, cycle_id, mentor)
    cycle.roadmap = payload.roadmap
    db.commit()
    db.refresh(cycle)
    return _build_cycle_out(cycle, db)


# ---------------------------------------------------------------------------
# Mentor — module CRUD
# ---------------------------------------------------------------------------

@router.post(
    "/cycles/{cycle_id}/modules",
    response_model=LMSModuleOut,
    status_code=status.HTTP_201_CREATED,
)
def add_module(
    cycle_id: str,
    payload: LMSModuleCreate,
    db: Session = Depends(get_db),
    mentor_user: User = Depends(require_role("mentor")),
):
    mentor = _get_mentor_or_404(db, mentor_user)
    cycle = _get_mentor_cycle_or_404(db, cycle_id, mentor)

    existing = (
        db.query(LMSModule)
        .filter(LMSModule.cycle_id == cycle_id, LMSModule.week_number == payload.week_number)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Week {payload.week_number} already exists in this cycle.",
        )

    module = LMSModule(
        cycle_id=cycle_id,
        week_number=payload.week_number,
        title=payload.title,
        objectives=payload.objectives,
        learning_resources=_resources_to_db(payload.learning_resources),
        assignment_prompt=payload.assignment_prompt,
        live_class_url=payload.live_class_url,
        recording_url=payload.recording_url,
        recording_title=payload.recording_title,
        is_published=payload.is_published,
    )
    db.add(module)

    if payload.week_number > cycle.total_weeks:
        cycle.total_weeks = payload.week_number

    db.commit()
    db.refresh(module)
    return _build_module_out(module, cycle.current_week)


@router.put("/cycles/{cycle_id}/modules/{module_id}", response_model=LMSModuleOut)
def update_module(
    cycle_id: str,
    module_id: str,
    payload: LMSModuleUpdate,
    db: Session = Depends(get_db),
    mentor_user: User = Depends(require_role("mentor")),
):
    mentor = _get_mentor_or_404(db, mentor_user)
    cycle = _get_mentor_cycle_or_404(db, cycle_id, mentor)
    module = _get_module_or_404(db, module_id, cycle_id)

    data = payload.model_dump(exclude_none=True)

    # Handle learning_resources separately (needs serialisation)
    if "learning_resources" in data:
        module.learning_resources = _resources_to_db(payload.learning_resources)
        del data["learning_resources"]

    for field, value in data.items():
        setattr(module, field, value)

    db.commit()
    db.refresh(module)
    return _build_module_out(module, cycle.current_week)


@router.delete("/cycles/{cycle_id}/modules/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_module(
    cycle_id: str,
    module_id: str,
    db: Session = Depends(get_db),
    mentor_user: User = Depends(require_role("mentor")),
):
    mentor = _get_mentor_or_404(db, mentor_user)
    cycle = _get_mentor_cycle_or_404(db, cycle_id, mentor)
    module = _get_module_or_404(db, module_id, cycle_id)

    db.query(Assignment).filter(Assignment.module_id == module_id).delete()
    db.delete(module)

    remaining = (
        db.query(LMSModule)
        .filter(LMSModule.cycle_id == cycle_id)
        .order_by(LMSModule.week_number.desc())
        .first()
    )
    cycle.total_weeks = remaining.week_number if remaining else 0
    db.commit()


@router.patch("/cycles/{cycle_id}/modules/{module_id}/recording", response_model=LMSModuleOut)
def update_recording(
    cycle_id: str,
    module_id: str,
    payload: RecordingUpdate,
    db: Session = Depends(get_db),
    mentor_user: User = Depends(require_role("mentor")),
):
    """Mentor adds or updates the session recording URL for a module."""
    mentor = _get_mentor_or_404(db, mentor_user)
    cycle = _get_mentor_cycle_or_404(db, cycle_id, mentor)
    module = _get_module_or_404(db, module_id, cycle_id)

    module.recording_url = payload.recording_url
    module.recording_title = payload.recording_title
    db.commit()
    db.refresh(module)
    return _build_module_out(module, cycle.current_week)


@router.patch("/cycles/{cycle_id}/advance-week", response_model=AdvanceWeekOut)
def advance_week(
    cycle_id: str,
    db: Session = Depends(get_db),
    mentor_user: User = Depends(require_role("mentor")),
):
    mentor = _get_mentor_or_404(db, mentor_user)
    cycle = _get_mentor_cycle_or_404(db, cycle_id, mentor)

    if cycle.current_week >= cycle.total_weeks:
        raise HTTPException(status_code=409, detail="Already on the final week.")

    cycle.current_week += 1
    db.commit()
    return AdvanceWeekOut(
        current_week=cycle.current_week,
        total_weeks=cycle.total_weeks,
        message=f"Advanced to week {cycle.current_week}.",
    )


# ---------------------------------------------------------------------------
# Mentor — grading
# ---------------------------------------------------------------------------

@router.post("/cycles/{cycle_id}/modules/{module_id}/materials")
async def upload_module_material(
    cycle_id: str,
    module_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    mentor_user: User = Depends(require_role("mentor")),
):
    """Store a mentor PDF and return a student-safe download URL."""
    mentor = _get_mentor_or_404(db, mentor_user)
    _get_mentor_cycle_or_404(db, cycle_id, mentor)
    _get_module_or_404(db, module_id, cycle_id)

    safe_name = Path(file.filename or "material.pdf").name
    if file.content_type != "application/pdf" and not safe_name.lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Only PDF files are accepted.")
    content = await file.read()
    if not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=415, detail="The selected file is not a valid PDF.")
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="PDF files must be 20 MB or smaller.")

    MATERIALS_DIR.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}_{re.sub(r'[^A-Za-z0-9._-]', '_', safe_name)}"
    (MATERIALS_DIR / stored_name).write_bytes(content)
    return {"label": safe_name, "url": f"/api/lms/materials/{stored_name}"}


@router.get("/materials/{stored_name}")
def download_module_material(
    stored_name: str,
    _user: User = Depends(get_current_user),
):
    """Serve a material to an authenticated portal user."""
    path = MATERIALS_DIR / Path(stored_name).name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Material not found.")
    return FileResponse(path, media_type="application/pdf", filename=path.name.split("_", 1)[-1])

@router.get("/modules/{module_id}/assignment", response_model=Optional[AssignmentOut])
def get_module_assignment(
    module_id: str,
    db: Session = Depends(get_db),
    mentor_user: User = Depends(require_role("mentor")),
):
    mentor = _get_mentor_or_404(db, mentor_user)
    module = db.query(LMSModule).filter(LMSModule.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found.")
    cycle = (
        db.query(MentorshipCycle)
        .filter(MentorshipCycle.id == module.cycle_id, MentorshipCycle.mentor_id == mentor.id)
        .first()
    )
    if not cycle:
        raise HTTPException(status_code=403, detail="Not your cycle.")
    assignment = db.query(Assignment).filter(Assignment.module_id == module_id).first()
    return AssignmentOut.model_validate(assignment) if assignment else None


@router.post("/modules/{module_id}/grade", response_model=AssignmentOut)
def grade_assignment(
    module_id: str,
    payload: AssignmentGrade,
    db: Session = Depends(get_db),
    mentor_user: User = Depends(require_role("mentor")),
):
    mentor = _get_mentor_or_404(db, mentor_user)
    module = db.query(LMSModule).filter(LMSModule.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found.")
    cycle = (
        db.query(MentorshipCycle)
        .filter(MentorshipCycle.id == module.cycle_id, MentorshipCycle.mentor_id == mentor.id)
        .first()
    )
    if not cycle:
        raise HTTPException(status_code=403, detail="Not your cycle.")
    assignment = db.query(Assignment).filter(Assignment.module_id == module_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="No submission found for this module.")

    assignment.grade = payload.grade
    assignment.feedback = payload.feedback
    assignment.graded_at = datetime.now(tz=timezone.utc)
    db.commit()
    db.refresh(assignment)
    return AssignmentOut.model_validate(assignment)


# ---------------------------------------------------------------------------
# Student — cycles, modules, submissions
# ---------------------------------------------------------------------------

@router.get("/my-cycles", response_model=List[MentorshipCycleOut])
def list_student_cycles(
    db: Session = Depends(get_db),
    student: User = Depends(require_role("student")),
):
    cycles = (
        db.query(MentorshipCycle)
        .filter(MentorshipCycle.student_id == student.id, MentorshipCycle.is_active.is_(True))
        .order_by(MentorshipCycle.started_at.desc())
        .all()
    )
    return [_build_cycle_out(c, db, student_id=student.id) for c in cycles]


@router.get("/my-cycles/{cycle_id}", response_model=MentorshipCycleOut)
def get_student_cycle(
    cycle_id: str,
    db: Session = Depends(get_db),
    student: User = Depends(require_role("student")),
):
    cycle = (
        db.query(MentorshipCycle)
        .filter(MentorshipCycle.id == cycle_id, MentorshipCycle.student_id == student.id)
        .first()
    )
    if not cycle:
        raise HTTPException(status_code=404, detail="Cycle not found.")
    return _build_cycle_out(cycle, db, student_id=student.id)


@router.post(
    "/modules/{module_id}/submit",
    response_model=AssignmentOut,
    status_code=status.HTTP_201_CREATED,
)
def submit_assignment(
    module_id: str,
    payload: AssignmentSubmit,
    db: Session = Depends(get_db),
    student: User = Depends(require_role("student")),
):
    module = db.query(LMSModule).filter(LMSModule.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found.")

    cycle = (
        db.query(MentorshipCycle)
        .filter(MentorshipCycle.id == module.cycle_id, MentorshipCycle.student_id == student.id)
        .first()
    )
    if not cycle:
        raise HTTPException(status_code=403, detail="You are not enrolled in this cycle.")
    if not module.is_published:
        raise HTTPException(status_code=403, detail="This module is not yet published by the mentor.")

    assignment = (
        db.query(Assignment)
        .filter(Assignment.module_id == module_id, Assignment.student_id == student.id)
        .first()
    )
    if assignment:
        assignment.submitted_file_name = payload.submitted_file_name
        assignment.grade = None
        assignment.feedback = None
        assignment.graded_at = None
    else:
        assignment = Assignment(
            module_id=module_id,
            student_id=student.id,
            submitted_file_name=payload.submitted_file_name,
        )
        db.add(assignment)

    db.commit()
    db.refresh(assignment)
    return AssignmentOut.model_validate(assignment)
