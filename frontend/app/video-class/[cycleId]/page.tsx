"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Loader2, Mic, MicOff, PhoneOff,
  RotateCcw, ScreenShare, ScreenShareOff,
  TriangleAlert, Users, Video, VideoOff,
} from "lucide-react";
import { useVideoRoom, type RoomStatus } from "@/lib/use-video-room";
import { initials } from "@/lib/utils";

/**
 * Live class room. Route: /video-class/[cycleId]?week=N
 * One mentor + one student per cycle, connected peer-to-peer with WebRTC.
 * Signaling goes through FastAPI — see lib/use-video-room.ts.
 */

function VideoTile({
  stream,
  muted = false,
  className = "",
}: {
  stream: MediaStream | null;
  muted?: boolean;
  className?: string;
}) {
  const ref = React.useRef<HTMLVideoElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) el.play().catch(() => {});
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} className={className} />;
}

function statusLine(status: RoomStatus, peerName: string | null): string {
  const them = peerName ?? "the other person";
  switch (status) {
    case "starting":     return "Starting your camera and microphone…";
    case "connecting":   return "Joining the room…";
    case "waiting":      return `Waiting for ${them} to join…`;
    case "negotiating":  return `Connecting to ${them}…`;
    case "reconnecting": return "Connection interrupted — reconnecting…";
    case "ended":        return "You left the class.";
    default:             return "";
  }
}

const roundBtn =
  "flex h-12 w-12 items-center justify-center rounded-full transition-colors " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white " +
  "disabled:cursor-not-allowed disabled:opacity-40";

function VideoClassRoom() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const week = searchParams.get("week");

  const room = useVideoRoom(cycleId);
  const { status, error, notice, me, peer, peerPresent, peerMedia, localStream, remoteStream } = room;
  const [showPeople, setShowPeople] = React.useState(false);

  const peerName = peer?.name ?? null;
  const backHref = me?.role === "mentor" ? `/alumni/lms/${cycleId}` : `/student/lms/${cycleId}`;

  const exit = () => {
    room.leave();
    if (me) router.push(backHref);
    else router.back();
  };

  const showRemoteVideo = !!remoteStream && (peerMedia.cam || peerMedia.sharing);
  const live = status === "connected";
  const dot =
    live ? "bg-success animate-pulse" :
    status === "error" || status === "ended" ? "bg-white/30" :
    "bg-warning animate-pulse";
  const liveLabel =
    live ? "Live" :
    status === "waiting" ? "Waiting" :
    status === "error" || status === "ended" ? "Offline" :
    "Connecting";

  return (
    <div className="flex h-dvh flex-col bg-[#0f0f0f] text-white">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={exit}
            className="flex shrink-0 items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to LMS
          </button>
          <span className="text-white/20">|</span>
          <span className="truncate text-sm font-medium">
            Live Class{week ? ` — Week ${week}` : ""}
            {peerName && <span className="font-normal text-white/50"> with {peerName}</span>}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-white/50" role="status">
          <div className={`h-2 w-2 rounded-full ${dot}`} />
          {liveLabel}
        </div>
      </div>

      {/* ── Notice bar ── */}
      {notice && (
        <div className="border-b border-white/10 bg-white/5 px-5 py-2 text-center text-sm text-white/70" role="status">
          {notice}
        </div>
      )}

      {/* ── Stage ── */}
      <div className="relative min-h-0 flex-1">
        {status === "error" ? (
          <div className="flex h-full items-center justify-center px-6">
            <div className="max-w-sm space-y-5 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                <TriangleAlert className="h-7 w-7 text-red-400" />
              </div>
              <p className="text-base leading-relaxed" role="alert">
                {error ?? "Something went wrong."}
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={room.rejoin}
                  className="flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90"
                >
                  <RotateCcw className="h-4 w-4" /> Retry
                </button>
                <Link
                  href={backHref}
                  className="rounded-md bg-white/10 px-4 py-2 text-sm transition-colors hover:bg-white/20"
                >
                  Leave
                </Link>
              </div>
            </div>
          </div>
        ) : status === "ended" ? (
          <div className="flex h-full items-center justify-center px-6">
            <div className="space-y-4 text-center">
              <p className="text-lg">You left the class.</p>
              <button
                onClick={room.rejoin}
                className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90"
              >
                Rejoin
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Remote video (stays mounted so audio keeps playing when cam is off) */}
            <VideoTile
              stream={remoteStream}
              className={`absolute inset-0 h-full w-full bg-black object-contain ${showRemoteVideo ? "" : "invisible"}`}
            />

            {/* Remote avatar when camera off */}
            {!showRemoteVideo && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="space-y-3 text-center">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-2xl font-medium">
                    {peerName ? initials(peerName) : <Video className="h-9 w-9 text-white/50" />}
                  </div>
                  {peerName && <p className="text-lg font-medium">{peerName}</p>}
                  {peerPresent && remoteStream && (
                    <p className="text-sm text-white/50">Camera is off</p>
                  )}
                </div>
              </div>
            )}

            {/* Status overlay */}
            {status !== "connected" && (
              <div
                className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-md bg-black/70 px-3 py-1.5 text-sm"
                role="status"
                aria-live="polite"
              >
                {status !== "waiting" && <Loader2 className="h-4 w-4 animate-spin text-white/70" />}
                {statusLine(status, peerName)}
              </div>
            )}

            {/* Remote name tag */}
            {peerPresent && (
              <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-md bg-black/60 px-2.5 py-1 text-sm">
                {!peerMedia.mic && <MicOff className="h-3.5 w-3.5 text-red-400" aria-label="Muted" />}
                <span>{peerName ?? "Participant"}</span>
                {peerMedia.sharing && <span className="text-white/60">· presenting</span>}
              </div>
            )}

            {/* Self-view PiP */}
            <div className="absolute bottom-4 right-4 z-10 h-28 w-40 overflow-hidden rounded-lg border border-white/15 bg-black shadow-lg sm:h-36 sm:w-52">
              <VideoTile stream={localStream} muted className="h-full w-full -scale-x-100 object-cover" />
              {(!room.camOn || !room.hasCamera) && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a] text-sm text-white/70">
                  {room.hasCamera ? "Camera off" : "No camera"}
                </div>
              )}
              <div className="absolute bottom-1.5 left-2 text-xs text-white/80">You</div>
            </div>

            {/* Participants panel */}
            {showPeople && (
              <div className="absolute right-4 top-4 z-20 w-64 rounded-lg border border-white/10 bg-[#1c1c1c] p-3 text-sm shadow-xl">
                <p className="mb-2 font-medium">In this class</p>
                <ul className="space-y-2">
                  <li className="flex items-center justify-between">
                    <span>{me?.name ?? "You"} <span className="text-white/40">(you)</span></span>
                    {room.micOn
                      ? <Mic className="h-4 w-4 text-white/60" />
                      : <MicOff className="h-4 w-4 text-red-400" />}
                  </li>
                  <li className="flex items-center justify-between">
                    <span className={peerPresent ? "" : "text-white/40"}>
                      {peerName ?? "Other participant"}
                      {!peerPresent && " — not here yet"}
                    </span>
                    {peerPresent && (
                      peerMedia.mic
                        ? <Mic className="h-4 w-4 text-white/60" />
                        : <MicOff className="h-4 w-4 text-red-400" />
                    )}
                  </li>
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Controls ── */}
      <div className="flex items-center justify-center gap-3 border-t border-white/10 px-5 py-4">
        <button
          onClick={room.toggleMic}
          aria-label={room.micOn ? "Mute microphone" : "Unmute microphone"}
          aria-pressed={!room.micOn}
          title={room.micOn ? "Mute" : "Unmute"}
          disabled={status === "error" || status === "ended"}
          className={`${roundBtn} ${room.micOn ? "bg-white/10 hover:bg-white/20" : "bg-red-600 hover:bg-red-500"}`}
        >
          {room.micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </button>

        <button
          onClick={room.toggleCam}
          aria-label={room.camOn ? "Turn camera off" : "Turn camera on"}
          aria-pressed={!room.camOn}
          title={room.hasCamera ? (room.camOn ? "Stop camera" : "Start camera") : "No camera available"}
          disabled={!room.hasCamera || status === "error" || status === "ended"}
          className={`${roundBtn} ${room.camOn ? "bg-white/10 hover:bg-white/20" : "bg-red-600 hover:bg-red-500"}`}
        >
          {room.camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </button>

        {room.canShare && (
          <button
            onClick={() => void room.toggleShare()}
            aria-label={room.sharing ? "Stop sharing screen" : "Share screen"}
            aria-pressed={room.sharing}
            title={room.sharing ? "Stop sharing" : "Share screen"}
            disabled={!room.sharing && status !== "connected"}
            className={`${roundBtn} ${room.sharing ? "bg-white text-black hover:bg-white/90" : "bg-white/10 hover:bg-white/20"}`}
          >
            {room.sharing ? <ScreenShareOff className="h-5 w-5" /> : <ScreenShare className="h-5 w-5" />}
          </button>
        )}

        <button
          onClick={() => setShowPeople((v) => !v)}
          aria-label="Participants"
          aria-pressed={showPeople}
          title="Participants"
          className={`${roundBtn} ${showPeople ? "bg-white/25" : "bg-white/10 hover:bg-white/20"}`}
        >
          <Users className="h-5 w-5" />
        </button>

        <button
          onClick={exit}
          aria-label="Leave class"
          title="Leave"
          className={`${roundBtn} bg-red-600 hover:bg-red-500`}
        >
          <PhoneOff className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export default function VideoClassPage() {
  // useSearchParams() needs a Suspense boundary for production builds.
  return (
    <React.Suspense fallback={<div className="h-dvh bg-[#0f0f0f]" />}>
      <VideoClassRoom />
    </React.Suspense>
  );
}
