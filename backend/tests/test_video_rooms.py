"""Unit tests for the framework-free room registry (no DB or web stack needed)."""

import asyncio

import pytest

from app.core.video_rooms import Participant, RoomFullError, RoomManager


class FakeSocket:
    def __init__(self):
        self.sent = []
        self.closed_with = None

    async def send_json(self, obj):
        self.sent.append(obj)

    async def close(self, code=1000, reason=""):
        self.closed_with = (code, reason)


def _p(user_id, role="student"):
    return Participant(user_id=user_id, name=user_id.title(), class_role=role, socket=FakeSocket())


def test_first_joiner_sees_empty_room_second_sees_first():
    rooms = RoomManager()
    a, b = _p("a"), _p("b", "mentor")
    replaced, others = rooms.join("room", a)
    assert replaced is None and others == []
    replaced, others = rooms.join("room", b)
    assert replaced is None and others == [a]
    assert rooms.size("room") == 2


def test_third_user_is_rejected_and_room_unchanged():
    rooms = RoomManager()
    a, b, c = _p("a"), _p("b"), _p("c")
    rooms.join("room", a)
    rooms.join("room", b)
    with pytest.raises(RoomFullError):
        rooms.join("room", c)
    assert rooms.size("room") == 2


def test_same_user_second_connection_replaces_first():
    rooms = RoomManager()
    old, new, other = _p("a"), _p("a"), _p("b")
    rooms.join("room", old)
    rooms.join("room", other)
    replaced, others = rooms.join("room", new)
    assert replaced is old
    assert others == [other]
    assert rooms.size("room") == 2  # still just two people


def test_replaced_connection_leaving_does_not_evict_the_new_one():
    rooms = RoomManager()
    old, new = _p("a"), _p("a")
    rooms.join("room", old)
    rooms.join("room", new)
    assert rooms.leave("room", old) is False   # stale socket's cleanup
    assert rooms.peers_of("room", "zzz") == [new]
    assert rooms.leave("room", new) is True


def test_empty_rooms_are_garbage_collected():
    rooms = RoomManager()
    a = _p("a")
    rooms.join("room", a)
    rooms.leave("room", a)
    assert rooms.size("room") == 0
    assert "room" not in rooms._rooms


def test_rooms_are_isolated_from_each_other():
    rooms = RoomManager()
    a, b = _p("a"), _p("b")
    rooms.join("room-1", a)
    rooms.join("room-2", b)
    assert rooms.peers_of("room-1", "a") == []


def test_send_to_peers_skips_sender_and_survives_a_dead_socket():
    async def run():
        rooms = RoomManager()
        a, b = _p("a"), _p("b")
        rooms.join("room", a)
        rooms.join("room", b)

        await rooms.send_to_peers("room", "a", {"type": "offer"})
        assert b.socket.sent == [{"type": "offer"}] and a.socket.sent == []

        async def boom(_):
            raise RuntimeError("socket closed")

        b.socket.send_json = boom
        await rooms.send_to_peers("room", "a", {"type": "offer"})  # must not raise

    asyncio.run(run())
