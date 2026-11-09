import * as React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  xs: "h-6  w-6  text-[10px]",
  sm: "h-8  w-8  text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({ src, alt = "", size = "md", className, ...props }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false);

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        "bg-gradient-to-br from-[hsl(var(--accent)/0.3)] to-[hsl(var(--role-mentor)/0.3)]",
        "border border-line/50 font-semibold text-accent-ink",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {src && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{alt ? getInitials(alt) : "?"}</span>
      )}
    </div>
  );
}
