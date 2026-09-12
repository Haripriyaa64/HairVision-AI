"use client";

interface FacePlacementGuideProps {
  faceDetected: boolean;
  faceAligned: boolean;
}

export default function FacePlacementGuide({
  faceDetected,
  faceAligned,
}: FacePlacementGuideProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      <div
        className={[
          "relative",
          "h-[76%]",
          "w-[56%]",
          "max-w-[350px]",
          "rounded-[50%]",
          "border-2",
          "transition-all",
          "duration-300",
          faceAligned
            ? "border-violet-400 shadow-[0_0_40px_rgba(139,92,246,0.45)]"
            : faceDetected
              ? "border-amber-300 shadow-[0_0_35px_rgba(251,191,36,0.25)]"
              : "border-white/60 shadow-[0_0_25px_rgba(255,255,255,0.08)]",
        ].join(" ")}
      >
        <div
          className={[
            "absolute",
            "left-1/2",
            "-top-2",
            "h-4",
            "w-4",
            "-translate-x-1/2",
            "rounded-full",
            "border-2",
            faceAligned
              ? "border-violet-200 bg-violet-400"
              : "border-white/80 bg-white/20",
          ].join(" ")}
        />

        <div
          className={[
            "absolute",
            "-left-2",
            "top-1/2",
            "h-4",
            "w-4",
            "-translate-y-1/2",
            "rounded-full",
            "border-2",
            faceAligned
              ? "border-violet-200 bg-violet-400"
              : "border-white/80 bg-white/20",
          ].join(" ")}
        />

        <div
          className={[
            "absolute",
            "-right-2",
            "top-1/2",
            "h-4",
            "w-4",
            "-translate-y-1/2",
            "rounded-full",
            "border-2",
            faceAligned
              ? "border-violet-200 bg-violet-400"
              : "border-white/80 bg-white/20",
          ].join(" ")}
        />

        <div
          className={[
            "absolute",
            "left-1/2",
            "top-1/2",
            "h-2",
            "w-2",
            "-translate-x-1/2",
            "-translate-y-1/2",
            "rounded-full",
            faceAligned
              ? "bg-violet-300 shadow-[0_0_15px_rgba(167,139,250,1)]"
              : "bg-white/50",
          ].join(" ")}
        />

        <div className="absolute left-1/2 top-[11%] h-8 w-px -translate-x-1/2 bg-white/15" />
        <div className="absolute left-1/2 top-[11%] h-px w-8 -translate-x-1/2 bg-white/15" />
        <div className="absolute bottom-[10%] left-1/2 h-px w-10 -translate-x-1/2 bg-white/15" />

        <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <div
            className={[
              "rounded-full",
              "border",
              "px-4",
              "py-2",
              "text-[10px]",
              "font-medium",
              "uppercase",
              "tracking-[0.18em]",
              "backdrop-blur-xl",
              faceAligned
                ? "border-violet-400/30 bg-violet-500/15 text-violet-200"
                : faceDetected
                  ? "border-amber-300/20 bg-amber-400/10 text-amber-200"
                  : "border-white/10 bg-black/70 text-white/65",
            ].join(" ")}
          >
            {faceAligned
              ? "Face positioned"
              : faceDetected
                ? "Adjust your position"
                : "Place your face here"}
          </div>
        </div>
      </div>
    </div>
  );
}
