"use client";

import { Check, ChevronDown, Scissors } from "lucide-react";
import { useMemo, useState } from "react";

export interface ARHairStyle {
  id: string;
  name: string;
  image: string;
  category?: string;
}

interface HairStyleSelectorProps {
  styles: ARHairStyle[];
  selectedStyleId?: string | null;
  onSelect?: (style: ARHairStyle) => void;
}

export default function HairStyleSelector({
  styles,
  selectedStyleId = null,
  onSelect,
}: HairStyleSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedStyle = useMemo(
    () =>
      styles.find(
        (style) => style.id === selectedStyleId
      ) ?? null,
    [styles, selectedStyleId]
  );

  if (!styles.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-center">
        <Scissors
          size={18}
          className="mx-auto text-white/30"
        />

        <p className="mt-3 text-xs text-white/45">
          No hairstyles available.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Selected style button */}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.06]"
      >
        <div className="flex min-w-0 items-center gap-3">
          {selectedStyle?.image ? (
            <img
              src={selectedStyle.image}
              alt={selectedStyle.name}
              className="h-12 w-12 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <Scissors
                size={16}
                className="text-white/40"
              />
            </div>
          )}

          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/25">
              AR hairstyle
            </p>

            <p className="mt-1 truncate text-sm font-medium text-white">
              {selectedStyle?.name ?? "Choose a hairstyle"}
            </p>

            {selectedStyle?.category && (
              <p className="mt-0.5 text-[10px] text-white/30">
                {selectedStyle.category}
              </p>
            )}
          </div>
        </div>

        <ChevronDown
          size={16}
          className={`ml-3 shrink-0 text-white/40 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#101012]/95 p-2 shadow-2xl backdrop-blur-2xl">
          <div className="max-h-[360px] overflow-y-auto">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {styles.map((style) => {
                const selected =
                  style.id === selectedStyleId;

                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => {
                      onSelect?.(style);
                      setOpen(false);
                    }}
                    className={`group relative overflow-hidden rounded-xl border text-left transition ${
                      selected
                        ? "border-violet-400/50 bg-violet-400/[0.08]"
                        : "border-white/[0.07] bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.06]"
                    }`}
                  >
                    {/* Image */}

                    <div className="relative aspect-[4/5] overflow-hidden bg-black/20">
                      <img
                        src={style.image}
                        alt={style.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />

                      {/* Selected indicator */}

                      {selected && (
                        <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 shadow-lg">
                          <Check
                            size={13}
                            className="text-white"
                          />
                        </div>
                      )}
                    </div>

                    {/* Information */}

                    <div className="p-2.5">
                      <p className="truncate text-[11px] font-medium text-white/85">
                        {style.name}
                      </p>

                      {style.category && (
                        <p className="mt-1 truncate text-[9px] text-white/30">
                          {style.category}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}