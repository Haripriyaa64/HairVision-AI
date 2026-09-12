"use client";

import { Camera, ShieldCheck } from "lucide-react";

interface ARCameraPermissionProps {
  visible?: boolean;
  onStart?: () => void;
}

export default function ARCameraPermission({
  visible = false,
  onStart,
}: ARCameraPermissionProps) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 px-5 backdrop-blur-xl">
      <div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-white/[0.035] p-7 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-violet-300/20 bg-violet-400/[0.08]">
          <Camera size={25} className="text-violet-200" />
        </div>

        <h2 className="text-lg font-semibold tracking-tight text-white">
          Camera access required
        </h2>

        <p className="mt-2 text-sm leading-6 text-white/45">
          HairVision needs camera access to track your face and
          position hairstyles in real time.
        </p>

        <button
          type="button"
          onClick={onStart}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-black transition hover:bg-white/90"
        >
          <Camera size={15} />
          Enable camera
        </button>

        <div className="mt-4 flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.12em] text-white/25">
          <ShieldCheck size={12} />
          Camera stays in your browser
        </div>
      </div>
    </div>
  );
}