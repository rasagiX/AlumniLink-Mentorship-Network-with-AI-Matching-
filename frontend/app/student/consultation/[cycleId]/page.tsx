"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Mic, MicOff, Video, VideoOff, ScreenShare, PhoneOff, Circle, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { MENTORSHIP_CYCLES } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function useSessionTimer() {
  const [seconds, setSeconds] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function ConsultationPage() {
  const params = useParams<{ cycleId: string }>();
  const router = useRouter();
  const cycle = MENTORSHIP_CYCLES.find((c) => c.id === params.cycleId) ?? MENTORSHIP_CYCLES[0];

  const [micOn, setMicOn] = React.useState(true);
  const [camOn, setCamOn] = React.useState(true);
  const [sharing, setSharing] = React.useState(false);
  const [consentGiven, setConsentGiven] = React.useState(false);
  const [latency, setLatency] = React.useState(48);
  const timer = useSessionTimer();

  React.useEffect(() => {
    const id = setInterval(() => setLatency(38 + Math.round(Math.random() * 24)), 2500);
    return () => clearInterval(id);
  }, []);

  const endCall = () => router.push(`/student/lms/${cycle.id}`);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-paper text-ink">
      {/* Consent prompt */}
      {!consentGiven && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-paper/90 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-md border border-ink/15 bg-paper p-6 text-center">
            <Circle className="mx-auto mb-3 h-5 w-5 fill-danger text-danger" />
            <p className="font-display text-lg font-medium">Recording consent</p>
            <p className="mt-2 text-sm text-ink/70">
              This session may be recorded via MediaRecorder for quality and dispute-resolution purposes. Continuing
              indicates consent from both participants.
            </p>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1 border-ink/30 text-ink hover:border-ink" onClick={endCall}>
                Decline
              </Button>
              <Button className="flex-1 bg-ink text-paper hover:bg-ink/85" onClick={() => setConsentGiven(true)}>
                Consent & Join
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="font-medium">{cycle.mentorName}</p>
          <p className="text-xs text-ink/60">
            {cycle.domain} · Week {cycle.currentWeek} Consultation
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-ink/70">
          <span className="flex items-center gap-1.5 rounded-full border border-ink/20 px-2.5 py-1">
            <Wifi className="h-3 w-3" /> {latency}ms
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-ink/20 px-2.5 py-1 number-tabular">
            <Circle className="h-2 w-2 fill-danger text-danger" /> {timer}
          </span>
        </div>
      </div>

      {/* Remote feed */}
      <div className="relative mx-4 mb-4 flex flex-1 items-center justify-center overflow-hidden rounded-md bg-[radial-gradient(circle_at_center,_hsl(var(--ink)/0.08),_transparent_70%)]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar name={cycle.mentorName} className="h-24 w-24 border-ink/20 bg-ink/10 text-2xl text-ink" />
            {micOn && (
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-paper bg-success">
                <span className="flex items-end gap-[2px] h-2.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-[2px] animate-wave bg-ink"
                      style={{ animationDelay: `${i * 0.15}s`, height: "100%" }}
                    />
                  ))}
                </span>
              </span>
            )}
          </div>
          <p className="text-sm text-ink/60">
            {consentGiven ? "Remote video simulated for demo purposes" : "Waiting for consent…"}
          </p>
        </div>

        {/* Picture-in-picture local camera */}
        <div className="absolute bottom-4 right-4 flex h-28 w-44 items-center justify-center rounded-md border border-ink/20 bg-paper/60">
          {camOn ? (
            <div className="flex flex-col items-center gap-1.5 text-ink/70">
              <Avatar name="You" className="h-10 w-10 border-ink/20 bg-ink/10 text-ink" />
              <span className="text-[11px]">Your camera</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-ink/40">
              <VideoOff className="h-5 w-5" />
              <span className="text-[11px]">Camera off</span>
            </div>
          )}
        </div>

        {sharing && (
          <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-ink">
            <ScreenShare className="h-3 w-3" /> Sharing your screen
          </span>
        )}
      </div>

      {/* Control dock */}
      <div className="flex items-center justify-center gap-3 pb-8">
        <button
          onClick={() => setMicOn((v) => !v)}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full border transition-colors",
            micOn ? "border-ink/20 bg-ink/10 hover:bg-ink/15" : "border-danger bg-danger text-ink"
          )}
          aria-label="Toggle microphone"
        >
          {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </button>
        <button
          onClick={() => setCamOn((v) => !v)}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full border transition-colors",
            camOn ? "border-ink/20 bg-ink/10 hover:bg-ink/15" : "border-danger bg-danger text-ink"
          )}
          aria-label="Toggle camera"
        >
          {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </button>
        <button
          onClick={() => setSharing((v) => !v)}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full border transition-colors",
            sharing ? "border-accent bg-accent text-ink" : "border-ink/20 bg-ink/10 hover:bg-ink/15"
          )}
          aria-label="Toggle screen share"
        >
          <ScreenShare className="h-5 w-5" />
        </button>
        <button
          onClick={endCall}
          className="flex h-12 w-14 items-center justify-center rounded-full bg-danger text-ink transition-transform hover:scale-105"
          aria-label="End call"
        >
          <PhoneOff className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
