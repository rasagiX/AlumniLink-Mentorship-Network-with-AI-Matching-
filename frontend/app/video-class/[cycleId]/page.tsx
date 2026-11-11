"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, Loader2, Mic, MicOff, PhoneOff,
  RotateCcw, ScreenShare, ScreenShareOff, TriangleAlert,
  Users, Video, VideoOff, MessageSquare, Circle,
  Square, Upload, Download, CheckCircle2, X, Send,
  Trash2, AlertCircle,
} from "lucide-react";
import { useVideoRoom, type RoomStatus } from "@/lib/use-video-room";
import { useChatRoom, type ChatMsg } from "@/lib/use-chat-room";
import { initials, cn } from "@/lib/utils";

// ─── VideoTile ───────────────────────────────────────────────────────────────
function VideoTile({
  stream, muted = false, className = "",
}: { stream: MediaStream | null; muted?: boolean; className?: string }) {
  const ref = React.useRef<HTMLVideoElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    if (stream) el.play().catch(() => {});
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} className={className} />;
}

// ─── Status line ─────────────────────────────────────────────────────────────
function statusLine(status: RoomStatus, peerName: string | null): string {
  const them = peerName ?? "the other person";
  switch (status) {
    case "starting":     return "Starting camera and microphone…";
    case "connecting":   return "Joining the room…";
    case "waiting":      return `Waiting for ${them} to join…`;
    case "negotiating":  return `Connecting to ${them}…`;
    case "reconnecting": return "Connection interrupted — reconnecting…";
    case "ended":        return "You left the class.";
    default:             return "";
  }
}

// ─── Round control button ────────────────────────────────────────────────────
const roundBtn =
  "relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-150 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white " +
  "disabled:cursor-not-allowed disabled:opacity-40";

// ─── Chat panel ──────────────────────────────────────────────────────────────
function ChatPanel({
  myId, messages, typingName, onSend, onTyping, onClose,
}: {
  myId: string | undefined;
  messages: ChatMsg[];
  typingName: string | null;
  onSend: (text: string) => void;
  onTyping: () => void;
  onClose: () => void;
}) {
  const [text, setText] = React.useState("");
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const inputRef  = React.useRef<HTMLInputElement>(null);
  const typingRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll to bottom when new messages arrive
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Focus input when panel opens
  React.useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSend = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    // Debounced typing indicator
    if (typingRef.current) clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => onTyping(), 300);
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex h-full flex-col bg-[#1a1a1a]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-white/60" />
          <span className="text-sm font-semibold">Live Chat</span>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-xs text-white/30">
              No messages yet.<br />Say hello!
            </p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === myId;
          return (
            <div key={msg.id} className={cn("flex flex-col gap-0.5", isMe && "items-end")}>
              {/* Name + time */}
              <div className={cn("flex items-baseline gap-1.5 text-[10px] text-white/40", isMe && "flex-row-reverse")}>
                <span className="font-medium text-white/60">{isMe ? "You" : msg.sender_name}</span>
                <span>{formatTime(msg.sent_at)}</span>
              </div>
              {/* Bubble */}
              <div className={cn(
                "max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                isMe
                  ? "rounded-tr-sm bg-blue-600 text-white"
                  : "rounded-tl-sm bg-white/10 text-white/90"
              )}>
                {msg.text}
              </div>
            </div>
          );
        })}
        {/* Typing indicator */}
        {typingName && (
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className="inline-flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="inline-block h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
            {typingName} is typing…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 focus-within:border-white/30">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            maxLength={4000}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
            aria-label="Chat message"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-all hover:bg-blue-500 disabled:opacity-30"
            aria-label="Send message"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Recording controls panel ─────────────────────────────────────────────────
function RecordingPanel({
  recording, recordingReady, uploadingRecording, recordingError, recordingDuration,
  onStart, onStop, onUpload, onDiscard,
}: {
  recording: boolean;
  recordingReady: boolean;
  uploadingRecording: boolean;
  recordingError: string | null;
  recordingDuration: number;
  onStart: () => void;
  onStop: () => void;
  onUpload: () => void;
  onDiscard: () => void;
}) {
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    if (!recording) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed((s) => s + 1), 1_000);
    return () => clearInterval(id);
  }, [recording]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const fmtMB = (b: number) => `${(b / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className="flex flex-col gap-2.5">
      {/* Status badge */}
      {recording && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <Circle className="h-2.5 w-2.5 fill-red-500 text-red-500 animate-pulse" />
          Recording — {fmt(elapsed)}
        </div>
      )}

      {/* Ready badge */}
      {recordingReady && !recording && (
        <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-400">
          <CheckCircle2 className="h-3 w-3" />
          Recording ready — {fmt(recordingDuration)}
        </div>
      )}

      {/* Error */}
      {recordingError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
          {recordingError}
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-wrap gap-2">
        {!recording && !recordingReady && (
          <button
            onClick={onStart}
            className="flex items-center gap-1.5 rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600"
          >
            <Circle className="h-2.5 w-2.5 fill-white" /> Start Recording
          </button>
        )}

        {recording && (
          <button
            onClick={onStop}
            className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/25"
          >
            <Square className="h-2.5 w-2.5 fill-white" /> Stop Recording
          </button>
        )}

        {recordingReady && !recording && (
          <>
            <button
              onClick={onUpload}
              disabled={uploadingRecording}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600/80 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
            >
              {uploadingRecording
                ? <><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</>
                : <><Upload className="h-3 w-3" /> Save to LMS</>}
            </button>
            <button
              onClick={onDiscard}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/20 hover:text-white"
            >
              <Trash2 className="h-3 w-3" /> Discard
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main room component ─────────────────────────────────────────────────────
function VideoClassRoom() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const week = searchParams.get("week");

  // Hooks
  const room = useVideoRoom(cycleId);
  const { status, error, notice, me, peer, peerPresent, peerMedia, localStream, remoteStream } = room;
  const chat = useChatRoom(cycleId, room.chatWsUrl ?? null);

  // Panel state
  const [panel, setPanel] = React.useState<"none" | "people" | "chat" | "record">("none");

  // Track chat panel open for unread suppression
  React.useEffect(() => {
    chat.setPanelOpen(panel === "chat");
  }, [panel, chat]);

  const peerName = peer?.name ?? null;
  const backHref = me?.role === "mentor" ? `/alumni/lms/${cycleId}` : `/student/lms/${cycleId}`;

  const exit = () => { room.leave(); router.push(backHref); };

  const togglePanel = (name: typeof panel) =>
    setPanel((prev) => (prev === name ? "none" : name));

  const showRemoteVideo = !!remoteStream && (peerMedia.cam || peerMedia.sharing);
  const live = status === "connected";

  const dot = live
    ? "bg-green-500 animate-pulse"
    : status === "error" || status === "ended"
    ? "bg-white/30"
    : "bg-yellow-500 animate-pulse";

  const liveLabel = live ? "Live"
    : status === "waiting"           ? "Waiting"
    : status === "error" || status === "ended" ? "Offline"
    : "Connecting";

  // ── Layout: video area + optional side panel ──
  return (
    <div className="flex h-dvh flex-col bg-[#0f0f0f] text-white">

      {/* ══ Header ══ */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={exit}
            className="flex shrink-0 items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to LMS</span>
          </button>
          <span className="hidden text-white/20 sm:block">|</span>
          <span className="truncate text-sm font-medium">
            Live Class{week ? ` — Week ${week}` : ""}
            {peerName && <span className="font-normal text-white/40"> with {peerName}</span>}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {/* Recording indicator in header */}
          {room.recording && (
            <div className="flex items-center gap-1.5 text-xs text-red-400">
              <Circle className="h-2 w-2 fill-red-500 animate-pulse" />
              <span className="hidden sm:inline">REC</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-white/40" role="status">
            <div className={`h-2 w-2 rounded-full ${dot}`} />
            {liveLabel}
          </div>
        </div>
      </div>

      {/* ══ Notice bar ══ */}
      {notice && (
        <div className="shrink-0 border-b border-white/10 bg-white/5 px-5 py-2 text-center text-xs text-white/60" role="status">
          {notice}
        </div>
      )}

      {/* ══ Body = video + optional panel ══ */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* ── Video stage ── */}
        <div className="relative min-h-0 flex-1">

          {/* ─ Error screen ─ */}
          {status === "error" && (
            <div className="flex h-full items-center justify-center px-6">
              <div className="max-w-sm space-y-5 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                  <TriangleAlert className="h-7 w-7 text-red-400" />
                </div>
                <p className="text-sm leading-relaxed text-white/80" role="alert">
                  {error ?? "Something went wrong."}
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={room.rejoin}
                    className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" /> Retry
                  </button>
                  <Link href={backHref} className="rounded-lg bg-white/10 px-4 py-2 text-sm transition-colors hover:bg-white/20">
                    Leave
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ─ Ended screen ─ */}
          {status === "ended" && (
            <div className="flex h-full items-center justify-center px-6">
              <div className="space-y-4 text-center">
                <p className="text-lg font-medium">You left the class.</p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={room.rejoin}
                    className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 transition-colors"
                  >
                    Rejoin
                  </button>
                  <Link href={backHref} className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20 transition-colors">
                    Exit
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ─ Active call ─ */}
          {status !== "error" && status !== "ended" && (
            <>
              {/* Remote video */}
              <VideoTile
                stream={remoteStream}
                className={cn(
                  "absolute inset-0 h-full w-full bg-black object-contain",
                  !showRemoteVideo && "invisible"
                )}
              />

              {/* Remote avatar fallback */}
              {!showRemoteVideo && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="space-y-3 text-center">
                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-2xl font-semibold">
                      {peerName ? initials(peerName) : <Video className="h-9 w-9 text-white/40" />}
                    </div>
                    {peerName && <p className="text-base font-medium">{peerName}</p>}
                    {peerPresent && remoteStream && (
                      <p className="text-sm text-white/40">Camera is off</p>
                    )}
                  </div>
                </div>
              )}

              {/* Status overlay pill */}
              {status !== "connected" && (
                <div
                  className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-4 py-1.5 text-xs backdrop-blur-sm"
                  role="status" aria-live="polite"
                >
                  {status !== "waiting" && <Loader2 className="h-3.5 w-3.5 animate-spin text-white/60" />}
                  {statusLine(status, peerName)}
                </div>
              )}

              {/* Remote name tag */}
              {peerPresent && (
                <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs backdrop-blur-sm">
                  {!peerMedia.mic && <MicOff className="h-3 w-3 text-red-400" aria-label="Muted" />}
                  <span>{peerName ?? "Participant"}</span>
                  {peerMedia.sharing && <span className="text-white/50">· presenting</span>}
                </div>
              )}

              {/* Self-view PiP — shifts left when a panel is open on desktop */}
              <div
                className={cn(
                  "absolute bottom-4 z-10 overflow-hidden rounded-xl border border-white/15 bg-black shadow-xl transition-all duration-200",
                  panel !== "none" ? "right-4 h-24 w-32 sm:h-28 sm:w-40" : "right-4 h-28 w-40 sm:h-36 sm:w-52"
                )}
              >
                <VideoTile stream={localStream} muted className="h-full w-full -scale-x-100 object-cover" />
                {(!room.camOn || !room.hasCamera) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a] text-xs text-white/60">
                    {room.hasCamera ? "Camera off" : "No camera"}
                  </div>
                )}
                <div className="absolute bottom-1.5 left-2 text-[10px] text-white/70">You</div>
              </div>
            </>
          )}
        </div>

        {/* ── Side panel ── */}
        {panel !== "none" && (
          <div className="hidden w-80 shrink-0 border-l border-white/10 md:flex md:flex-col lg:w-96">
            {panel === "people" && (
              <div className="flex h-full flex-col bg-[#1a1a1a]">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-white/60" />
                    <span className="text-sm font-semibold">Participants</span>
                  </div>
                  <button onClick={() => setPanel("none")} className="flex h-7 w-7 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <ul className="flex-1 space-y-1 overflow-y-auto p-4">
                  <li className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5 text-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">
                        {initials(me?.name ?? "You")}
                      </div>
                      <span>{me?.name ?? "You"} <span className="text-white/40 text-xs">(you)</span></span>
                    </div>
                    {room.micOn ? <Mic className="h-4 w-4 text-white/50" /> : <MicOff className="h-4 w-4 text-red-400" />}
                  </li>
                  <li className={cn("flex items-center justify-between rounded-xl px-3 py-2.5 text-sm", peerPresent ? "bg-white/5" : "opacity-40")}>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                        {peerName ? initials(peerName) : "?"}
                      </div>
                      <span>
                        {peerName ?? "Other participant"}
                        {!peerPresent && <span className="ml-1 text-xs text-white/40">— not here yet</span>}
                      </span>
                    </div>
                    {peerPresent && (
                      peerMedia.mic ? <Mic className="h-4 w-4 text-white/50" /> : <MicOff className="h-4 w-4 text-red-400" />
                    )}
                  </li>
                </ul>
              </div>
            )}

            {panel === "chat" && (
              <ChatPanel
                myId={me?.id}
                messages={chat.messages}
                typingName={chat.typingName}
                onSend={chat.sendMessage}
                onTyping={chat.sendTyping}
                onClose={() => setPanel("none")}
              />
            )}

            {panel === "record" && (
              <div className="flex h-full flex-col bg-[#1a1a1a]">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Circle className="h-4 w-4 text-red-400" />
                    <span className="text-sm font-semibold">Recording</span>
                  </div>
                  <button onClick={() => setPanel("none")} className="flex h-7 w-7 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                  <RecordingPanel
                    recording={room.recording}
                    recordingReady={room.recordingReady}
                    uploadingRecording={room.uploadingRecording}
                    recordingError={room.recordingError}
                    recordingDuration={room.recordingDuration}
                    onStart={room.startRecording}
                    onStop={room.stopRecording}
                    onUpload={() => void room.uploadRecording()}
                    onDiscard={room.discardRecording}
                  />
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/50 space-y-1.5 leading-relaxed">
                    <p className="font-medium text-white/70">About recording</p>
                    <p>Records your local camera and microphone only. The other participant's video is not captured server-side.</p>
                    <p>Clicking <strong className="text-white/70">Save to LMS</strong> uploads the file so both participants can download it later from the LMS module.</p>
                    <p>Max file size: 500 MB.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mobile chat drawer (bottom sheet) */}
        {panel === "chat" && (
          <div className="fixed inset-x-0 bottom-0 z-40 flex h-[55vh] flex-col rounded-t-2xl border-t border-white/15 shadow-2xl md:hidden" style={{ background: "#1a1a1a" }}>
            <ChatPanel
              myId={me?.id}
              messages={chat.messages}
              typingName={chat.typingName}
              onSend={chat.sendMessage}
              onTyping={chat.sendTyping}
              onClose={() => setPanel("none")}
            />
          </div>
        )}
      </div>

      {/* ══ Controls bar ══ */}
      <div className="shrink-0 border-t border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">

          {/* Left — media controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={room.toggleMic}
              aria-label={room.micOn ? "Mute microphone" : "Unmute microphone"}
              aria-pressed={!room.micOn}
              title={room.micOn ? "Mute" : "Unmute"}
              disabled={status === "error" || status === "ended"}
              className={cn(roundBtn, room.micOn ? "bg-white/10 hover:bg-white/20" : "bg-red-600 hover:bg-red-500")}
            >
              {room.micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>

            <button
              onClick={room.toggleCam}
              aria-label={room.camOn ? "Turn camera off" : "Turn camera on"}
              disabled={!room.hasCamera || status === "error" || status === "ended"}
              className={cn(roundBtn, room.camOn ? "bg-white/10 hover:bg-white/20" : "bg-red-600 hover:bg-red-500")}
              title={room.hasCamera ? (room.camOn ? "Stop camera" : "Start camera") : "No camera"}
            >
              {room.camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>

            {room.canShare && (
              <button
                onClick={() => void room.toggleShare()}
                aria-label={room.sharing ? "Stop sharing" : "Share screen"}
                disabled={!room.sharing && status !== "connected"}
                className={cn(roundBtn, room.sharing ? "bg-white text-black hover:bg-white/90" : "bg-white/10 hover:bg-white/20")}
                title={room.sharing ? "Stop sharing" : "Share screen"}
              >
                {room.sharing ? <ScreenShareOff className="h-5 w-5" /> : <ScreenShare className="h-5 w-5" />}
              </button>
            )}
          </div>

          {/* Centre — leave */}
          <button
            onClick={exit}
            aria-label="Leave class"
            title="Leave"
            className={`${roundBtn} bg-red-600 hover:bg-red-500`}
          >
            <PhoneOff className="h-5 w-5" />
          </button>

          {/* Right — panel toggles */}
          <div className="flex items-center gap-2">
            {/* Chat */}
            <button
              onClick={() => togglePanel("chat")}
              aria-label="Chat"
              aria-pressed={panel === "chat"}
              title="Chat"
              className={cn(roundBtn, panel === "chat" ? "bg-white/25" : "bg-white/10 hover:bg-white/20")}
            >
              <MessageSquare className="h-5 w-5" />
              {chat.unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold">
                  {chat.unread > 9 ? "9+" : chat.unread}
                </span>
              )}
            </button>

            {/* Recording */}
            <button
              onClick={() => togglePanel("record")}
              aria-label="Recording"
              aria-pressed={panel === "record"}
              title="Recording"
              className={cn(roundBtn, panel === "record" ? "bg-white/25" : "bg-white/10 hover:bg-white/20")}
            >
              {room.recording
                ? <Circle className="h-5 w-5 fill-red-500 text-red-500" />
                : room.recordingReady
                ? <Download className="h-5 w-5 text-green-400" />
                : <Circle className="h-5 w-5" />}
            </button>

            {/* Participants */}
            <button
              onClick={() => togglePanel("people")}
              aria-label="Participants"
              aria-pressed={panel === "people"}
              title="Participants"
              className={cn(roundBtn, panel === "people" ? "bg-white/25" : "bg-white/10 hover:bg-white/20")}
            >
              <Users className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page export with Suspense boundary ──────────────────────────────────────
export default function VideoClassPage() {
  return (
    <React.Suspense fallback={<div className="h-dvh bg-[#0f0f0f]" />}>
      <VideoClassRoom />
    </React.Suspense>
  );
}
