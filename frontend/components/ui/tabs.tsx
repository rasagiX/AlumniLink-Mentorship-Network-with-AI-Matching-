"use client";
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("inline-flex items-center gap-1 border-b border-line", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "relative px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-ink data-[state=active]:text-ink",
        "after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:bg-transparent data-[state=active]:after:bg-ink",
        className
      )}
      {...props}
    />
  );
}

export const TabsContent = TabsPrimitive.Content;
