"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Video, Mic, MicOff, VideoOff, PhoneOff, Users, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Video class room page.
 * Route: /video-class/[cycleId]?week=N
 *
 * This is the entry point for your custom video calling feature.
 * Replace the placeholder UI below with your WebRTC / video SDK implementation.
 * The cycleId and week number are available via params/searchParams.
 */
export default function VideoClassPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const searchParams = useSearchParams();
  const week = searchParams.get("week");

  const [micOn, setMicOn] = React.useState(true);
  const [camOn, setCamOn] = React.useState(true);

  return (
    <div className="flex min-h-screen flex-col bg-[#0f0f0f] text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <div className="flex items-center gap-3">
          <Link href={`/student/lms/${cycleId}`}
            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to LMS
          </Link>
          <span className="text-white/20">|</span>
          <span className="text-sm font-medium">
            Live Class {week ? `— Week ${week}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          Live
        </div>
      </div>

      {/* Main area — replace this with your video implementation */}
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/10">
            <Video className="h-10 w-10 text-white/60" />
          </div>
          <div>
            <p className="text-lg font-medium">Video Class Room</p>
            <p className="mt-1 text-sm text-white/50">
              Cycle: {cycleId} {week ? `· Week ${week}` : ""}
            </p>
          </div>
          <p className="text-sm text-white/40 max-w-sm mx-auto">
            Connect your video calling implementation here.
            The cycleId and week number are available as route parameters.
          </p>
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-3 border-t border-white/10 px-5 py-4">
        <button
          onClick={() => setMicOn((v) => !v)}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
            micOn ? "bg-white/10 hover:bg-white/20" : "bg-danger hover:bg-danger/80"
          }`}
          title={micOn ? "Mute" : "Unmute"}
        >
          {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </button>

        <button
          onClick={() => setCamOn((v) => !v)}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
            camOn ? "bg-white/10 hover:bg-white/20" : "bg-danger hover:bg-danger/80"
          }`}
          title={camOn ? "Stop camera" : "Start camera"}
        >
          {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </button>

        <button className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          title="Participants">
          <Users className="h-5 w-5" />
        </button>

        <Link href={`/student/lms/${cycleId}`}>
          <button className="flex h-12 w-12 items-center justify-center rounded-full bg-danger hover:bg-danger/80 transition-colors"
            title="Leave">
            <PhoneOff className="h-5 w-5" />
          </button>
        </Link>
      </div>
    </div>
  );
}
