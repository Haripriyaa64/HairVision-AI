"use client";

import { useEffect, useRef } from "react";
import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";

interface FaceLandmarksOverlayProps {
  video: HTMLVideoElement | null;
  result: FaceLandmarkerResult | null;
}

export default function FaceLandmarksOverlay({
  video,
  result,
}: FaceLandmarksOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !video || !result) {
      return;
    }

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const faces = result.faceLandmarks;

    if (!faces || faces.length === 0) {
      return;
    }

    const landmarks = faces[0];

    /*
     * Draw all MediaPipe face landmarks.
     */

    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";

    for (const point of landmarks) {
      const x = point.x * canvas.width;
      const y = point.y * canvas.height;

      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    /*
     * Highlight important facial points.
     */

    const importantPoints = [
      10, 33, 61, 152, 199, 263, 291,
    ];

    ctx.strokeStyle = "rgba(167, 139, 250, 0.95)";
    ctx.lineWidth = 2;

    for (const index of importantPoints) {
      const point = landmarks[index];

      if (!point) {
        continue;
      }

      const x = point.x * canvas.width;
      const y = point.y * canvas.height;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [video, result]);

  if (!video) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{
        transform: "scaleX(-1)",
      }}
    />
  );
}