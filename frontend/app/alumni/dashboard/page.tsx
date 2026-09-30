"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Users, BookOpenCheck } from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MENTOR_ACTIVE_CYCLES, MENTOR_DIRECTORY, CURRENT_USER } from "@/lib/mock-data";

export default function MentorDashboard() {
  const mentor = MENTOR_DIRECTORY.find((m) => m.id === CURRENT_USER.mentor.id)!;
  const [capTwo, setCapTwo] = React.useState(mentor.capacity === 2);

  return (
    <div>
      <PageHeader
        title="Capacity Control Desk"
        description={`Signed in as ${mentor.name} · ${mentor.title} at ${mentor.company}`}
      />

      <Card className="mb-6">
        <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium">Mentee capacity cap</p>
            <p className="mt-0.5 text-sm text-muted">
              Currently mentoring {mentor.activeMentees} of {capTwo ? 2 : 1} allowed mentees.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="cap-toggle" className="mb-0 text-sm text-muted">
              1 mentee
            </Label>
            <Switch id="cap-toggle" checked={capTwo} onCheckedChange={setCapTwo} />
            <Label htmlFor="cap-toggle" className="mb-0 text-sm text-muted">
              2 mentees
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-medium">Active Mentees</h2>
        <Badge tone="mentor">
          <Users className="mr-1 h-3 w-3" /> {MENTOR_ACTIVE_CYCLES.length} active
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {MENTOR_ACTIVE_CYCLES.map((cycle) => {
          const completed = cycle.modules.filter((m) => m.status === "completed").length;
          return (
            <Card key={cycle.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar name={cycle.studentName} />
                  <div>
                    <CardTitle>{cycle.studentName}</CardTitle>
                    <p className="text-xs text-muted">{cycle.domain}</p>
                  </div>
                </div>
                <Badge tone={cycle.meetingsLast10Days === 0 ? "danger" : "neutral"}>
                  {cycle.meetingsLast10Days === 0 ? "No recent sessions" : `${cycle.meetingsLast10Days} sessions / 10d`}
                </Badge>
              </CardHeader>
              <CardContent className="p-5">
                <div className="mb-1 flex items-center justify-between text-xs text-muted">
                  <span>Week {cycle.currentWeek} of {cycle.totalWeeks}</span>
                  <span>{completed} milestones complete</span>
                </div>
                <Progress value={(completed / cycle.totalWeeks) * 100} />
                <Button asChild size="sm" variant="outline" className="mt-4 w-full">
                  <Link href={`/alumni/lms/${cycle.id}`}>
                    <BookOpenCheck className="h-3.5 w-3.5" /> Open Module Authoring Desk
                    <ArrowRight className="ml-auto h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
