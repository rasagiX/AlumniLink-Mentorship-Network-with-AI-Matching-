"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const onClick = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <button onClick={onClick} disabled={loading} className="text-xs text-muted hover:text-ink disabled:opacity-50">
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
