"use client";

import { Check, ScanFace } from "lucide-react";

interface ARDetectionBadgeProps {
  detected?: boolean;
  label?: string;
  className?: string;
}

export default function ARDetectionBadge({
  detected = false,
  label,
  className = "",
}: ARDetectionBadgeProps) {
  return (
    <div
      className={`pointer-events-none inline-flex items-center gap-2 rounded-full border px-3 py-2 backdrop-blur-xl transition-all duration-500 ${
        detected
          ? "border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-200"
          : "border-white/10 bg-black/40 text-white/45"
      } ${className}`}
    >
      <span
        className={`relative flex h-5 w-5 items-center justify-center rounded-full ${
          detected
            ? "bg-emerald-400/10"
            : "bg-white/[0.05]"
        }`}
      >
        {detected ? (
          <Check size={12} />
        ) : (
          <ScanFace size={12} />
        )}

        {detected && (
          <span className="absolute inset-0 animate-ping rounded-full border border-emerald-300/20" />
        )}
      </span>

      <span className="text-[8px] font-semibold uppercase tracking-[0.14em]">
        {label ?? (detected ? "Face locked" : "Searching")}
      </span>
    </div>
  );
}