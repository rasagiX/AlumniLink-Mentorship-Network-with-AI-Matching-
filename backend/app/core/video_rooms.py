"""
In-memory registry of live video-class rooms.

One room == one MentorshipCycle (a mentor and a student), so a room holds at
most two participants and the media path is plain peer-to-peer WebRTC. This
server only relays small JSON signaling messages; it never sees audio/video.

NOTE: state lives in this process's memory. That is correct for a single
uvicorn worker. With several workers/instances, peers could land on different
processes — move the registry to Redis pub/sub (or pin a room to one worker)
before scaling out.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Optional

logger = logging.getLogger(__name__)

MAX_PEERS_PER_ROOM = 2


class RoomFullError(Exception):
    """Raised when a third distinct user tries to join a two-person room."""


@dataclass(eq=False)   # identity comparison: two connections are never "equal"
class Participant:
    user_id: str
    name: str
    class_role: str   # "student" | "mentor"
    socket: Any

    def public(self) -> dict:
        return {"id": self.user_id, "name": self.name, "role": self.class_role}


class RoomManager:
    def __init__(self) -> None:
        self._rooms: dict[str, dict[str, Participant]] = {}

    # -- membership (synchronous on purpose: no awaits between check and
    #    mutation, so a single event loop can't interleave and over-fill a room)

    def join(
        self, room_id: str, participant: Participant
    ) -> tuple[Optional[Participant], list[Participant]]:
        """Adds the participant to the room.

        Returns ``(replaced, others)``:
          * ``replaced`` — an older connection by the *same user* (second tab /
            page reload) that this one supersedes. The caller should close it.
          * ``others`` — participants already in the room (the peer, if any).
        """
        room = self._rooms.setdefault(room_id, {})
        replaced = room.pop(participant.user_id, None)
        if len(room) >= MAX_PEERS_PER_ROOM:
            if replaced is not None:
                room[participant.user_id] = replaced
            raise RoomFullError(room_id)
        others = list(room.values())
        room[participant.user_id] = participant
        return replaced, others

    def leave(self, room_id: str, participant: Participant) -> bool:
        """Removes this exact connection. Returns False if it was already gone
        or had been replaced by a newer connection from the same user — in which
        case the caller must NOT announce that the user left."""
        room = self._rooms.get(room_id)
        if not room or room.get(participant.user_id) is not participant:
            return False
        del room[participant.user_id]
        if not room:
            del self._rooms[room_id]
        return True

    def peers_of(self, room_id: str, user_id: str) -> list[Participant]:
        room = self._rooms.get(room_id, {})
        return [p for uid, p in room.items() if uid != user_id]

    def size(self, room_id: str) -> int:
        return len(self._rooms.get(room_id, {}))

    # -- delivery

    async def send_to_peers(self, room_id: str, sender_id: str, message: dict) -> None:
        for peer in self.peers_of(room_id, sender_id):
            try:
                await peer.socket.send_json(message)
            except Exception:
                logger.debug("Could not deliver %s to %s", message.get("type"), peer.user_id)

    @staticmethod
    async def close_quietly(participant: Participant, code: int, reason: str) -> None:
        try:
            await participant.socket.close(code=code, reason=reason)
        except Exception:
            pass
