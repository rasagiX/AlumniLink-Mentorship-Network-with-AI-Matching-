"""Ticket + signaling tests. Uses the same Postgres-backed `client` fixture as
the rest of the suite; rows are inserted directly so the tests don't depend on
the request/accept flow that normally creates a MentorshipCycle."""

import pytest
from starlette.websockets import WebSocketDisconnect

from app.core.security import create_access_token, create_video_ticket, hash_password
from app.db.session import get_db
from app.main import app
from app.models.mentor import Mentor
from app.models.mentorship_cycle import MentorshipCycle
from app.models.mentorship_request import MentorshipRequest
from app.models.user import User

TICKET = "/api/v1/video/ticket"


def _session():
    # The `client` fixture overrides get_db; reuse its session factory.
    gen = app.dependency_overrides[get_db]()
    return next(gen)


def _bearer(user):
    token = create_access_token(
        {"sub": user.id, "role": user.role, "name": user.name, "email": user.email}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def world(client):
    """A student, their mentor, an unrelated student, and one active cycle."""
    db = _session()
    pw = hash_password("supersecure1")
    student = User(name="Stu Dent", email="stu@example.com", password_hash=pw, role="student")
    other = User(name="Out Sider", email="out@example.com", password_hash=pw, role="student")
    mentor_user = User(name="Mia Mentor", email="mia@example.com", password_hash=pw, role="mentor")
    db.add_all([student, other, mentor_user])
    db.commit()

    mentor = Mentor(
        name=mentor_user.name, email=mentor_user.email, is_registered=True, user_id=mentor_user.id
    )
    db.add(mentor)
    db.commit()

    req = MentorshipRequest(
        student_id=student.id, mentor_id=mentor.id, goal="Learn", weekly_hours="2", status="accepted"
    )
    db.add(req)
    db.commit()

    cycle = MentorshipCycle(
        request_id=req.id,
        student_id=student.id,
        mentor_id=mentor.id,
        student_name=student.name,
        mentor_name=mentor.name,
    )
    db.add(cycle)
    db.commit()

    data = {
        "student": student, "mentor_user": mentor_user, "other": other, "cycle_id": cycle.id,
        "student_h": _bearer(student), "mentor_h": _bearer(mentor_user), "other_h": _bearer(other),
    }
    db.close()
    return data


def test_student_and_mentor_get_tickets_with_correct_peer(client, world):
    res = client.post(TICKET, json={"cycle_id": world["cycle_id"]}, headers=world["student_h"])
    assert res.status_code == 200
    body = res.json()
    assert body["me"]["role"] == "student"
    assert body["peer_name"] == "Mia Mentor" and body["peer_role"] == "mentor"
    assert body["ws_path"].endswith(f"/video/ws/{world['cycle_id']}")
    assert body["ice_servers"]  # at least STUN

    res = client.post(TICKET, json={"cycle_id": world["cycle_id"]}, headers=world["mentor_h"])
    assert res.status_code == 200
    assert res.json()["me"]["role"] == "mentor"
    assert res.json()["peer_name"] == "Stu Dent"


def test_outsiders_and_unknown_cycles_are_refused(client, world):
    res = client.post(TICKET, json={"cycle_id": world["cycle_id"]}, headers=world["other_h"])
    assert res.status_code == 403
    res = client.post(TICKET, json={"cycle_id": "nope"}, headers=world["student_h"])
    assert res.status_code == 404
    assert client.post(TICKET, json={"cycle_id": world["cycle_id"]}).status_code == 401


def test_ticket_cannot_be_used_as_an_access_token(client, world):
    ticket = create_video_ticket(
        user_id=world["student"].id, name="x", class_role="student", cycle_id=world["cycle_id"]
    )
    res = client.get("/api/v1/peer-sessions/mine", headers={"Authorization": f"Bearer {ticket}"})
    assert res.status_code == 401


def _ws(client, cycle_id, ticket):
    return client.websocket_connect(f"/api/v1/video/ws/{cycle_id}?ticket={ticket}")


def _ticket(user_id, name, role, cycle_id):
    return create_video_ticket(user_id=user_id, name=name, class_role=role, cycle_id=cycle_id)


def test_bad_ticket_is_closed_with_4001(client, world):
    with _ws(client, world["cycle_id"], "garbage") as ws:
        with pytest.raises(WebSocketDisconnect) as exc:
            ws.receive_json()
        assert exc.value.code == 4001


def test_ticket_for_a_different_cycle_is_rejected(client, world):
    t = _ticket("u1", "U", "student", "some-other-cycle")
    with _ws(client, world["cycle_id"], t) as ws:
        with pytest.raises(WebSocketDisconnect) as exc:
            ws.receive_json()
        assert exc.value.code == 4001


def test_two_peers_handshake_and_third_is_refused(client, world):
    cid = world["cycle_id"]
    t_student = _ticket("student-1", "Stu", "student", cid)
    t_mentor = _ticket("mentor-1", "Mia", "mentor", cid)
    t_third = _ticket("third-1", "Eve", "student", cid)

    with _ws(client, cid, t_student) as stu:
        joined = stu.receive_json()
        assert joined["type"] == "joined" and joined["peers"] == []

        with _ws(client, cid, t_mentor) as men:
            joined = men.receive_json()
            assert [p["id"] for p in joined["peers"]] == ["student-1"]
            # the person already in the room is told to start the handshake
            assert stu.receive_json()["type"] == "peer-joined"

            stu.send_json({"type": "offer", "data": {"type": "offer", "sdp": "v=0"}})
            relayed = men.receive_json()
            assert relayed == {"type": "offer", "from": "student-1", "data": {"type": "offer", "sdp": "v=0"}}

            men.send_json({"type": "answer", "data": {"type": "answer", "sdp": "v=0"}})
            assert stu.receive_json()["type"] == "answer"

            # non-dict payloads and unknown types are dropped, not relayed
            stu.send_json({"type": "offer", "data": "nope"})
            stu.send_json({"type": "ping"})
            assert stu.receive_json() == {"type": "pong"}

            with _ws(client, cid, t_third) as eve:
                with pytest.raises(WebSocketDisconnect) as exc:
                    eve.receive_json()
                assert exc.value.code == 4003

        # mentor left -> student is told
        assert stu.receive_json()["type"] == "peer-left"
