"use client";

import * as React from "react";
import Link from "next/link";
import { Search, UserRoundPlus } from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function StudentDashboard() {
  const [name, setName] = React.useState("Student");

  React.useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => data.user?.name && setName(data.user.name))
      .catch(() => undefined);
  }, []);

  return (
    <div>
      <PageHeader title={`Welcome back, ${name}`} description="Choose a mentor to begin your mentorship journey." />

      <Card className="mb-6 overflow-hidden">
        <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge tone="student" className="mb-3">No mentor selected</Badge>
            <h2 className="font-display text-xl font-medium">Your mentorship has not started yet</h2>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Browse the registered mentor directory and send a request when you find the right mentor. Progress, weeks, and sessions appear only after a request is accepted.
            </p>
          </div>
          <Button asChild><Link href="/student/directory"><UserRoundPlus className="h-4 w-4" /> Find a mentor</Link></Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="h-4 w-4" /> Mentor discovery</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 text-sm text-muted">
          Your dashboard will update once you submit a request and your mentor responds.
        </CardContent>
      </Card>
    </div>
  );
}
