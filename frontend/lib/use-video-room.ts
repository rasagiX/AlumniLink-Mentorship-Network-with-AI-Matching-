"use client";
import * as React from "react";

/**
 * One-to-one WebRTC call for a mentorship cycle.
 *
 * How it fits together
 *   1. Ask for camera + mic.
 *   2. POST /api/video/ticket  → short-lived ticket, WebSocket URL, ICE servers.
 *   3. Open the FastAPI signaling WebSocket. It only relays small JSON messages.
 *   4. Whoever is already in the room receives "peer-joined" and sends the
 *      offer; the newcomer answers. Both sides trickle ICE candidates.
 *   5. Audio/video then flow directly between the browsers (or via TURN).
 *
 * Because the person who was waiting is always the one who offers, the two
 * sides can never both offer at once, so no glare handling is needed.
 */

export type RoomStatus =
  | "starting"     // asking for camera/mic, fetching ticket
  | "connecting"   // opening the signaling socket
  | "waiting"      // in the room, the other person isn't here yet
  | "negotiating"  // both here, WebRTC handshake in progress
  | "connected"    // media flowing
  | "reconnecting" // dropped; trying to recover
  | "ended"        // the user left
  | "error";

export interface RoomPerson {
  id: string;
  name: string;
  role: string;
}

export interface PeerMedia {
  mic: boolean;
  cam: boolean;
  sharing: boolean;
}

interface TicketResponse {
  ticket: string;
  wsUrl: string;
  iceServers: RTCIceServer[];
  me: RoomPerson;
  peer: { name: string | null; role: string | null };
}

type ServerMessage =
  | { type: "joined"; self: RoomPerson; peers: RoomPerson[] }
  | { type: "peer-joined"; peer: RoomPerson }
  | { type: "peer-left"; peer: RoomPerson }
  | { type: "offer" | "answer"; from: string; data: RTCSessionDescriptionInit }
  | { type: "candidate"; from: string; data: RTCIceCandidateInit }
  | { type: "media-state"; from: string; data: Partial<PeerMedia> }
  | { type: "pong" };

const MAX_RECONNECTS = 5;
const PING_INTERVAL_MS = 25_000;
const DEFAULT_PEER_MEDIA: PeerMedia = { mic: true, cam: true, sharing: false };

async function fetchTicket(cycleId: string): Promise<TicketResponse> {
  const res = await fetch("/api/video/ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cycleId }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? "Couldn't join the class.");
  return data as TicketResponse;
}

function mediaErrorMessage(err: unknown): string {
  const name = (err as { name?: string } | null)?.name;
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera and microphone access is blocked. Allow access in your browser's address bar, then press Retry.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera or microphone was found on this device.";
    case "NotReadableError":
      return "Your camera or microphone is being used by another app. Close it and press Retry.";
    default:
      return "Couldn't start your camera and microphone.";
  }
}

function videoSenderOf(pc: RTCPeerConnection | null): RTCRtpSender | undefined {
  return pc?.getTransceivers().find((t) => t.receiver.track.kind === "video")?.sender;
}

export function useVideoRoom(cycleId: string) {
  const [status, setStatus] = React.useState<RoomStatus>("starting");
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [me, setMe] = React.useState<RoomPerson | null>(null);
  const [peer, setPeer] = React.useState<{ name: string | null; role: string | null } | null>(null);
  const [peerPresent, setPeerPresent] = React.useState(false);
  const [peerMedia, setPeerMedia] = React.useState<PeerMedia>(DEFAULT_PEER_MEDIA);
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = React.useState<MediaStream | null>(null);
  const [micOn, setMicOn] = React.useState(true);
  const [camOn, setCamOn] = React.useState(true);
  const [sharing, setSharing] = React.useState(false);
  const [canShare, setCanShare] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);

  const wsRef = React.useRef<WebSocket | null>(null);
  const pcRef = React.useRef<RTCPeerConnection | null>(null);
  const localRef = React.useRef<MediaStream | null>(null);
  const screenRef = React.useRef<MediaStream | null>(null);
  const iceServersRef = React.useRef<RTCIceServer[]>([]);
  const pendingIceRef = React.useRef<RTCIceCandidateInit[]>([]);
  const isOffererRef = React.useRef(false);
  const mediaRef = React.useRef({ mic: true, cam: true, sharing: false });
  const pingTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const retryTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectsRef = React.useRef(0);
  const leavingRef = React.useRef(false);
  const sessionRef = React.useRef(0);

  React.useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia);
  }, []);

  const sendSignal = React.useCallback((type: string, data?: unknown) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data === undefined ? { type } : { type, data }));
    }
  }, []);

  const sendMediaState = React.useCallback(() => {
    sendSignal("media-state", mediaRef.current);
  }, [sendSignal]);

  const closePeerConnection = React.useCallback(() => {
    const pc = pcRef.current;
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
    }
    pcRef.current = null;
    setRemoteStream(null);
  }, []);

  const teardown = React.useCallback(() => {
    if (pingTimerRef.current) clearInterval(pingTimerRef.current);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    pingTimerRef.current = retryTimerRef.current = null;
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws) {
      try {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "leave" }));
        ws.close(1000);
      } catch { /* already closing */ }
    }
    closePeerConnection();
    pendingIceRef.current = [];
    screenRef.current?.getTracks().forEach((t) => { t.onended = null; t.stop(); });
    screenRef.current = null;
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    setLocalStream(null);
    setSharing(false);
    setPeerPresent(false);
    setPeerMedia(DEFAULT_PEER_MEDIA);
    mediaRef.current = { mic: true, cam: true, sharing: false };
  }, [closePeerConnection]);

  React.useEffect(() => {
    const sid = ++sessionRef.current;
    const stale = () => sessionRef.current !== sid || leavingRef.current;

    const fail = (message: string) => {
      if (sessionRef.current !== sid) return;
      leavingRef.current = true;
      teardown();
      setError(message);
      setStatus("error");
    };

    const flushPendingIce = async (pc: RTCPeerConnection) => {
      const queued = pendingIceRef.current;
      pendingIceRef.current = [];
      for (const c of queued) {
        try { await pc.addIceCandidate(c); } catch { /* stale */ }
      }
    };

    const makeOffer = async (iceRestart = false) => {
      const pc = pcRef.current;
      if (!pc) return;
      const offer = await pc.createOffer({ iceRestart });
      await pc.setLocalDescription(offer);
      sendSignal("offer", { type: offer.type, sdp: offer.sdp });
    };

    const createPeerConnection = (): RTCPeerConnection => {
      closePeerConnection();
      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
      pcRef.current = pc;
      const local = localRef.current;
      local?.getTracks().forEach((t) => pc.addTrack(t, local));
      if (!local || local.getVideoTracks().length === 0) {
        pc.addTransceiver("video", { direction: "sendrecv" });
      }
      const screenTrack = screenRef.current?.getVideoTracks()[0];
      if (screenTrack) void videoSenderOf(pc)?.replaceTrack(screenTrack).catch(() => {});
      pc.onicecandidate = (e) => {
        if (e.candidate) sendSignal("candidate", e.candidate.toJSON());
      };
      const remote = new MediaStream();
      pc.ontrack = (e) => {
        if (!remote.getTracks().includes(e.track)) remote.addTrack(e.track);
        setRemoteStream(remote);
      };
      pc.onconnectionstatechange = () => {
        if (pcRef.current !== pc) return;
        switch (pc.connectionState) {
          case "connected":    setStatus("connected"); break;
          case "disconnected": setStatus("reconnecting"); break;
          case "failed":
            setStatus("reconnecting");
            if (isOffererRef.current) makeOffer(true).catch(() => {});
            break;
        }
      };
      return pc;
    };

    const handleMessage = async (msg: ServerMessage) => {
      switch (msg.type) {
        case "joined": {
          reconnectsRef.current = 0;
          if (msg.peers.length > 0) {
            setPeerPresent(true);
            setPeer({ name: msg.peers[0].name, role: msg.peers[0].role });
            setStatus("negotiating");
            sendMediaState();
          } else {
            setPeerPresent(false);
            setStatus("waiting");
          }
          break;
        }
        case "peer-joined": {
          setPeerPresent(true);
          setPeer({ name: msg.peer.name, role: msg.peer.role });
          setStatus("negotiating");
          isOffererRef.current = true;
          createPeerConnection();
          await makeOffer();
          sendMediaState();
          break;
        }
        case "offer": {
          isOffererRef.current = false;
          let pc = pcRef.current;
          if (!pc || pc.connectionState === "closed") pc = createPeerConnection();
          await pc.setRemoteDescription(msg.data);
          await flushPendingIce(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal("answer", { type: answer.type, sdp: answer.sdp });
          break;
        }
        case "answer": {
          const pc = pcRef.current;
          if (!pc) break;
          await pc.setRemoteDescription(msg.data);
          await flushPendingIce(pc);
          break;
        }
        case "candidate": {
          const pc = pcRef.current;
          if (pc && pc.remoteDescription) {
            try { await pc.addIceCandidate(msg.data); } catch { /* ignore */ }
          } else {
            pendingIceRef.current.push(msg.data);
          }
          break;
        }
        case "peer-left": {
          closePeerConnection();
          pendingIceRef.current = [];
          setPeerPresent(false);
          setPeerMedia(DEFAULT_PEER_MEDIA);
          setStatus("waiting");
          break;
        }
        case "media-state": {
          setPeerMedia((prev) => ({ ...prev, ...msg.data }));
          break;
        }
        case "pong": break;
      }
    };

    const scheduleReconnect = () => {
      reconnectsRef.current += 1;
      if (reconnectsRef.current > MAX_RECONNECTS) {
        fail("We lost the connection to the class. Check your network and press Retry.");
        return;
      }
      closePeerConnection();
      setPeerPresent(false);
      setStatus("reconnecting");
      retryTimerRef.current = setTimeout(() => {
        if (!stale()) void connect();
      }, Math.min(1000 * reconnectsRef.current, 5000));
    };

    const connect = async () => {
      if (stale()) return;
      let t: TicketResponse;
      try {
        t = await fetchTicket(cycleId);
      } catch (err) {
        if (stale()) return;
        if (reconnectsRef.current > 0 && !(err instanceof Error && /sign in|participant|available/i.test(err.message))) {
          scheduleReconnect();
        } else {
          fail(err instanceof Error ? err.message : "Couldn't join the class.");
        }
        return;
      }
      if (stale()) return;
      iceServersRef.current = t.iceServers;
      setMe(t.me);
      setPeer((prev) => prev ?? t.peer);
      setStatus("connecting");
      const ws = new WebSocket(`${t.wsUrl}?ticket=${encodeURIComponent(t.ticket)}`);
      wsRef.current = ws;
      ws.onopen = () => {
        if (pingTimerRef.current) clearInterval(pingTimerRef.current);
        pingTimerRef.current = setInterval(() => sendSignal("ping"), PING_INTERVAL_MS);
      };
      ws.onmessage = (ev) => {
        if (wsRef.current !== ws) return;
        let msg: ServerMessage;
        try { msg = JSON.parse(ev.data as string) as ServerMessage; } catch { return; }
        handleMessage(msg).catch((err) => console.error("[video] signaling error", err));
      };
      ws.onclose = (ev) => {
        if (pingTimerRef.current) clearInterval(pingTimerRef.current);
        if (wsRef.current !== ws || stale()) return;
        wsRef.current = null;
        if (ev.code === 4001) fail("Your session expired. Reload the page and sign in again.");
        else if (ev.code === 4003) fail("This class already has two people in it.");
        else if (ev.code === 4009) fail("You joined this class from another tab or device, so this one was disconnected.");
        else scheduleReconnect();
      };
    };

    const start = async () => {
      setStatus("starting");
      setError(null);
      setNotice(null);
      reconnectsRef.current = 0;
      if (!navigator.mediaDevices?.getUserMedia) {
        fail("This browser can't do video calls. Use a current Chrome, Edge, Firefox or Safari over HTTPS.");
        return;
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      } catch (err) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (!stale()) setNotice("Camera unavailable — you've joined with audio only.");
        } catch {
          fail(mediaErrorMessage(err));
          return;
        }
      }
      if (stale()) { stream.getTracks().forEach((t) => t.stop()); return; }
      const hasCam = stream.getVideoTracks().length > 0;
      localRef.current = stream;
      mediaRef.current = { mic: true, cam: hasCam, sharing: false };
      setLocalStream(stream);
      setMicOn(true);
      setCamOn(hasCam);
      await connect();
    };

    leavingRef.current = false;
    void start();
    return () => {
      sessionRef.current += 1;
      teardown();
    };
  }, [cycleId, attempt, teardown, closePeerConnection, sendSignal, sendMediaState]);

  // ---------------------------------------------------------------------------
  // Controls
  // ---------------------------------------------------------------------------

  const toggleMic = React.useCallback(() => {
    const tracks = localRef.current?.getAudioTracks() ?? [];
    if (tracks.length === 0) return;
    const next = !tracks[0].enabled;
    tracks.forEach((t) => (t.enabled = next));
    mediaRef.current = { ...mediaRef.current, mic: next };
    setMicOn(next);
    sendMediaState();
  }, [sendMediaState]);

  const toggleCam = React.useCallback(() => {
    const tracks = localRef.current?.getVideoTracks() ?? [];
    if (tracks.length === 0) return;
    const next = !tracks[0].enabled;
    tracks.forEach((t) => (t.enabled = next));
    mediaRef.current = { ...mediaRef.current, cam: next };
    setCamOn(next);
    sendMediaState();
  }, [sendMediaState]);

  const stopSharing = React.useCallback(() => {
    const screen = screenRef.current;
    if (!screen) return;
    screen.getTracks().forEach((t) => { t.onended = null; t.stop(); });
    screenRef.current = null;
    const cam = localRef.current?.getVideoTracks()[0] ?? null;
    void videoSenderOf(pcRef.current)?.replaceTrack(cam).catch(() => {});
    mediaRef.current = { ...mediaRef.current, sharing: false };
    setSharing(false);
    sendMediaState();
  }, [sendMediaState]);

  const toggleShare = React.useCallback(async () => {
    if (screenRef.current) { stopSharing(); return; }
    const sender = videoSenderOf(pcRef.current);
    if (!sender) {
      setNotice("Screen sharing is available once the other person has joined.");
      return;
    }
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = screen.getVideoTracks()[0];
      await sender.replaceTrack(track);
      track.onended = () => stopSharing();
      screenRef.current = screen;
      mediaRef.current = { ...mediaRef.current, sharing: true };
      setSharing(true);
      setNotice(null);
      sendMediaState();
    } catch (err) {
      if ((err as { name?: string })?.name !== "NotAllowedError") {
        setNotice("Couldn't start screen sharing.");
      }
    }
  }, [sendMediaState, stopSharing]);

  const leave = React.useCallback(() => {
    leavingRef.current = true;
    teardown();
    setStatus("ended");
  }, [teardown]);

  const rejoin = React.useCallback(() => {
    leavingRef.current = false;
    setError(null);
    setNotice(null);
    setStatus("starting");
    setAttempt((a) => a + 1);
  }, []);

  return {
    status, error, notice, me, peer, peerPresent, peerMedia,
    localStream, remoteStream,
    micOn, camOn, sharing, canShare,
    hasCamera: (localStream?.getVideoTracks().length ?? 0) > 0,
    toggleMic, toggleCam, toggleShare, leave, rejoin,
  };
}
