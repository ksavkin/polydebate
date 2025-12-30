"use client";

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "size-5",
    md: "size-8",
    lg: "size-12",
  };

  return (
    <div className={cn("relative", sizeClasses[size], className)} role="status">
      {/* Outer Ring */}
      <div className="absolute inset-0 rounded-full border-2 border-[hsla(var(--brand-blue),0.1)]" />

      {/* Animated Inner Ring */}
      <div
        className="absolute inset-0 rounded-full border-2 border-[hsl(var(--brand-blue))] border-t-transparent animate-spin"
        style={{
          filter: 'drop-shadow(0 0 8px hsla(var(--brand-blue), 0.4))'
        }}
      />

      {/* Center Pulse */}
      <div className="absolute inset-[30%] rounded-full bg-[hsl(var(--brand-blue))] opacity-20 animate-pulse" />

      <span className="sr-only">Loading...</span>
    </div>
  );
}

