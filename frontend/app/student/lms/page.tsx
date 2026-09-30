"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, BookOpenCheck } from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Button } from "@/components/ui/button";

export default function StudentLmsIndex() {
  const router = useRouter();

  React.useEffect(() => {
    fetch("/api/lms/my-cycles")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d) && d.length > 0) {
          router.replace(`/student/lms/${d[0].id}`);
        }
        // else stay on this page to show the empty state
      })
      .catch(() => undefined);
  }, [router]);

  return (
    <div>
      <PageHeader title="My Cohort (LMS)" description="Your active mentorship programme modules." />
      <div className="flex flex-col items-center gap-4 rounded-md border border-dashed border-line py-20 text-center text-sm text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p>Looking for your active cycle…</p>
        <p className="text-xs">
          No active cycle yet?{" "}
          <Link href="/student/directory" className="underline underline-offset-2 hover:text-ink">
            Find a mentor
          </Link>{" "}
          and send a request.
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href="/student/dashboard">
            <BookOpenCheck className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
