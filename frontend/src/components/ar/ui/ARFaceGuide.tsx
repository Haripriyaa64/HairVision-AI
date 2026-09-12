"use client";

import { ScanFace } from "lucide-react";

interface ARFaceGuideProps {
  visible?: boolean;
  faceDetected?: boolean;
}

export default function ARFaceGuide({
  visible = true,
  faceDetected = false,
}: ARFaceGuideProps) {
  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
      <div
        className={`relative h-[58%] w-[38%] min-w-[180px] max-w-[300px] rounded-[50%] border transition-all duration-500 ${
          faceDetected
            ? "border-violet-300/20"
            : "border-white/15"
        }`}
      >
        {/* Top guide */}

        <div
          className={`absolute left-1/2 top-[-1px] h-10 w-px -translate-x-1/2 transition-colors ${
            faceDetected
              ? "bg-violet-300/50"
              : "bg-white/20"
          }`}
        />

        {/* Bottom guide */}

        <div
          className={`absolute bottom-[-1px] left-1/2 h-10 w-px -translate-x-1/2 transition-colors ${
            faceDetected
              ? "bg-violet-300/50"
              : "bg-white/20"
          }`}
        />

        {/* Face detection indicator */}

        <div
          className={`absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border px-3 py-2 backdrop-blur-md transition-all duration-500 ${
            faceDetected
              ? "border-violet-300/20 bg-violet-400/[0.08] text-violet-200"
              : "border-white/10 bg-black/30 text-white/45"
          }`}
        >
          <ScanFace size={14} />

          <span className="whitespace-nowrap text-[8px] font-medium uppercase tracking-[0.14em]">
            {faceDetected
              ? "Face detected"
              : "Position your face"}
          </span>
        </div>
      </div>
    </div>
  );
}