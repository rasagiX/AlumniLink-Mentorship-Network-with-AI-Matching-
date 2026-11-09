"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="flex items-center gap-1 text-xs text-muted/70 transition-colors hover:text-danger"
    >
      <LogOut className="h-3 w-3" />
      Sign out
    </button>
  );
}
