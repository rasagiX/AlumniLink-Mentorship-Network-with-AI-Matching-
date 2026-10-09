"use client";

import * as React from "react";
import Link from "next/link";
import {
  GraduationCap, Users, CalendarDays, ArrowRight,
  CheckCircle2, Clock, Video, MapPin, Loader2, UserCircle,
} from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Profile {
  id: string; name: string; email: string;
  year: number | null; branch: string | null;
  bio: string | null; skills: string | null;
  campus_location: string | null;
}

interface PeerSession {
  id: string; requester_name: string; requester_role: string;
  session_type: "online" | "offline";
  proposed_date: string | null; proposed_time: string | null;
  topic: string | null; location_note: string | null;
  status: string; created_at: string;
}

interface MentorRequest {
  id: string; mentor_name: string; status: string; goal: string;
}

export default function SeniorDashboard() {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [inbound, setInbound] = React.useState<PeerSession[]>([]);
  const [myRequests, setMyRequests] = React.useState<MentorRequest[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/profile/me").then((r) => r.json()),
      fetch("/api/peer-sessions/inbound").then((r) => r.json()),
      fetch("/api/requests/mine").then((r) => r.json()),
    ]).then(([p, s, r]) => {
      if (p && !p.error) setProfile(p);
      if (Array.isArray(s)) setInbound(s);
      if (Array.isArray(r)) setMyRequests(r);
    }).catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const pendingSessions = inbound.filter((s) => s.status === "pending");
  const acceptedMentor = myRequests.find((r) => r.status === "accepted");
  const pendingMentorReq = myRequests.find((r) => r.status === "pending");

  const YEAR_LABEL: Record<number, string> = { 1: "1st Year", 2: "2nd Year", 3: "3rd Year", 4: "4th Year", 5: "5th Year", 6: "Final Year" };

  if (loading) return (
    <div className="flex items-center gap-2 py-20 text-sm text-muted">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  );

  return (
    <div>
      <PageHeader
        title={`Welcome, ${profile?.name ?? "Senior"}`}
        description="You mentor juniors and are mentored by alumni — a bridge in the community."
      />

      {/* Profile completeness nudge */}
      {profile && (!profile.year || !profile.branch || !profile.bio) && (
        <Card className="mb-6 border-accent/30 bg-accent/[0.04]">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <UserCircle className="h-5 w-5 text-accent shrink-0" />
              <div>
                <p className="text-sm font-medium">Complete your profile</p>
                <p className="text-xs text-muted">
                  Add your year, branch, and bio so juniors can find and connect with you.
                </p>
              </div>
            </div>
            <Button asChild size="sm">
              <Link href="/profile/edit">Edit Profile</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Two-column role summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {/* As a junior (student side) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-accent" /> Your Alumni Mentor
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            {acceptedMentor ? (
              <div className="space-y-2">
                <Badge tone="success" className="flex w-fit items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Active mentorship
                </Badge>
                <p className="text-sm font-medium">{acceptedMentor.mentor_name}</p>
                <p className="text-xs text-muted line-clamp-2">{acceptedMentor.goal}</p>
                <Button asChild size="sm" variant="outline" className="mt-2">
                  <Link href="/senior/my-senior">
                    View mentorship <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            ) : pendingMentorReq ? (
              <div className="space-y-2">
                <Badge tone="accent" className="flex w-fit items-center gap-1">
                  <Clock className="h-3 w-3" /> Request pending
                </Badge>
                <p className="text-sm text-muted">
                  Waiting for <strong>{pendingMentorReq.mentor_name}</strong> to respond.
                </p>
                <Button asChild size="sm" variant="outline" className="mt-2">
                  <Link href="/senior/my-senior">
                    View status <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted">You haven't connected with an alumni mentor yet.</p>
                <Button asChild size="sm">
                  <Link href="/student/directory">Find Alumni Mentor</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* As a senior (mentor side) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4 text-success" /> Your Juniors
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="space-y-2">
              <div className="text-sm text-muted">
                {pendingSessions.length > 0 ? (
                  <>
                    <Badge tone="accent" className="mb-2 flex w-fit items-center gap-1">
                      <Clock className="h-3 w-3" /> {pendingSessions.length} session{pendingSessions.length > 1 ? "s" : ""} pending
                    </Badge>
                    <p>Juniors are requesting your time.</p>
                  </>
                ) : (
                  <p>No pending session requests from juniors.</p>
                )}
              </div>
              <Button asChild size="sm" variant="outline" className="mt-1">
                <Link href="/senior/juniors">
                  Manage juniors <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending session requests preview */}
      {pendingSessions.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-lg font-medium flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-accent" /> Pending Session Requests
          </h2>
          <div className="space-y-2">
            {pendingSessions.slice(0, 3).map((s) => (
              <Card key={s.id} className="border-accent/20">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-sm shrink-0",
                    s.session_type === "online" ? "bg-accent/10" : "bg-success/10"
                  )}>
                    {s.session_type === "online"
                      ? <Video className="h-4 w-4 text-accent" />
                      : <MapPin className="h-4 w-4 text-success" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.requester_name}
                      <Badge tone="neutral" className="ml-2 capitalize">{s.requester_role}</Badge>
                    </p>
                    <p className="text-xs text-muted truncate">
                      {s.session_type} · {s.proposed_date ?? "Date TBD"}
                      {s.proposed_time ? ` at ${s.proposed_time}` : ""}
                      {s.topic ? ` · ${s.topic}` : ""}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/senior/sessions">Respond</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
            {pendingSessions.length > 3 && (
              <Button asChild variant="outline" size="sm">
                <Link href="/senior/sessions">See all {pendingSessions.length} requests</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
