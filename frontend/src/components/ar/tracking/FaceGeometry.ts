"use client";

export interface FaceGeometry {
  centerX: number;
  centerY: number;

  faceWidth: number;
  faceHeight: number;

  foreheadY: number;

  leftEarX: number;
  leftEarY: number;

  rightEarX: number;
  rightEarY: number;

  chinY: number;

  detected: boolean;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function getFaceGeometry(
  landmarks: Array<{ x: number; y: number; z?: number }>
): FaceGeometry | null {
  if (!landmarks || landmarks.length < 468) {
    return null;
  }

  /*
   * MediaPipe Face Mesh landmarks
   *
   * 10  = forehead/top
   * 152 = chin
   * 234 = left side / ear region
   * 454 = right side / ear region
   * 33  = left eye outer region
   * 263 = right eye outer region
   */

  const forehead = landmarks[10];
  const chin = landmarks[152];

  const leftSide = landmarks[234];
  const rightSide = landmarks[454];

  if (
    !forehead ||
    !chin ||
    !leftSide ||
    !rightSide
  ) {
    return null;
  }

  const centerX =
    (leftSide.x + rightSide.x) / 2;

  const centerY =
    (forehead.y + chin.y) / 2;

  const faceWidth =
    Math.abs(rightSide.x - leftSide.x);

  const faceHeight =
    Math.abs(chin.y - forehead.y);

  /*
   * Because the camera preview is mirrored,
   * the overlay will mirror automatically through
   * CSS transform.
   */

  return {
    centerX: clamp(centerX, 0, 1),
    centerY: clamp(centerY, 0, 1),

    faceWidth: clamp(faceWidth, 0.05, 0.9),
    faceHeight: clamp(faceHeight, 0.05, 0.9),

    foreheadY: clamp(forehead.y, 0, 1),

    leftEarX: clamp(leftSide.x, 0, 1),
    leftEarY: clamp(leftSide.y, 0, 1),

    rightEarX: clamp(rightSide.x, 0, 1),
    rightEarY: clamp(rightSide.y, 0, 1),

    chinY: clamp(chin.y, 0, 1),

    detected: true,
  };
}