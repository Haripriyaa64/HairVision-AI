"use client";

import {
  Camera,
  Eye,
  EyeOff,
  RotateCcw,
  ScanFace,
  Sparkles,
  X,
} from "lucide-react";

interface ARControlsProps {
  cameraActive?: boolean;
  landmarksVisible?: boolean;
  hairVisible?: boolean;
  onToggleLandmarks?: () => void;
  onToggleHair?: () => void;
  onReset?: () => void;
  onStopCamera?: () => void;
}

export default function ARControls({
  cameraActive = false,
  landmarksVisible = false,
  hairVisible = true,
  onToggleLandmarks,
  onToggleHair,
  onReset,
  onStopCamera,
}: ARControlsProps) {
  return (
    <div className="pointer-events-auto absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/65 p-2 shadow-2xl backdrop-blur-2xl">
      {/* Landmarks */}

      <ControlButton
        label={
          landmarksVisible
            ? "Hide tracking"
            : "Show tracking"
        }
        active={landmarksVisible}
        onClick={onToggleLandmarks}
      >
        <ScanFace size={15} />
      </ControlButton>

      {/* Hair */}

      <ControlButton
        label={
          hairVisible
            ? "Hide hair"
            : "Show hair"
        }
        active={hairVisible}
        onClick={onToggleHair}
      >
        {hairVisible ? (
          <Eye size={15} />
        ) : (
          <EyeOff size={15} />
        )}
      </ControlButton>

      {/* Reset */}

      <ControlButton
        label="Reset AR"
        onClick={onReset}
      >
        <RotateCcw size={15} />
      </ControlButton>

      {/* Stop camera */}

      {cameraActive && (
        <>
          <div className="mx-1 h-5 w-px bg-white/10" />

          <button
            type="button"
            onClick={onStopCamera}
            className="flex h-10 items-center gap-2 rounded-full border border-red-400/15 bg-red-400/[0.06] px-4 text-[9px] font-medium uppercase tracking-[0.12em] text-red-300/75 transition hover:border-red-400/30 hover:bg-red-400/[0.1] hover:text-red-200"
          >
            <X size={14} />

            <span className="hidden sm:inline">
              Stop camera
            </span>
          </button>
        </>
      )}
    </div>
  );
}

function ControlButton({
  children,
  label,
  active = false,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-10 items-center gap-2 rounded-full border px-3 transition ${
        active
          ? "border-violet-400/25 bg-violet-400/[0.1] text-violet-200"
          : "border-white/10 bg-white/[0.025] text-white/45 hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
      }`}
    >
      {children}

      <span className="hidden text-[9px] font-medium uppercase tracking-[0.1em] sm:inline">
        {label}
      </span>
    </button>
  );
}