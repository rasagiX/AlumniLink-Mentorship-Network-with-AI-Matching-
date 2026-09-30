"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, BookOpenCheck } from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Button } from "@/components/ui/button";

export default function AlumniLmsIndex() {
  const router = useRouter();

  React.useEffect(() => {
    fetch("/api/lms/cycles")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d) && d.length > 0) {
          router.replace(`/alumni/lms/${d[0].id}`);
        }
      })
      .catch(() => undefined);
  }, [router]);

  return (
    <div>
      <PageHeader title="Module Authoring" description="Manage your mentee cycles and LMS content." />
      <div className="flex flex-col items-center gap-4 rounded-md border border-dashed border-line py-20 text-center text-sm text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p>Looking for your active cycles…</p>
        <p className="text-xs">
          No active cycle?{" "}
          <Link href="/alumni/requests" className="underline underline-offset-2 hover:text-ink">
            Accept a student request
          </Link>{" "}
          to create one.
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href="/alumni/dashboard">
            <BookOpenCheck className="h-3.5 w-3.5" /> Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
