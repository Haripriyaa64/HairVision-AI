"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
} from "react";

import type { FaceGeometry } from "./tracking/FaceGeometry";

interface HairOverlay2DProps {
  geometry: FaceGeometry | null;
  imageSrc: string | null;

  /*
   * Live head tilt.
   * Comes from MediaPipe face landmarks.
   */
  rotationDeg?: number;

  /*
   * Additional live scale multiplier.
   */
  scale?: number;

  visible?: boolean;

  onImageError?: () => void;
}

export default function HairOverlay2D({
  geometry,
  imageSrc,
  rotationDeg = 0,
  scale = 1,
  visible = true,
  onImageError,
}: HairOverlay2DProps) {
  const [loaded, setLoaded] =
    useState(false);

  /*
   * When hairstyle changes,
   * hide it until the new image loads.
   */
  useEffect(() => {
    setLoaded(false);
  }, [imageSrc]);

  /*
   * Nothing to render until we have:
   *
   * - face
   * - hairstyle
   * - visibility
   */
  if (
    !geometry ||
    !imageSrc ||
    !visible
  ) {
    return null;
  }

  /*
   * ============================================================
   * LIVE HAIR SIZE
   * ============================================================
   *
   * Base size comes from the current face dimensions.
   *
   * scale is supplied by the AR page and can change
   * continuously as the face moves closer/farther.
   */

  const safeScale = Math.max(
    0.65,
    Math.min(1.35, scale)
  );

  const hairWidth =
    geometry.faceWidth *
    1.72 *
    safeScale;

  const hairHeight =
    geometry.faceHeight *
    1.15 *
    safeScale;

  /*
   * ============================================================
   * MIRRORED CAMERA
   * ============================================================
   *
   * The video is rendered with:
   *
   * scale-x-[-1]
   *
   * Therefore the tracked X coordinate must also be mirrored.
   */

  const mirroredCenterX =
    1 - geometry.centerX;

  /*
   * ============================================================
   * LIVE POSITION
   * ============================================================
   */

  const left =
    (mirroredCenterX -
      hairWidth / 2) *
    100;

  /*
   * Move the hair slightly above the forehead.
   *
   * This keeps the hairstyle sitting on top
   * of the detected face rather than covering
   * the eyes/nose area.
   */

  const top =
    (
      geometry.foreheadY -
      geometry.faceHeight *
        0.34 *
        safeScale
    ) * 100;

  const width =
    hairWidth * 100;

  const height =
    hairHeight * 100;

  /*
   * ============================================================
   * LIVE ROTATION
   * ============================================================
   *
   * MediaPipe gives us the current head tilt.
   *
   * Clamp the value so temporary landmark noise
   * cannot make the hairstyle rotate wildly.
   */

  const safeRotation =
    Math.max(
      -35,
      Math.min(
        35,
        rotationDeg
      )
    );

  /*
   * ============================================================
   * HAIR STYLE
   * ============================================================
   */

  const style: CSSProperties = {
    position: "absolute",

    left: `${left}%`,

    top: `${top}%`,

    width: `${width}%`,

    height: `${height}%`,

    objectFit: "contain",

    pointerEvents: "none",

    userSelect: "none",

    zIndex: 20,

    /*
     * Do not display the image until
     * the selected hairstyle has loaded.
     */
    opacity: loaded ? 0.96 : 0,

    /*
     * ========================================================
     * LIVE TRANSFORM
     * ========================================================
     *
     * rotate()
     *    → follows head tilt
     *
     * translateZ()
     *    → promotes the element to a composited layer
     */

    transform: `
      translateZ(0)
      rotate(${safeRotation}deg)
    `,

    /*
     * Rotate around the lower-middle portion
     * of the hairstyle so it behaves more naturally
     * around the forehead/head area.
     */

    transformOrigin:
      "center 78%",

    /*
     * Tell the browser these properties
     * are changing continuously.
     */

    willChange:
      "left, top, width, height, transform",

    /*
     * Small smoothing prevents the hair from
     * visibly jumping between MediaPipe frames.
     */

    transition: [
      "left 70ms linear",
      "top 70ms linear",
      "width 70ms linear",
      "height 70ms linear",
      "transform 70ms linear",
      "opacity 120ms ease",
    ].join(","),
  };

  return (
    <img
      src={imageSrc}
      alt=""
      aria-hidden="true"
      draggable={false}
      style={style}
      onLoad={() => {
        setLoaded(true);
      }}
      onError={() => {
        setLoaded(false);
        onImageError?.();
      }}
    />
  );
}