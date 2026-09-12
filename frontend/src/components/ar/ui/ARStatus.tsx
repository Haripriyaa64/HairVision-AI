"use client";

import {
  Camera,
  Check,
  CircleAlert,
  ScanFace,
  Sparkles,
} from "lucide-react";

interface ARStatusProps {
  cameraActive?: boolean;
  faceDetected?: boolean;
  hairActive?: boolean;
  loading?: boolean;
  error?: string | null;
}

export default function ARStatus({
  cameraActive = false,
  faceDetected = false,
  hairActive = false,
  loading = false,
  error = null,
}: ARStatusProps) {
  return (
    <div className="pointer-events-none absolute left-4 top-4 z-30 w-[220px] rounded-2xl border border-white/10 bg-black/60 p-3 backdrop-blur-xl">
      {/* Header */}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles
            size={13}
            className="text-violet-300"
          />

          <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/60">
            HairVision AR
          </span>
        </div>

        <span
          className={`h-1.5 w-1.5 rounded-full ${
            error
              ? "bg-red-400"
              : cameraActive
                ? "animate-pulse bg-emerald-400"
                : "bg-white/20"
          }`}
        />
      </div>

      {/* Status rows */}

      <div className="mt-3 space-y-2">
        <StatusRow
          icon={<Camera size={12} />}
          label="Camera"
          active={cameraActive}
        />

        <StatusRow
          icon={<ScanFace size={12} />}
          label="Face tracking"
          active={faceDetected}
        />

        <StatusRow
          icon={<Sparkles size={12} />}
          label="AR hairstyle"
          active={hairActive}
        />
      </div>

      {/* Loading */}

      {loading && (
        <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
          <span className="h-3 w-3 animate-spin rounded-full border border-white/20 border-t-white/80" />

          <span className="text-[9px] text-white/40">
            Initializing AR...
          </span>
        </div>
      )}

      {/* Error */}

      {error && (
        <div className="mt-3 flex gap-2 border-t border-red-400/10 pt-3">
          <CircleAlert
            size={13}
            className="mt-0.5 shrink-0 text-red-400"
          />

          <p className="text-[9px] leading-4 text-red-300/70">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}

function StatusRow({
  icon,
  label,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-white/40">
        {icon}

        <span className="text-[10px]">
          {label}
        </span>
      </div>

      {active ? (
        <div className="flex items-center gap-1 text-emerald-300/80">
          <Check size={11} />

          <span className="text-[8px] uppercase tracking-wider">
            Ready
          </span>
        </div>
      ) : (
        <span className="text-[8px] uppercase tracking-wider text-white/20">
          Waiting
        </span>
      )}
    </div>
  );
}