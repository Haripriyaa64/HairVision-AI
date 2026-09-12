"use client";

import { useEffect } from "react";
import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";

export interface HeadPose {
  yaw: number;
  pitch: number;
  roll: number;

  centerX: number;
  centerY: number;

  faceWidth: number;
  faceHeight: number;

  detected: boolean;
}

interface HeadPoseTrackerProps {
  result: FaceLandmarkerResult | null;
  onPose?: (pose: HeadPose) => void;
}

/*
 * MediaPipe face landmark indexes used for
 * approximate head-pose estimation.
 */
const LANDMARKS = {
  nose: 1,

  forehead: 10,

  leftEyeOuter: 33,
  rightEyeOuter: 263,

  leftCheek: 234,
  rightCheek: 454,

  chin: 152,
};

/* ============================================================
   DISTANCE
============================================================ */

function distance(
  a: { x: number; y: number },
  b: { x: number; y: number }
) {
  return Math.sqrt(
    Math.pow(a.x - b.x, 2) +
      Math.pow(a.y - b.y, 2)
  );
}

/* ============================================================
   HEAD POSE TRACKER
============================================================ */

export default function HeadPoseTracker({
  result,
  onPose,
}: HeadPoseTrackerProps) {
  useEffect(() => {
    if (
      !result ||
      result.faceLandmarks.length === 0
    ) {
      onPose?.({
        yaw: 0,
        pitch: 0,
        roll: 0,
        centerX: 0.5,
        centerY: 0.5,
        faceWidth: 0,
        faceHeight: 0,
        detected: false,
      });

      return;
    }

    const landmarks =
      result.faceLandmarks[0];

    if (!landmarks) {
      return;
    }

    const nose =
      landmarks[LANDMARKS.nose];

    const forehead =
      landmarks[LANDMARKS.forehead];

    const leftEye =
      landmarks[LANDMARKS.leftEyeOuter];

    const rightEye =
      landmarks[LANDMARKS.rightEyeOuter];

    const leftCheek =
      landmarks[LANDMARKS.leftCheek];

    const rightCheek =
      landmarks[LANDMARKS.rightCheek];

    const chin =
      landmarks[LANDMARKS.chin];

    if (
      !nose ||
      !forehead ||
      !leftEye ||
      !rightEye ||
      !leftCheek ||
      !rightCheek ||
      !chin
    ) {
      return;
    }

    /* ========================================================
       FACE CENTER
    ======================================================== */

    const centerX =
      (leftCheek.x + rightCheek.x) / 2;

    const centerY =
      (forehead.y + chin.y) / 2;

    /* ========================================================
       FACE SIZE
    ======================================================== */

    const faceWidth = distance(
      leftCheek,
      rightCheek
    );

    const faceHeight = distance(
      forehead,
      chin
    );

    /* ========================================================
       ROLL
       
       Eye-line angle.
    ======================================================== */

    const dx =
      rightEye.x - leftEye.x;

    const dy =
      rightEye.y - leftEye.y;

    const roll =
      Math.atan2(dy, dx) *
      (180 / Math.PI);

    /* ========================================================
       YAW
       
       Estimate left/right rotation from
       nose position relative to cheek center.
    ======================================================== */

    const cheekCenterX =
      (leftCheek.x + rightCheek.x) / 2;

    const yawOffset =
      nose.x - cheekCenterX;

    const yaw =
      Math.max(
        -45,
        Math.min(
          45,
          (yawOffset /
            Math.max(faceWidth, 0.001)) *
            180
        )
      );

    /* ========================================================
       PITCH
       
       Estimate up/down head movement.
    ======================================================== */

    const faceTop =
      forehead.y;

    const faceBottom =
      chin.y;

    const faceMiddleY =
      (faceTop + faceBottom) / 2;

    const pitchOffset =
      nose.y - faceMiddleY;

    const pitch =
      Math.max(
        -35,
        Math.min(
          35,
          (pitchOffset /
            Math.max(faceHeight, 0.001)) *
            100
        )
      );

    /* ========================================================
       RESULT
    ======================================================== */

    const pose: HeadPose = {
      yaw,
      pitch,
      roll,

      centerX,
      centerY,

      faceWidth,
      faceHeight,

      detected: true,
    };

    onPose?.(pose);
  }, [result, onPose]);

  return null;
}