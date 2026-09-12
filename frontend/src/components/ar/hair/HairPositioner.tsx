"use client";

import { useEffect, useRef, useState } from "react";
import type { FaceGeometry } from "../tracking/FaceGeometry";

export interface HairPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  opacity: number;
}

interface HairPositionerProps {
  geometry: FaceGeometry | null;
  onPosition?: (position: HairPosition | null) => void;
  smoothing?: number;
}

function lerp(
  current: number,
  target: number,
  amount: number
) {
  return current + (target - current) * amount;
}

export default function HairPositioner({
  geometry,
  onPosition,
  smoothing = 0.18,
}: HairPositionerProps) {
  const [position, setPosition] =
    useState<HairPosition | null>(null);

  const previousRef =
    useRef<HairPosition | null>(null);

  useEffect(() => {
    if (!geometry || !geometry.detected) {
      previousRef.current = null;
      setPosition(null);
      onPosition?.(null);
      return;
    }

    /*
     * -------------------------------------------------------
     * TARGET POSITION
     * -------------------------------------------------------
     *
     * The hairstyle is anchored slightly above
     * the forehead.
     */

    const targetX = geometry.foreheadX;

    const targetY =
      geometry.foreheadY -
      geometry.faceHeight * 0.22;

    /*
     * Hair should be wider than the face.
     */

    const targetWidth =
      geometry.faceWidth * 1.35;

    const targetHeight =
      geometry.faceHeight * 0.85;

    /*
     * Follow head roll.
     */

    const targetRotation =
      geometry.rotation.roll;

    /*
     * Reduce scale slightly when the face
     * turns strongly sideways.
     */

    const yaw =
      Math.abs(geometry.rotation.yaw);

    const targetScale =
      Math.max(
        0.72,
        1 - yaw / 220
      );

    const targetOpacity = 0.95;

    const target: HairPosition = {
      x: targetX,
      y: targetY,
      width: targetWidth,
      height: targetHeight,
      rotation: targetRotation,
      scale: targetScale,
      opacity: targetOpacity,
    };

    /*
     * -------------------------------------------------------
     * SMOOTHING
     * -------------------------------------------------------
     *
     * MediaPipe landmarks can move slightly
     * from frame to frame.
     *
     * Interpolation prevents the hairstyle
     * from shaking.
     */

    const previous = previousRef.current;

    if (!previous) {
      previousRef.current = target;
      setPosition(target);
      onPosition?.(target);
      return;
    }

    const smoothed: HairPosition = {
      x: lerp(
        previous.x,
        target.x,
        smoothing
      ),

      y: lerp(
        previous.y,
        target.y,
        smoothing
      ),

      width: lerp(
        previous.width,
        target.width,
        smoothing
      ),

      height: lerp(
        previous.height,
        target.height,
        smoothing
      ),

      rotation: lerp(
        previous.rotation,
        target.rotation,
        smoothing
      ),

      scale: lerp(
        previous.scale,
        target.scale,
        smoothing
      ),

      opacity: lerp(
        previous.opacity,
        target.opacity,
        smoothing
      ),
    };

    previousRef.current = smoothed;

    setPosition(smoothed);
    onPosition?.(smoothed);
  }, [
    geometry,
    smoothing,
    onPosition,
  ]);

  /*
   * This component calculates the position.
   *
   * Rendering is intentionally handled by
   * HairOverlay2D.
   */

  return null;
}