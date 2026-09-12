"use client";

import { Box, Layers3, Sparkles } from "lucide-react";

export type ARRenderMode = "2d" | "3d";

interface ARModeToggleProps {
  mode?: ARRenderMode;
  onChange?: (mode: ARRenderMode) => void;
  disabled?: boolean;
}

export default function ARModeToggle({
  mode = "2d",
  onChange,
  disabled = false,
}: ARModeToggleProps) {
  return (
    <div className="pointer-events-auto inline-flex items-center rounded-full border border-white/10 bg-black/55 p-1 backdrop-blur-2xl">
      <ModeButton
        active={mode === "2d"}
        disabled={disabled}
        onClick={() => onChange?.("2d")}
        icon={<Layers3 size={14} />}
        label="2D"
      />

      <ModeButton
        active={mode === "3d"}
        disabled={disabled}
        onClick={() => onChange?.("3d")}
        icon={<Box size={14} />}
        label="3D"
      />

      <div className="mx-1 h-5 w-px bg-white/10" />

      <div
        className="flex h-8 items-center gap-1.5 px-2 text-white/30"
        title="AR rendering mode"
      >
        <Sparkles size={12} />
      </div>
    </div>
  );
}

function ModeButton({
  active,
  disabled,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[9px] font-semibold uppercase tracking-[0.12em] transition-all ${
        active
          ? "bg-white text-black shadow-lg"
          : "text-white/40 hover:bg-white/[0.06] hover:text-white"
      } ${
        disabled
          ? "cursor-not-allowed opacity-40"
          : ""
      }`}
      aria-pressed={active}
    >
      {icon}
      {label}
    </button>
  );
}