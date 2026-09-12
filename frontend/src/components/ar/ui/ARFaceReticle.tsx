"use client";

import { ScanFace } from "lucide-react";

interface ARFaceReticleProps {
  visible?: boolean;
  detected?: boolean;
  label?: string;
}

export default function ARFaceReticle({
  visible = true,
  detected = false,
  label,
}: ARFaceReticleProps) {
  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div
        className={`relative h-44 w-36 rounded-[48%] border transition-all duration-500 sm:h-56 sm:w-44 ${
          detected
            ? "scale-[1.02] border-violet-300/30"
            : "border-white/15"
        }`}
      >
        {/* Corner markers */}

        <span
          className={`absolute -left-1 -top-1 h-5 w-5 rounded-tl-lg border-l-2 border-t-2 ${
            detected ? "border-violet-300/70" : "border-white/30"
          }`}
        />

        <span
          className={`absolute -right-1 -top-1 h-5 w-5 rounded-tr-lg border-r-2 border-t-2 ${
            detected ? "border-violet-300/70" : "border-white/30"
          }`}
        />

        <span
          className={`absolute -bottom-1 -left-1 h-5 w-5 rounded-bl-lg border-b-2 border-l-2 ${
            detected ? "border-violet-300/70" : "border-white/30"
          }`}
        />

        <span
          className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-br-lg border-b-2 border-r-2 ${
            detected ? "border-violet-300/70" : "border-white/30"
          }`}
        />

        {/* Center indicator */}

        <div
          className={`absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border px-3 py-2 backdrop-blur-xl transition-all duration-500 ${
            detected
              ? "border-violet-300/20 bg-violet-400/[0.08] text-violet-200"
              : "border-white/10 bg-black/30 text-white/40"
          }`}
        >
          <ScanFace size={13} />

          <span className="whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.14em]">
            {label ?? (detected ? "Tracking" : "Align face")}
          </span>
        </div>

        {/* Tracking pulse */}

        {detected && (
          <div className="absolute inset-3 animate-pulse rounded-[45%] border border-violet-300/10" />
        )}
      </div>
    </div>
  );
}