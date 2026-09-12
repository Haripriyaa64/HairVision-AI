"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
} from "react";

import type { FaceGeometry } from "./tracking/FaceGeometry";

interface HairReplacementARProps {
  video: HTMLVideoElement | null;
  geometry: FaceGeometry | null;
  imageSrc: string | null;
  visible?: boolean;
  rotationDeg?: number;
  scale?: number;
  onError?: (message: string) => void;
}

/* ============================================================
   CONSTANTS
============================================================ */

const MIN_SCALE = 0.65;
const MAX_SCALE = 1.40;

const MIN_ROTATION = -35;
const MAX_ROTATION = 35;

/* ============================================================
   HELPERS
============================================================ */

function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

function safeNumber(
  value: number,
  fallback: number
): number {
  return Number.isFinite(value)
    ? value
    : fallback;
}

/* ============================================================
   HAIR REPLACEMENT AR
============================================================ */

export default function HairReplacementAR({
  video,
  geometry,
  imageSrc,
  visible = true,
  rotationDeg = 0,
  scale = 1,
  onError,
}: HairReplacementARProps) {
  /* ----------------------------------------------------------
     CANVAS
  ---------------------------------------------------------- */

  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null
    );

  /* ----------------------------------------------------------
     HAIR IMAGE
  ---------------------------------------------------------- */

  const hairImageRef =
    useRef<HTMLImageElement | null>(
      null
    );

  /* ----------------------------------------------------------
     ANIMATION
  ---------------------------------------------------------- */

  const animationFrameRef =
    useRef<number | null>(
      null
    );

  /* ----------------------------------------------------------
     IMAGE ERROR CONTROL
  ---------------------------------------------------------- */

  const imageErrorRef =
    useRef(false);

  /* ==========================================================
     LOAD SELECTED HAIRSTYLE
  ========================================================== */

  useEffect(() => {
    hairImageRef.current = null;
    imageErrorRef.current = false;

    if (!imageSrc) {
      return;
    }

    const image =
      new Image();

    /*
     * Same-origin hairstyle images work normally.
     * This also permits external images that provide CORS.
     */
    image.crossOrigin =
      "anonymous";

    image.onload = () => {
      hairImageRef.current =
        image;

      console.log(
        "HairVision AR: hairstyle loaded:",
        imageSrc
      );
    };

    image.onerror = () => {
      console.error(
        "HairVision AR: hairstyle image failed:",
        imageSrc
      );

      if (
        !imageErrorRef.current
      ) {
        imageErrorRef.current =
          true;

        onError?.(
          `Unable to load hairstyle image: ${imageSrc}`
        );
      }
    };

    image.src =
      imageSrc;

    return () => {
      image.onload = null;
      image.onerror = null;
      hairImageRef.current =
        null;
    };
  }, [
    imageSrc,
    onError,
  ]);

  /* ==========================================================
     LIVE AR RENDER LOOP
  ========================================================== */

  useEffect(() => {
    /*
     * IMPORTANT:
     *
     * Create stable NON-NULL local variables here.
     *
     * This is what prevents:
     *
     * "canvas is possibly null"
     * "video is possibly null"
     * "geometry is possibly null"
     */

    if (
      !visible ||
      video === null ||
      geometry === null
    ) {
      return;
    }

    const activeVideo: HTMLVideoElement =
      video;

    const activeGeometry: FaceGeometry =
      geometry;

    const outputCanvas =
      canvasRef.current;

    if (outputCanvas === null) {
      return;
    }

    const context =
      outputCanvas.getContext(
        "2d"
      );

    if (context === null) {
      onError?.(
        "Unable to create the Live Hair canvas."
      );

      return;
    }

    let stopped =
      false;

    /* ========================================================
       RENDER FRAME
    ======================================================== */

    const renderFrame =
      () => {
        if (stopped) {
          return;
        }

        /*
         * ----------------------------------------------------
         * CAMERA DIMENSIONS
         * ----------------------------------------------------
         */

        const videoWidth =
          activeVideo.videoWidth;

        const videoHeight =
          activeVideo.videoHeight;

        /*
         * Camera isn't ready yet.
         */
        if (
          videoWidth <= 0 ||
          videoHeight <= 0
        ) {
          animationFrameRef.current =
            requestAnimationFrame(
              renderFrame
            );

          return;
        }

        /*
         * ----------------------------------------------------
         * CANVAS SIZE
         * ----------------------------------------------------
         */

        if (
          outputCanvas.width !==
            videoWidth ||
          outputCanvas.height !==
            videoHeight
        ) {
          outputCanvas.width =
            videoWidth;

          outputCanvas.height =
            videoHeight;
        }

        /*
         * ----------------------------------------------------
         * CLEAR
         * ----------------------------------------------------
         */

        context.clearRect(
          0,
          0,
          outputCanvas.width,
          outputCanvas.height
        );

        /*
         * ----------------------------------------------------
         * DRAW MIRRORED CAMERA
         * ----------------------------------------------------
         *
         * Your front camera is displayed as a mirror.
         */

        context.save();

        context.translate(
          outputCanvas.width,
          0
        );

        context.scale(
          -1,
          1
        );

        context.drawImage(
          activeVideo,
          0,
          0,
          outputCanvas.width,
          outputCanvas.height
        );

        context.restore();

        /*
         * ----------------------------------------------------
         * SELECTED HAIR
         * ----------------------------------------------------
         */

        const hairImage =
          hairImageRef.current;

        if (hairImage === null) {
          animationFrameRef.current =
            requestAnimationFrame(
              renderFrame
            );

          return;
        }

        /*
         * ----------------------------------------------------
         * FACE POSITION
         * ----------------------------------------------------
         */

        /*
         * MediaPipe coordinates are normalized.
         *
         * The camera is mirrored, so X must be flipped.
         */

        const normalizedCenterX =
          safeNumber(
            activeGeometry.centerX,
            0.5
          );

        const normalizedForeheadY =
          safeNumber(
            activeGeometry.foreheadY,
            0.35
          );

        const normalizedFaceWidth =
          safeNumber(
            activeGeometry.faceWidth,
            0.30
          );

        const normalizedFaceHeight =
          safeNumber(
            activeGeometry.faceHeight,
            0.45
          );

        const centerX =
          (1 -
            normalizedCenterX) *
          outputCanvas.width;

        const foreheadY =
          normalizedForeheadY *
          outputCanvas.height;

        const faceWidth =
          Math.max(
            20,
            normalizedFaceWidth *
              outputCanvas.width
          );

        const faceHeight =
          Math.max(
            20,
            normalizedFaceHeight *
              outputCanvas.height
          );

        /*
         * ----------------------------------------------------
         * HAIR SCALE
         * ----------------------------------------------------
         */

        const safeScale =
          clamp(
            safeNumber(
              scale,
              1
            ),
            MIN_SCALE,
            MAX_SCALE
          );

        /*
         * Hair is intentionally wider than the face.
         */

        const hairWidth =
          faceWidth *
          1.72 *
          safeScale;

        /*
         * Preserve original hairstyle aspect ratio.
         */

        const naturalWidth =
          hairImage.naturalWidth ||
          hairImage.width ||
          1;

        const naturalHeight =
          hairImage.naturalHeight ||
          hairImage.height ||
          1;

        const aspectRatio =
          naturalHeight /
          naturalWidth;

        const hairHeight =
          hairWidth *
          aspectRatio;

        /*
         * ----------------------------------------------------
         * HAIR POSITION
         * ----------------------------------------------------
         */

        const hairTop =
          foreheadY -
          faceHeight *
            0.38 *
            safeScale;

        const hairLeft =
          centerX -
          hairWidth / 2;

        /*
         * ----------------------------------------------------
         * HEAD ROTATION
         * ----------------------------------------------------
         */

        const safeRotation =
          clamp(
            safeNumber(
              rotationDeg,
              0
            ),
            MIN_ROTATION,
            MAX_ROTATION
          );

        const rotationRadians =
          (safeRotation *
            Math.PI) /
          180;

        /*
         * ----------------------------------------------------
         * HAIR SHADOW
         * ----------------------------------------------------
         */

        context.save();

        context.translate(
          centerX,
          hairTop +
            hairHeight *
              0.78
        );

        context.rotate(
          rotationRadians
        );

        context.translate(
          -centerX,
          -(
            hairTop +
            hairHeight *
              0.78
          )
        );

        context.globalAlpha =
          0.18;

        context.filter =
          "blur(7px)";

        context.drawImage(
          hairImage,
          hairLeft + 3,
          hairTop + 5,
          hairWidth,
          hairHeight
        );

        context.restore();

        /*
         * ----------------------------------------------------
         * MAIN HAIRSTYLE
         * ----------------------------------------------------
         */

        context.save();

        context.translate(
          centerX,
          hairTop +
            hairHeight *
              0.78
        );

        context.rotate(
          rotationRadians
        );

        context.translate(
          -centerX,
          -(
            hairTop +
            hairHeight *
              0.78
          )
        );

        context.globalAlpha =
          0.98;

        context.filter =
          "none";

        context.imageSmoothingEnabled =
          true;

        context.imageSmoothingQuality =
          "high";

        context.drawImage(
          hairImage,
          hairLeft,
          hairTop,
          hairWidth,
          hairHeight
        );

        context.restore();

        /*
         * ----------------------------------------------------
         * HAIRLINE BLEND
         * ----------------------------------------------------
         *
         * Softens the lower edge of the hairstyle.
         */

        context.save();

        const blendGradient =
          context.createLinearGradient(
            centerX,
            foreheadY -
              faceHeight *
                0.22,
            centerX,
            foreheadY +
              faceHeight *
                0.12
          );

        blendGradient.addColorStop(
          0,
          "rgba(0,0,0,0)"
        );

        blendGradient.addColorStop(
          0.75,
          "rgba(0,0,0,0)"
        );

        blendGradient.addColorStop(
          1,
          "rgba(0,0,0,0.08)"
        );

        context.fillStyle =
          blendGradient;

        context.beginPath();

        context.ellipse(
          centerX,
          foreheadY,
          faceWidth *
            0.50,
          faceHeight *
            0.15,
          rotationRadians,
          0,
          Math.PI * 2
        );

        context.fill();

        context.restore();

        /*
         * ----------------------------------------------------
         * NEXT FRAME
         * ----------------------------------------------------
         */

        animationFrameRef.current =
          requestAnimationFrame(
            renderFrame
          );
      };

    /*
     * --------------------------------------------------------
     * START
     * --------------------------------------------------------
     */

    animationFrameRef.current =
      requestAnimationFrame(
        renderFrame
      );

    /*
     * --------------------------------------------------------
     * CLEANUP
     * --------------------------------------------------------
     */

    return () => {
      stopped = true;

      if (
        animationFrameRef.current !==
        null
      ) {
        cancelAnimationFrame(
          animationFrameRef.current
        );

        animationFrameRef.current =
          null;
      }

      context.clearRect(
        0,
        0,
        outputCanvas.width,
        outputCanvas.height
      );
    };
  }, [
    video,
    geometry,
    visible,
    rotationDeg,
    scale,
    imageSrc,
    onError,
  ]);

  /* ==========================================================
     RENDER
  ========================================================== */

  if (
    !visible ||
    video === null ||
    geometry === null
  ) {
    return null;
  }

  const canvasStyle:
    CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    pointerEvents: "none",
    userSelect: "none",
    zIndex: 30,
    display: "block",
  };

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={canvasStyle}
    />
  );
}