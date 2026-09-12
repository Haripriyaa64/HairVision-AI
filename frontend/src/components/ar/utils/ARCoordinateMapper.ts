export interface ARPoint {
  x: number;
  y: number;
}

export interface ARSize {
  width: number;
  height: number;
}

/**
 * Converts normalized MediaPipe coordinates (0–1)
 * into camera/display pixel coordinates.
 */
export function normalizedToPixels(
  point: ARPoint,
  size: ARSize
): ARPoint {
  return {
    x: point.x * size.width,
    y: point.y * size.height,
  };
}

/**
 * Converts camera/display pixel coordinates
 * back into normalized coordinates (0–1).
 */
export function pixelsToNormalized(
  point: ARPoint,
  size: ARSize
): ARPoint {
  if (size.width <= 0 || size.height <= 0) {
    return {
      x: 0,
      y: 0,
    };
  }

  return {
    x: point.x / size.width,
    y: point.y / size.height,
  };
}

/**
 * Maps a normalized face position to a percentage
 * position suitable for CSS absolute positioning.
 */
export function normalizedToPercent(
  point: ARPoint
): ARPoint {
  return {
    x: point.x * 100,
    y: point.y * 100,
  };
}

/**
 * Calculates the distance between two normalized points.
 */
export function distance(
  a: ARPoint,
  b: ARPoint
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Linear interpolation used for smooth AR movement.
 */
export function lerp(
  current: number,
  target: number,
  amount = 0.25
): number {
  const t = Math.max(0, Math.min(1, amount));

  return current + (target - current) * t;
}

/**
 * Smoothly interpolates two AR points.
 */
export function lerpPoint(
  current: ARPoint,
  target: ARPoint,
  amount = 0.25
): ARPoint {
  return {
    x: lerp(current.x, target.x, amount),
    y: lerp(current.y, target.y, amount),
  };
}

/**
 * Keeps an AR value inside a safe range.
 */
export function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Converts radians to degrees.
 */
export function radiansToDegrees(
  radians: number
): number {
  return (radians * 180) / Math.PI;
}

/**
 * Converts degrees to radians.
 */
export function degreesToRadians(
  degrees: number
): number {
  return (degrees * Math.PI) / 180;
}