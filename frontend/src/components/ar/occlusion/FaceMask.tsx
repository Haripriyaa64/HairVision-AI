"use client";

import { useEffect, useRef } from "react";
import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";

interface FaceMaskProps {
  video: HTMLVideoElement | null;
  result: FaceLandmarkerResult | null;
  opacity?: number;
}

export default function FaceMask({
  video,
  result,
  opacity = 0,
}: FaceMaskProps) {
  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !video || !result) {
      return;
    }

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    const faces = result.faceLandmarks;

    if (
      !faces ||
      faces.length === 0
    ) {
      return;
    }

    const landmarks = faces[0];

    /*
     * -------------------------------------------------------
     * FACE SILHOUETTE
     * -------------------------------------------------------
     *
     * These MediaPipe landmark indices form an
     * approximate outer face boundary.
     */

    const faceContour = [
      10,
      338,
      297,
      332,
      284,
      251,
      389,
      356,
      454,
      323,
      361,
      288,
      397,
      365,
      379,
      378,
      400,
      377,
      152,
      148,
      176,
      149,
      150,
      136,
      172,
      58,
      132,
      93,
      234,
      127,
      162,
      21,
      54,
      103,
      67,
      109,
    ];

    const first =
      landmarks[faceContour[0]];

    if (!first) {
      return;
    }

    /*
     * -------------------------------------------------------
     * BUILD FACE PATH
     * -------------------------------------------------------
     */

    ctx.beginPath();

    ctx.moveTo(
      first.x * canvas.width,
      first.y * canvas.height
    );

    for (
      let i = 1;
      i < faceContour.length;
      i++
    ) {
      const point =
        landmarks[faceContour[i]];

      if (!point) {
        continue;
      }

      ctx.lineTo(
        point.x * canvas.width,
        point.y * canvas.height
      );
    }

    ctx.closePath();

    /*
     * -------------------------------------------------------
     * MASK
     * -------------------------------------------------------
     *
     * At opacity 0 this is invisible.
     *
     * Later we can use the canvas as an actual
     * compositing mask.
     */

    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;

    ctx.fill();

    /*
     * -------------------------------------------------------
     * DEBUG OUTLINE
     * -------------------------------------------------------
     *
     * Keep this disabled by default.
     */

    if (opacity > 0) {
      ctx.strokeStyle =
        "rgba(167, 139, 250, 0.65)";

      ctx.lineWidth = 2;

      ctx.stroke();
    }
  }, [
    video,
    result,
    opacity,
  ]);

  if (!video || !result) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{
        transform: "scaleX(-1)",
      }}
      aria-hidden="true"
    />
  );
}