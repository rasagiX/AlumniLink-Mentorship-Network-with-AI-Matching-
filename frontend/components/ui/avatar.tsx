import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-ink/[0.05] font-display text-[13px] font-medium text-ink",
        className
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
