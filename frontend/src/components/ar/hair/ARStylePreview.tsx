"use client";

import { Check, Sparkles } from "lucide-react";

interface ARStylePreviewProps {
  name: string;
  imageSrc?: string | null;
  selected?: boolean;
  onClick?: () => void;
}

export default function ARStylePreview({
  name,
  imageSrc,
  selected = false,
  onClick,
}: ARStylePreviewProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-28 shrink-0 overflow-hidden rounded-2xl border text-left transition-all duration-300 ${
        selected
          ? "border-violet-300/40 bg-violet-400/[0.08] shadow-lg shadow-violet-500/10"
          : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]"
      }`}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-black/40">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Sparkles
              size={18}
              className="text-white/20"
            />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />

        {selected && (
          <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-violet-200/20 bg-violet-400/20 backdrop-blur-md">
            <Check
              size={12}
              className="text-violet-100"
            />
          </div>
        )}
      </div>

      <div className="px-3 py-2.5">
        <p
          className={`truncate text-[9px] font-semibold uppercase tracking-[0.08em] ${
            selected ? "text-white" : "text-white/55"
          }`}
        >
          {name}
        </p>
      </div>
    </button>
  );
}