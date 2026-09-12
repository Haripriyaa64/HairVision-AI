"use client";

import { ScanFace, Sparkles } from "lucide-react";

interface ARLoadingProps {
  visible?: boolean;
  message?: string;
  submessage?: string;
}

export default function ARLoading({
  visible = false,
  message = "Preparing AR",
  submessage = "Initializing face tracking...",
}: ARLoadingProps) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/45 backdrop-blur-sm">
      <div className="flex w-[280px] flex-col items-center rounded-3xl border border-white/10 bg-black/70 px-7 py-8 text-center shadow-2xl backdrop-blur-2xl">
        {/* Animated scanner */}

        <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full border border-violet-400/20" />

          <div className="absolute inset-1 rounded-full border border-violet-400/20" />

          <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-violet-300/20 bg-violet-400/[0.08]">
            <ScanFace
              size={21}
              className="text-violet-200"
            />
          </div>
        </div>

        <div className="mb-2 flex items-center gap-2">
          <Sparkles
            size={13}
            className="text-violet-300"
          />

          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
            {message}
          </p>
        </div>

        <p className="text-xs leading-5 text-white/40">
          {submessage}
        </p>

        {/* Progress indicator */}

        <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full w-1/2 animate-[arLoading_1.4s_ease-in-out_infinite] rounded-full bg-violet-300/70" />
        </div>

        <style jsx>{`
          @keyframes arLoading {
            0% {
              transform: translateX(-120%);
            }

            50% {
              transform: translateX(100%);
            }

            100% {
              transform: translateX(220%);
            }
          }
        `}</style>
      </div>
    </div>
  );
}