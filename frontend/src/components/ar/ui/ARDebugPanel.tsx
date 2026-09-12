"use client";

import { Activity, Camera, ScanFace, Sparkles } from "lucide-react";

interface ARDebugPanelProps {
  visible?: boolean;
  cameraActive?: boolean;
  faceDetected?: boolean;
  landmarksCount?: number;
  yaw?: number;
  pitch?: number;
  roll?: number;
  rendererMode?: "2d" | "3d";
}

export default function ARDebugPanel({
  visible = false,
  cameraActive = false,
  faceDetected = false,
  landmarksCount = 0,
  yaw = 0,
  pitch = 0,
  roll = 0,
  rendererMode = "2d",
}: ARDebugPanelProps) {
  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute left-4 top-4 z-40 w-52 rounded-2xl border border-white/10 bg-black/65 p-3 backdrop-blur-2xl">
      <div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-2">
        <Activity size={13} className="text-violet-300" />

        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/70">
          AR Diagnostics
        </span>
      </div>

      <DebugRow
        icon={<Camera size={11} />}
        label="Camera"
        value={cameraActive ? "ACTIVE" : "OFF"}
        active={cameraActive}
      />

      <DebugRow
        icon={<ScanFace size={11} />}
        label="Face"
        value={faceDetected ? "LOCKED" : "SEARCHING"}
        active={faceDetected}
      />

      <DebugRow
        icon={<Sparkles size={11} />}
        label="Renderer"
        value={rendererMode.toUpperCase()}
        active
      />

      <DebugRow
        label="Landmarks"
        value={String(landmarksCount)}
      />

      <DebugRow
        label="Yaw"
        value={`${yaw.toFixed(1)}°`}
      />

      <DebugRow
        label="Pitch"
        value={`${pitch.toFixed(1)}°`}
      />

      <DebugRow
        label="Roll"
        value={`${roll.toFixed(1)}°`}
      />
    </div>
  );
}

function DebugRow({
  icon,
  label,
  value,
  active = false,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2 text-white/35">
        {icon}
        <span className="text-[8px] uppercase tracking-[0.1em]">
          {label}
        </span>
      </div>

      <span
        className={`text-[8px] font-semibold uppercase tracking-[0.08em] ${
          active ? "text-emerald-300/70" : "text-white/35"
        }`}
      >
        {value}
      </span>
    </div>
  );
}