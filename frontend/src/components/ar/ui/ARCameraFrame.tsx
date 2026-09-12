"use client";

import { ReactNode } from "react";

interface ARCameraFrameProps {
  children?: ReactNode;
  className?: string;
  showCorners?: boolean;
}

export default function ARCameraFrame({
  children,
  className = "",
  showCorners = true,
}: ARCameraFrameProps) {
  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-[28px] border border-white/10 bg-black ${className}`}
    >
      {/* Camera / AR content */}

      <div className="absolute inset-0">
        {children}
      </div>

      {/* Premium AR frame */}

      {showCorners && (
        <>
          <div className="pointer-events-none absolute left-5 top-5 h-7 w-7 border-l border-t border-white/30" />

          <div className="pointer-events-none absolute right-5 top-5 h-7 w-7 border-r border-t border-white/30" />

          <div className="pointer-events-none absolute bottom-5 left-5 h-7 w-7 border-b border-l border-white/30" />

          <div className="pointer-events-none absolute bottom-5 right-5 h-7 w-7 border-b border-r border-white/30" />
        </>
      )}

      {/* Center scanning line */}

      <div className="pointer-events-none absolute left-1/2 top-1/2 h-px w-24 -translate-x-1/2 bg-white/10" />

      <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-px -translate-y-1/2 bg-white/10" />

      {/* Top gradient */}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/25 to-transparent" />

      {/* Bottom gradient */}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/30 to-transparent" />
    </div>
  );
}