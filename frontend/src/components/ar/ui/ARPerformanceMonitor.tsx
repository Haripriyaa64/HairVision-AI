"use client";

import { Activity, Gauge } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ARPerformanceMonitorProps {
  visible?: boolean;
  targetFps?: number;
}

export default function ARPerformanceMonitor({
  visible = false,
  targetFps = 30,
}: ARPerformanceMonitorProps) {
  const [fps, setFps] = useState(0);
  const [frameTime, setFrameTime] = useState(0);

  const frameCount = useRef(0);
  const lastTime = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!visible) {
      setFps(0);
      setFrameTime(0);
      return;
    }

    let running = true;

    const measure = (time: number) => {
      if (!running) return;

      frameCount.current += 1;

      if (lastTime.current === null) {
        lastTime.current = time;
      }

      const elapsed = time - lastTime.current;

      if (elapsed >= 500) {
        const currentFps =
          (frameCount.current * 1000) / elapsed;

        setFps(Math.round(currentFps));
        setFrameTime(
          currentFps > 0
            ? Number((1000 / currentFps).toFixed(1))
            : 0
        );

        frameCount.current = 0;
        lastTime.current = time;
      }

      animationRef.current =
        requestAnimationFrame(measure);
    };

    animationRef.current =
      requestAnimationFrame(measure);

    return () => {
      running = false;

      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      lastTime.current = null;
      frameCount.current = 0;
    };
  }, [visible]);

  if (!visible) return null;

  const performance =
    fps >= targetFps
      ? "Good"
      : fps >= targetFps * 0.7
        ? "Stable"
        : "Low";

  return (
    <div className="pointer-events-none absolute right-4 top-4 z-30 rounded-2xl border border-white/10 bg-black/55 px-3 py-2.5 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Activity
            size={12}
            className="text-violet-300"
          />

          <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/60">
            {fps} FPS
          </span>
        </div>

        <div className="h-3 w-px bg-white/10" />

        <div className="flex items-center gap-1.5">
          <Gauge
            size={12}
            className="text-white/35"
          />

          <span className="text-[9px] uppercase tracking-[0.1em] text-white/35">
            {performance}
          </span>
        </div>
      </div>

      <div className="mt-1 text-[8px] tracking-[0.08em] text-white/20">
        {frameTime > 0 ? `${frameTime} ms/frame` : "Measuring..."}
      </div>
    </div>
  );
}