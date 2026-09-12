"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import HairReplacementAR from "@/components/ar/HairReplacementAR";

import {
  ArrowLeft,
  Camera,
  Check,
  Loader2,
  RefreshCw,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";

import FaceTracker from "@/components/ar/tracking/FaceTracker";
import FacePlacementGuide from "@/components/ar/FacePlacementGuide";
import HairOverlay2D from "@/components/ar/HairOverlay2D";

import {
  analyzeFace,
  getHealth,
  getRecommendations,
  type AnalyzeResponse,
  type FaceShape,
  type Gender,
  type HairstyleRecommendation,
} from "@/lib/api";

import {
  getFaceGeometry,
  type FaceGeometry,
} from "@/components/ar/tracking/FaceGeometry";

/* ============================================================
   TYPES
============================================================ */

type CameraStatus =
  | "idle"
  | "starting"
  | "active"
  | "stopped"
  | "error";

/* ============================================================
   CONSTANTS
============================================================ */

const FACE_SHAPES: FaceShape[] = [
  "heart",
  "oblong",
  "oval",
  "round",
  "square",
];

const GENDER_OPTIONS: Array<{
  value: Gender;
  label: string;
}> = [
  {
    value: "men",
    label: "Men",
  },
  {
    value: "women",
    label: "Women",
  },
];

/*
 * Existing HairVision hairstyle filename fixes.
 */
const STYLE_IMAGE_OVERRIDES: Record<string, string> = {
  "men-curly-top": "men-curly-textured-top.png",

  "men-side-part": "men-classic-side-part.png",

  "men-curly-textured-top":
    "men-curly-textured-top.png",
};

/* ============================================================
   HELPERS
============================================================ */

function isFaceShape(
  value: unknown
): value is FaceShape {
  return (
    typeof value === "string" &&
    FACE_SHAPES.includes(
      value as FaceShape
    )
  );
}

function getStyleImage(
  style: HairstyleRecommendation
): string {
  if (
    STYLE_IMAGE_OVERRIDES[style.id]
  ) {
    return `/hairstyles/${STYLE_IMAGE_OVERRIDES[style.id]}`;
  }

  const extended =
    style as HairstyleRecommendation & {
      image?: string;
      image_path?: string;
      reference_image?: string;
      filename?: string;
    };

  const value =
    extended.image ||
    extended.image_path ||
    extended.reference_image ||
    extended.filename;

  if (!value) {
    return `/hairstyles/${style.id}.png`;
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  if (value.startsWith("/")) {
    return value;
  }

  if (value.startsWith("hairstyles/")) {
    return `/${value}`;
  }

  return `/hairstyles/${value}`;
}

function getStyleDescription(
  style: HairstyleRecommendation
): string {
  const extended =
    style as HairstyleRecommendation & {
      description?: string;
    };

  return (
    extended.description ||
    "Recommended for your face shape."
  );
}

/*
 * Supports both:
 *
 * [
 *   {...},
 *   {...}
 * ]
 *
 * and:
 *
 * {
 *   recommendations: [...]
 * }
 *
 * This makes the AR page robust against backend
 * response-shape differences.
 */
function normalizeRecommendations(
  value: unknown
): HairstyleRecommendation[] {
  if (Array.isArray(value)) {
    return value as HairstyleRecommendation[];
  }

  if (
    value &&
    typeof value === "object"
  ) {
    const payload = value as {
      recommendations?: unknown;
      styles?: unknown;
    };

    if (
      Array.isArray(
        payload.recommendations
      )
    ) {
      return payload.recommendations as HairstyleRecommendation[];
    }

    if (
      Array.isArray(payload.styles)
    ) {
      return payload.styles as HairstyleRecommendation[];
    }
  }

  return [];
}

/*
 * Calculate the visible roll angle of the face.
 *
 * MediaPipe landmark 33  = left eye
 * MediaPipe landmark 263 = right eye
 *
 * This gives us the tilt of the head.
 */
function calculateFaceRotation(
  landmarks: Array<{
    x: number;
    y: number;
    z?: number;
  }>
): number {
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];

  if (!leftEye || !rightEye) {
    return 0;
  }

  const dx =
    rightEye.x - leftEye.x;

  const dy =
    rightEye.y - leftEye.y;

  const radians =
    Math.atan2(dy, dx);

  const degrees =
    (radians * 180) / Math.PI;

  /*
   * The camera is mirrored in the UI,
   * so invert the visual roll.
   */
  const rotation = -degrees;

  /*
   * Prevent extreme rotation caused by
   * temporary landmark noise.
   */
  return Math.max(
    -35,
    Math.min(35, rotation)
  );
}

/* ============================================================
   PAGE
============================================================ */

export default function ARTryOnPage() {
  const searchParams =
    useSearchParams();

  const requestedStyleId =
    searchParams.get("style");

  const requestedStyleName =
    searchParams.get("name");

  /* ==========================================================
     CAMERA STATE
  ========================================================== */

  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const [
    cameraStatus,
    setCameraStatus,
  ] = useState<CameraStatus>("idle");

  const [
    videoElement,
    setVideoElement,
  ] =
    useState<HTMLVideoElement | null>(
      null
    );

  /* ==========================================================
     TRACKING
  ========================================================== */

  const [
    faceDetected,
    setFaceDetected,
  ] = useState(false);

  const [
    faceAligned,
    setFaceAligned,
  ] = useState(false);

  const [
    faceGeometry,
    setFaceGeometry,
  ] =
    useState<FaceGeometry | null>(
      null
    );

  /*
   * LIVE HEAD ROLL
   *
   * This is updated continuously from
   * MediaPipe landmarks.
   */
  const [
    faceRotation,
    setFaceRotation,
  ] = useState(0);

  /* ==========================================================
     AI
  ========================================================== */

  const [
    gender,
    setGender,
  ] = useState<Gender>("men");

  const [
    analysis,
    setAnalysis,
  ] =
    useState<AnalyzeResponse | null>(
      null
    );

  const [
    recommendations,
    setRecommendations,
  ] =
    useState<
      HairstyleRecommendation[]
    >([]);

  const [
    selectedStyle,
    setSelectedStyle,
  ] =
    useState<
      HairstyleRecommendation | null
    >(null);

  const [
    analyzing,
    setAnalyzing,
  ] = useState(false);

  /* ==========================================================
     BACKEND
  ========================================================== */

  const [
    apiConnected,
    setApiConnected,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  /* ==========================================================
     CONTROL REFS
  ========================================================== */

  const stableFramesRef =
    useRef(0);

  const analysisRunningRef =
    useRef(false);

  const analysisCompleteRef =
    useRef(false);

  /* ==========================================================
     HEALTH CHECK
  ========================================================== */

  useEffect(() => {
    let cancelled = false;

    async function checkBackend() {
      try {
        await getHealth();

        if (!cancelled) {
          setApiConnected(true);
        }
      } catch {
        if (!cancelled) {
          setApiConnected(false);
        }
      }
    }

    void checkBackend();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ==========================================================
     FACE ALIGNMENT
  ========================================================== */

  const checkFaceAlignment =
    useCallback(
      (
        geometry: FaceGeometry | null
      ): boolean => {
        if (!geometry) {
          return false;
        }

        const horizontal =
          geometry.centerX >= 0.28 &&
          geometry.centerX <= 0.72;

        const vertical =
          geometry.centerY >= 0.25 &&
          geometry.centerY <= 0.75;

        const widthOK =
          geometry.faceWidth >= 0.18 &&
          geometry.faceWidth <= 0.65;

        const heightOK =
          geometry.faceHeight >= 0.30 &&
          geometry.faceHeight <= 0.80;

        return (
          horizontal &&
          vertical &&
          widthOK &&
          heightOK
        );
      },
      []
    );

  /* ==========================================================
     SELECT HAIRSTYLE
  ========================================================== */

  const handleStyleSelect =
    useCallback(
      (
        style: HairstyleRecommendation
      ) => {
        setSelectedStyle(style);
        setError(null);

        console.log(
          "HairVision AR: selected hairstyle:",
          style
        );
      },
      []
    );

  /* ==========================================================
     STOP CAMERA
  ========================================================== */

  const stopCamera =
    useCallback(() => {
      const stream =
        streamRef.current;

      if (stream) {
        stream
          .getTracks()
          .forEach((track) => {
            track.stop();
          });
      }

      streamRef.current = null;

      const video =
        videoRef.current;

      if (video) {
        video.pause();
        video.srcObject = null;
      }

      setVideoElement(null);

      setFaceDetected(false);
      setFaceAligned(false);
      setFaceGeometry(null);
      setFaceRotation(0);

      stableFramesRef.current = 0;

      analysisRunningRef.current =
        false;

      analysisCompleteRef.current =
        false;

      setCameraStatus("stopped");
    }, []);

  /* ==========================================================
     START CAMERA
  ========================================================== */

  const startCamera =
    useCallback(async () => {
      if (
        cameraStatus === "starting" ||
        cameraStatus === "active"
      ) {
        return;
      }

      setCameraStatus("starting");
      setError(null);

      try {
        if (
          typeof navigator ===
          "undefined"
        ) {
          throw new Error(
            "Camera is not available."
          );
        }

        if (
          !navigator.mediaDevices ||
          !navigator.mediaDevices
            .getUserMedia
        ) {
          throw new Error(
            "Your browser does not support camera access."
          );
        }

        /*
         * Stop old stream.
         */
        if (streamRef.current) {
          streamRef.current
            .getTracks()
            .forEach((track) => {
              track.stop();
            });

          streamRef.current = null;
        }

        /*
         * Front-facing camera.
         */
        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: {
                facingMode: {
                  ideal: "user",
                },

                width: {
                  ideal: 1280,
                },

                height: {
                  ideal: 720,
                },

                frameRate: {
                  ideal: 30,
                  max: 60,
                },
              },

              audio: false,
            }
          );

        const video =
          videoRef.current;

        if (!video) {
          stream
            .getTracks()
            .forEach((track) => {
              track.stop();
            });

          throw new Error(
            "Camera video element is unavailable."
          );
        }

        streamRef.current =
          stream;

        video.srcObject =
          stream;

        video.muted = true;

        video.playsInline = true;

        await video.play();

        setVideoElement(video);

        setCameraStatus("active");

        setFaceDetected(false);
        setFaceAligned(false);
        setFaceGeometry(null);
        setFaceRotation(0);

        setAnalysis(null);
        setRecommendations([]);
        setSelectedStyle(null);

        stableFramesRef.current = 0;

        analysisRunningRef.current =
          false;

        analysisCompleteRef.current =
          false;
      } catch (err) {
        console.error(
          "HairVision camera error:",
          err
        );

        setCameraStatus("error");

        setError(
          err instanceof Error
            ? err.message
            : "Unable to access the camera."
        );
      }
    }, [cameraStatus]);

  /* ==========================================================
     CLEANUP CAMERA
  ========================================================== */

  useEffect(() => {
    return () => {
      const stream =
        streamRef.current;

      if (stream) {
        stream
          .getTracks()
          .forEach((track) => {
            track.stop();
          });
      }

      streamRef.current = null;
    };
  }, []);

  /* ==========================================================
     CAPTURE FRAME
  ========================================================== */

  const captureFrame =
    useCallback(
      async (): Promise<File | null> => {
        const video =
          videoRef.current;

        if (!video) {
          return null;
        }

        if (
          video.readyState <
          HTMLMediaElement.HAVE_CURRENT_DATA
        ) {
          return null;
        }

        const width =
          video.videoWidth;

        const height =
          video.videoHeight;

        if (!width || !height) {
          return null;
        }

        const canvas =
          document.createElement(
            "canvas"
          );

        canvas.width = width;
        canvas.height = height;

        const context =
          canvas.getContext("2d");

        if (!context) {
          return null;
        }

        /*
         * Backend receives raw camera frame.
         * UI overlays are NOT captured.
         */
        context.drawImage(
          video,
          0,
          0,
          width,
          height
        );

        const blob =
          await new Promise<Blob | null>(
            (resolve) => {
              canvas.toBlob(
                (result) => {
                  resolve(result);
                },
                "image/jpeg",
                0.92
              );
            }
          );

        if (!blob) {
          return null;
        }

        return new File(
          [blob],
          "hairvision-ar-face.jpg",
          {
            type: "image/jpeg",
          }
        );
      },
      []
    );

  /* ==========================================================
     ANALYZE FACE
  ========================================================== */

  const analyzeCurrentFace =
    useCallback(async () => {
      if (
        analysisRunningRef.current
      ) {
        return;
      }

      if (
        analysisCompleteRef.current
      ) {
        return;
      }

      analysisRunningRef.current =
        true;

      setAnalyzing(true);
      setError(null);

      try {
        console.log(
          "HairVision AR: capturing frame..."
        );

        const imageFile =
          await captureFrame();

        if (!imageFile) {
          throw new Error(
            "Unable to capture the camera frame."
          );
        }

        console.log(
          "HairVision AR: sending frame to face AI..."
        );

        /*
         * EXISTING HAIRVISION FACE AI
         */
        const result =
          await analyzeFace(
            imageFile
          );

        console.log(
          "HairVision AR face analysis:",
          result
        );

        if (!result) {
          throw new Error(
            "Face analysis returned no result."
          );
        }

        if (
          !isFaceShape(
            result.face_shape
          )
        ) {
          throw new Error(
            "The AI could not determine the face shape."
          );
        }

        setAnalysis(result);

        console.log(
          "HairVision AR: loading recommendations..."
        );

        /*
         * EXISTING RECOMMENDATION ENGINE
         */
        const recommendationResult =
          await getRecommendations(
            result.face_shape,
            gender,
            8
          );

        const styles =
          normalizeRecommendations(
            recommendationResult
          );

        console.log(
          "HairVision recommendations:",
          styles
        );

        setRecommendations(styles);

        /*
         * If the user opened AR from
         * an existing hairstyle card,
         * select that style automatically.
         */
        if (requestedStyleId) {
          const requested =
            styles.find(
              (style) =>
                style.id ===
                requestedStyleId
            );

          if (requested) {
            setSelectedStyle(
              requested
            );
          } else if (
            styles.length > 0
          ) {
            setSelectedStyle(
              styles[0]
            );
          }
        } else if (
          styles.length > 0
        ) {
          /*
           * Do not automatically select
           * a hairstyle when entering AR.
           *
           * User chooses.
           */
          setSelectedStyle(null);
        }

        analysisCompleteRef.current =
          true;
      } catch (err) {
        console.error(
          "HairVision AR analysis failed:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to analyze your face."
        );

        analysisCompleteRef.current =
          false;
      } finally {
        analysisRunningRef.current =
          false;

        setAnalyzing(false);
      }
    }, [
      captureFrame,
      gender,
      requestedStyleId,
    ]);

  /* ==========================================================
     FACE TRACKER
  ========================================================== */

  const handleFaceResults =
    useCallback(
      (
        result: FaceLandmarkerResult
      ) => {
        const landmarks =
          result.faceLandmarks?.[0];

        const detected =
          Boolean(landmarks);

        setFaceDetected(
          detected
        );

        /*
         * ------------------------------------------------------
         * NO FACE
         * ------------------------------------------------------
         */

        if (!landmarks) {
          setFaceAligned(false);
          setFaceGeometry(null);
          setFaceRotation(0);

          stableFramesRef.current = 0;

          return;
        }

        /*
         * ------------------------------------------------------
         * FACE GEOMETRY
         * ------------------------------------------------------
         */

        const geometry =
          getFaceGeometry(
            landmarks
          );

        if (!geometry) {
          setFaceAligned(false);
          setFaceGeometry(null);
          setFaceRotation(0);

          stableFramesRef.current = 0;

          return;
        }

        /*
         * This is the live position/size
         * data used by HairOverlay2D.
         */
        setFaceGeometry(
          geometry
        );

        /*
         * ------------------------------------------------------
         * LIVE FACE ROTATION
         * ------------------------------------------------------
         */

        const rotation =
          calculateFaceRotation(
            landmarks
          );

        setFaceRotation(
          rotation
        );

        /*
         * ------------------------------------------------------
         * FACE ALIGNMENT
         * ------------------------------------------------------
         */

        const aligned =
          checkFaceAlignment(
            geometry
          );

        setFaceAligned(
          aligned
        );

        /*
         * ------------------------------------------------------
         * FACE NOT ALIGNED
         * ------------------------------------------------------
         */

        if (!aligned) {
          stableFramesRef.current = 0;
          return;
        }

        /*
         * ------------------------------------------------------
         * STABLE FACE DETECTION
         * ------------------------------------------------------
         */

        stableFramesRef.current += 1;

        /*
         * About 18 frames ~= 0.6 sec
         * at 30 FPS.
         */
        if (
          stableFramesRef.current >=
            18 &&
          !analysisCompleteRef.current &&
          !analysisRunningRef.current
        ) {
          void analyzeCurrentFace();
        }
      },
      [
        checkFaceAlignment,
        analyzeCurrentFace,
      ]
    );

  /* ==========================================================
     CHANGE CATEGORY
  ========================================================== */

  const handleGenderChange =
    useCallback(
      async (
        nextGender: Gender
      ) => {
        setGender(
          nextGender
        );

        setSelectedStyle(
          null
        );

        setError(null);

        if (
          !analysis?.face_shape
        ) {
          return;
        }

        setAnalyzing(true);

        try {
          const recommendationResult =
            await getRecommendations(
              analysis.face_shape,
              nextGender,
              8
            );

          const styles =
            normalizeRecommendations(
              recommendationResult
            );

          setRecommendations(
            styles
          );
        } catch (err) {
          console.error(
            "Recommendation refresh failed:",
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : "Unable to update recommendations."
          );
        } finally {
          setAnalyzing(
            false
          );
        }
      },
      [analysis]
    );

  /* ==========================================================
     RESET ANALYSIS
  ========================================================== */

  const resetAnalysis =
    useCallback(() => {
      setAnalysis(null);

      setRecommendations([]);

      setSelectedStyle(null);

      setError(null);

      stableFramesRef.current = 0;

      analysisRunningRef.current =
        false;

      analysisCompleteRef.current =
        false;
    }, []);

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070708] text-white">

      {/* ======================================================
          BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none fixed inset-0">

        <div className="absolute left-1/2 top-[-300px] h-[650px] w-[650px] -translate-x-1/2 rounded-full bg-violet-600/[0.08] blur-[150px]" />

        <div className="absolute bottom-[-300px] left-[-200px] h-[550px] w-[550px] rounded-full bg-fuchsia-500/[0.06] blur-[150px]" />

        <div className="absolute right-[-220px] top-1/3 h-[500px] w-[500px] rounded-full bg-blue-500/[0.05] blur-[150px]" />

        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
            backgroundSize:
              "70px 70px",
          }}
        />
      </div>

      {/* ======================================================
          NAVIGATION
      ====================================================== */}

      <nav className="relative z-50 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-10">

        <Link
          href="/"
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]">
            <Wand2
              size={18}
              className="text-white/75"
            />
          </div>

          <div>
            <div className="text-[15px] font-semibold tracking-tight">
              HairVision{" "}
              <span className="text-white/35">
                AI
              </span>
            </div>

            <div className="text-[9px] uppercase tracking-[0.25em] text-white/25">
              Real-time hair intelligence
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">

          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[9px] uppercase tracking-[0.15em] text-white/40 sm:flex">

            <span
              className={[
                "h-1.5 w-1.5 rounded-full",
                apiConnected
                  ? "bg-emerald-400"
                  : "bg-red-400",
              ].join(" ")}
            />

            {apiConnected
              ? "AI Online"
              : "AI Offline"}
          </div>

          <Link
            href="/"
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[10px] text-white/50 transition hover:border-white/20 hover:text-white"
          >
            <ArrowLeft size={13} />
            Back
          </Link>

        </div>
      </nav>

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-24 pt-7 lg:px-10 lg:pt-10">

        {/* HERO */}

        <div className="mx-auto max-w-4xl text-center">

          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/15 bg-violet-500/[0.06] px-4 py-2 text-[9px] uppercase tracking-[0.2em] text-violet-200/70">
            <Sparkles size={12} />
            Real-time AI AR
          </div>

          <h1 className="text-4xl font-semibold leading-[0.95] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
            See your next
            <span className="block text-white/35">
              hairstyle live.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-white/35">
            Start your camera, place your face inside
            the fixed guide, let HairVision analyze your
            face shape, then select a hairstyle to preview
            it in real time.
          </p>

        </div>

        {/* ==================================================
            CATEGORY
        ================================================== */}

        <div className="mx-auto mt-7 flex max-w-5xl justify-center">

          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.025] p-1.5">

            <div className="hidden px-3 text-[9px] uppercase tracking-[0.15em] text-white/25 sm:block">
              Style category
            </div>

            {GENDER_OPTIONS.map(
              (option) => {
                const active =
                  gender ===
                  option.value;

                return (
                  <button
                    key={
                      option.value
                    }
                    type="button"
                    onClick={() =>
                      void handleGenderChange(
                        option.value
                      )
                    }
                    className={[
                      "rounded-full px-6 py-2.5 text-xs font-medium transition",
                      active
                        ? "bg-white text-black"
                        : "text-white/35 hover:text-white",
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                );
              }
            )}

          </div>
        </div>

        {/* ==================================================
            CAMERA
        ================================================== */}

        <div className="mx-auto mt-8 max-w-5xl">

          <div className="overflow-hidden rounded-[30px] border border-white/10 bg-black shadow-2xl">

            {/* CAMERA HEADER */}

            <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-5 py-4">

              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-white/80">
                  <Camera size={14} />
                  AR Camera
                </div>

                <div className="mt-1 text-[9px] uppercase tracking-[0.16em] text-white/25">
                  Face tracking + live hairstyle
                </div>
              </div>

              <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.12em] text-white/35">

                <span
                  className={[
                    "h-1.5 w-1.5 rounded-full",
                    cameraStatus ===
                    "active"
                      ? "bg-emerald-400"
                      : "bg-white/20",
                  ].join(" ")}
                />

                {cameraStatus ===
                "active"
                  ? "Live"
                  : "Ready"}

              </div>
            </div>

            {/* CAMERA VIEW */}

            <div className="relative aspect-video overflow-hidden bg-black">

              {/* REAL VIDEO */}

              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="absolute inset-0 h-full w-full scale-x-[-1] object-cover"
              />

              {/* TRACKER */}

              {videoElement &&
                cameraStatus ===
                  "active" && (
                  <FaceTracker
                    video={
                      videoElement
                    }
                    onResults={
                      handleFaceResults
                    }
                  />
                )}

              {/* FIXED GUIDE */}

              {cameraStatus ===
                "active" && (
                <FacePlacementGuide
                  faceDetected={
                    faceDetected
                  }
                  faceAligned={
                    faceAligned
                  }
                />
              )}

             {/* =================================================
    LIVE HAIR TRANSFORMATION
================================================= */}

{cameraStatus === "active" &&
  faceAligned &&
  selectedStyle &&
  faceGeometry &&
  videoElement && (
    <HairReplacementAR
      video={videoElement}
      geometry={faceGeometry}
      imageSrc={getStyleImage(selectedStyle)}
      visible={true}
      rotationDeg={faceRotation}
      scale={Math.max(
        0.82,
        Math.min(
          1.18,
          faceGeometry.faceWidth / 0.30
        )
      )}
      onError={(message) => {
        setError(message);
      }}
    />
  )}
              {/* START CAMERA */}

              {cameraStatus !==
                "active" &&
                cameraStatus !==
                  "starting" && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#08080b]">

                  <div className="mx-auto max-w-md px-6 text-center">

                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-violet-400/20 bg-violet-500/[0.08]">
                      <Camera
                        size={26}
                        className="text-violet-300"
                      />
                    </div>

                    <h2 className="text-lg font-medium text-white/90">
                      Start AR Camera
                    </h2>

                    <p className="mt-2 text-xs leading-5 text-white/35">
                      Your camera will be used for
                      real-time face tracking and
                      hairstyle preview.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        void startCamera()
                      }
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-xs font-semibold text-black shadow-xl transition hover:bg-white/90"
                    >
                      <Camera
                        size={15}
                      />
                      Start Camera
                    </button>

                    {cameraStatus ===
                      "error" &&
                      error && (
                        <div className="mt-4 rounded-xl border border-red-400/15 bg-red-500/[0.05] px-4 py-3 text-[10px] leading-5 text-red-200/65">
                          {error}
                        </div>
                      )}

                  </div>
                </div>
              )}

              {/* STARTING */}

              {cameraStatus ===
                "starting" && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#08080b]">

                  <div className="text-center">

                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-violet-400/20 bg-violet-500/[0.08]">
                      <Loader2
                        size={20}
                        className="animate-spin text-violet-300"
                      />
                    </div>

                    <div className="text-xs text-white/70">
                      Starting camera...
                    </div>

                    <div className="mt-1 text-[10px] text-white/30">
                      Please allow camera access.
                    </div>

                  </div>
                </div>
              )}

              {/* STATUS BADGES */}

              {cameraStatus ===
                "active" && (
                <>
                  <div className="pointer-events-none absolute left-4 top-4 z-40 rounded-full border border-white/10 bg-black/60 px-3 py-2 text-[9px] uppercase tracking-[0.13em] text-white/60 backdrop-blur-xl">

                    <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />

                    Camera active
                  </div>

                  <div className="pointer-events-none absolute right-4 top-4 z-40 rounded-full border border-white/10 bg-black/60 px-3 py-2 text-[9px] uppercase tracking-[0.13em] text-white/60 backdrop-blur-xl">
                    {faceDetected
                      ? "Face detected"
                      : "Searching"}
                  </div>

                  {/* LIVE TRANSFORM STATUS */}

                  {selectedStyle &&
                    faceAligned && (
                      <div className="pointer-events-none absolute bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-violet-400/20 bg-black/65 px-4 py-2 text-[9px] uppercase tracking-[0.14em] text-violet-200/75 backdrop-blur-xl">

                        <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />

                        Live hair tracking
                      </div>
                    )}
                </>
              )}

              {/* ANALYZING */}

              {analyzing && (
                <div className="pointer-events-none absolute inset-x-0 bottom-5 z-[60] flex justify-center">

                  <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/75 px-5 py-3 text-xs text-white/70 shadow-2xl backdrop-blur-xl">

                    <Loader2
                      size={15}
                      className="animate-spin"
                    />

                    Analyzing face and finding hairstyles...

                  </div>
                </div>
              )}

            </div>

            {/* CAMERA CONTROLS */}

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.06] bg-white/[0.015] px-5 py-4">

              <div className="flex items-center gap-3">

                <div
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-full border",
                    faceAligned
                      ? "border-violet-400/25 bg-violet-500/[0.08]"
                      : "border-white/10 bg-white/[0.03]",
                  ].join(" ")}
                >
                  {faceAligned ? (
                    <Check
                      size={15}
                      className="text-violet-300"
                    />
                  ) : (
                    <Camera
                      size={15}
                      className="text-white/30"
                    />
                  )}
                </div>

                <div>

                  <div className="text-xs text-white/70">

                    {cameraStatus !==
                    "active"
                      ? "Camera not started"
                      : faceAligned
                        ? "Face correctly positioned"
                        : faceDetected
                          ? "Move your face into the guide"
                          : "Place your face inside the guide"}

                  </div>

                  <div className="mt-1 text-[9px] text-white/25">

                    {analysis
                      ? `Detected ${analysis.face_shape} face shape`
                      : "Waiting for face analysis"}

                  </div>

                </div>
              </div>

              {cameraStatus ===
                "active" && (
                <div className="flex items-center gap-2">

                  {analysis && (
                    <button
                      type="button"
                      onClick={
                        resetAnalysis
                      }
                      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[9px] text-white/50 transition hover:border-white/20 hover:text-white"
                    >
                      <RefreshCw
                        size={12}
                      />
                      Re-analyze
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={
                      stopCamera
                    }
                    className="rounded-full border border-red-400/15 bg-red-500/[0.05] px-4 py-2.5 text-[9px] text-red-200/60 transition hover:bg-red-500/[0.1] hover:text-red-200"
                  >
                    Stop Camera
                  </button>

                </div>
              )}

            </div>

          </div>
        </div>

        {/* ==================================================
            ERROR
        ================================================== */}

        {error &&
          cameraStatus ===
            "active" && (
          <div className="mx-auto mt-4 flex max-w-5xl items-start gap-3 rounded-2xl border border-red-400/10 bg-red-500/[0.05] px-5 py-4">

            <X
              size={15}
              className="mt-0.5 shrink-0 text-red-300"
            />

            <div className="text-[10px] leading-5 text-red-200/60">
              {error}
            </div>

          </div>
        )}

        {/* ==================================================
            ANALYSIS RESULT
        ================================================== */}

        {analysis && (
          <section className="mx-auto mt-8 max-w-5xl">

            <div className="rounded-[26px] border border-white/10 bg-white/[0.025] p-5">

              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-center gap-4">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05]">

                    <Check
                      size={18}
                      className="text-emerald-300"
                    />

                  </div>

                  <div>

                    <div className="text-[9px] uppercase tracking-[0.18em] text-white/25">
                      Face shape detected
                    </div>

                    <div className="mt-1 text-2xl font-semibold capitalize tracking-[-0.03em]">
                      {analysis.face_shape}
                    </div>

                  </div>
                </div>

                <div className="flex items-center gap-5">

                  {typeof analysis.confidence ===
                    "number" && (
                    <div className="text-right">

                      <div className="text-[9px] uppercase tracking-[0.18em] text-white/25">
                        Confidence
                      </div>

                      <div className="mt-1 text-sm text-white/75">
                        {Math.round(
                          analysis.confidence *
                            100
                        )}
                        %
                      </div>

                    </div>
                  )}

                  <div className="h-8 w-px bg-white/10" />

                  <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/20 p-1">

                    {GENDER_OPTIONS.map(
                      (option) => (
                        <button
                          key={
                            option.value
                          }
                          type="button"
                          onClick={() =>
                            void handleGenderChange(
                              option.value
                            )
                          }
                          className={[
                            "rounded-full px-4 py-2 text-[9px] transition",
                            gender ===
                            option.value
                              ? "bg-white text-black"
                              : "text-white/35 hover:text-white",
                          ].join(" ")}
                        >
                          {
                            option.label
                          }
                        </button>
                      )
                    )}

                  </div>

                </div>

              </div>
            </div>
          </section>
        )}

        {/* ==================================================
            RECOMMENDATIONS
        ================================================== */}

        {analysis && (
          <section className="mx-auto mt-9 max-w-6xl">

            <div className="mb-5 flex items-end justify-between">

              <div>

                <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-violet-300/55">
                  <Sparkles
                    size={12}
                  />
                  Personalized recommendations
                </div>

                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Styles picked for you
                </h2>

                <p className="mt-1 text-xs text-white/30">
                  Based on your{" "}
                  <span className="capitalize text-white/60">
                    {
                      analysis.face_shape
                    }
                  </span>{" "}
                  face shape.
                </p>

              </div>

              <div className="text-[10px] text-white/30">
                {
                  recommendations.length
                }{" "}
                styles
              </div>

            </div>

            {analyzing &&
            recommendations.length ===
              0 ? (

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                {Array.from({
                  length: 8,
                }).map(
                  (_, index) => (
                    <div
                      key={
                        index
                      }
                      className="h-[260px] animate-pulse rounded-[22px] border border-white/[0.06] bg-white/[0.025]"
                    />
                  )
                )}

              </div>

            ) : recommendations.length >
              0 ? (

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                {recommendations.map(
                  (style) => {

                    const selected =
                      selectedStyle?.id ===
                      style.id;

                    const image =
                      getStyleImage(
                        style
                      );

                    return (
                      <button
                        key={
                          style.id
                        }
                        type="button"
                        onClick={() =>
                          handleStyleSelect(
                            style
                          )
                        }
                        className={[
                          "group overflow-hidden rounded-[22px] border text-left transition-all duration-200",
                          selected
                            ? "border-violet-400/35 bg-violet-500/[0.08] shadow-[0_0_30px_rgba(139,92,246,0.08)]"
                            : "border-white/[0.08] bg-white/[0.025] hover:-translate-y-1 hover:border-white/15",
                        ].join(" ")}
                      >

                        {/* IMAGE */}

                        <div className="relative aspect-[4/3] overflow-hidden bg-[#111114]">

                          <img
                            src={
                              image
                            }
                            alt={
                              style.name
                            }
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            onError={(
                              event
                            ) => {
                              event.currentTarget.style.display =
                                "none";
                            }}
                          />

                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#08080b] via-transparent to-black/10" />

                          <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[8px] uppercase tracking-[0.12em] text-white/50 backdrop-blur-xl">
                            AR Style
                          </div>

                          {selected && (
                            <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-violet-500 shadow-lg">

                              <Check
                                size={13}
                              />

                            </div>
                          )}

                        </div>

                        {/* INFORMATION */}

                        <div className="p-4">

                          <div className="flex items-start justify-between gap-3">

                            <div>

                              <h3 className="text-sm font-semibold text-white/90">
                                {
                                  style.name
                                }
                              </h3>

                              <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-white/25">
                                {style.gender ===
                                "men"
                                  ? "Men"
                                  : "Women"}
                              </p>

                            </div>

                            <div
                              className={[
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                                selected
                                  ? "border-violet-400/20 bg-violet-500/10"
                                  : "border-white/10 bg-white/[0.03]",
                              ].join(
                                " "
                              )}
                            >

                              <Sparkles
                                size={
                                  12
                                }
                                className={
                                  selected
                                    ? "text-violet-300"
                                    : "text-white/25"
                                }
                              />

                            </div>

                          </div>

                          <p className="mt-3 line-clamp-2 text-[10px] leading-5 text-white/30">
                            {getStyleDescription(
                              style
                            )}
                          </p>

                          <div className="mt-4 flex items-center justify-between">

                            <div className="flex flex-wrap gap-1">

                              {style.tags
                                ?.slice(
                                  0,
                                  2
                                )
                                .map(
                                  (
                                    tag
                                  ) => (
                                    <span
                                      key={
                                        tag
                                      }
                                      className="rounded-full border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[8px] capitalize text-white/30"
                                    >
                                      {
                                        tag
                                      }
                                    </span>
                                  )
                                )}

                            </div>

                            <span className="text-[8px] uppercase tracking-[0.12em] text-violet-300/50">
                              {selected
                                ? "Selected"
                                : "Try style"}
                            </span>

                          </div>
                        </div>

                      </button>
                    );
                  }
                )}

              </div>

            ) : (

              <div className="rounded-[22px] border border-white/10 bg-white/[0.025] p-10 text-center">

                <Sparkles
                  size={20}
                  className="mx-auto mb-3 text-white/20"
                />

                <div className="text-sm text-white/50">
                  No recommendations found.
                </div>

                <div className="mt-1 text-[10px] text-white/25">
                  Try switching between Men and
                  Women.
                </div>

              </div>

            )}

          </section>
        )}

        {/* ==================================================
            LIVE STYLE STATUS
        ================================================== */}

        {selectedStyle && (
          <section className="mx-auto mt-8 max-w-5xl">

            <div className="rounded-[24px] border border-violet-400/20 bg-violet-500/[0.05] p-5">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-center gap-4">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/[0.08]">

                    <Wand2
                      size={17}
                      className="text-violet-300"
                    />

                  </div>

                  <div>

                    <div className="text-[9px] uppercase tracking-[0.18em] text-violet-300/50">
                      Selected live hairstyle
                    </div>

                    <div className="mt-1 text-sm font-medium text-white/90">
                      {
                        selectedStyle.name
                      }
                    </div>

                    <div className="mt-1 text-[10px] text-white/30">
                      {faceAligned
                        ? "Live preview is following your face."
                        : "Position your face inside the guide to activate the preview."}
                    </div>

                  </div>

                </div>

                <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-emerald-300/70">

                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />

                  Live AR

                </div>

              </div>
            </div>
          </section>
        )}

        {/* ==================================================
            PIPELINE
        ================================================== */}

        <section className="mx-auto mt-8 max-w-5xl rounded-[24px] border border-white/[0.07] bg-white/[0.018] p-5">

          <div className="mb-5 text-[9px] uppercase tracking-[0.2em] text-white/25">
            HairVision product pipeline
          </div>

          <div className="grid gap-3 sm:grid-cols-5">

            <PipelineItem
              number="01"
              label="Camera"
              active={
                cameraStatus ===
                "active"
              }
            />

            <PipelineItem
              number="02"
              label="Face"
              active={
                faceDetected
              }
            />

            <PipelineItem
              number="03"
              label="Face Shape"
              active={
                Boolean(
                  analysis
                )
              }
            />

            <PipelineItem
              number="04"
              label="Recommendations"
              active={
                recommendations.length >
                0
              }
            />

            <PipelineItem
              number="05"
              label="Live Hair"
              active={
                Boolean(
                  selectedStyle &&
                  faceAligned
                )
              }
            />

          </div>
        </section>

        {/* ==================================================
            PRIVACY / INFO
        ================================================== */}

        <div className="mx-auto mt-5 max-w-5xl text-center text-[9px] leading-5 text-white/20">
          Camera access is controlled by your browser.
          HairVision uses the camera frame for the
          face-analysis workflow and does not draw the
          placement guide into the analysis image.
        </div>

      </section>
    </main>
  );
}

/* ============================================================
   PIPELINE ITEM
============================================================ */

function PipelineItem({
  number,
  label,
  active,
}: {
  number: string;
  label: string;
  active: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center gap-3 rounded-xl border px-3 py-3",
        active
          ? "border-emerald-400/15 bg-emerald-400/[0.035]"
          : "border-white/[0.06] bg-white/[0.015]",
      ].join(" ")}
    >

      <div
        className={[
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[8px]",
          active
            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
            : "border-white/10 text-white/25",
        ].join(" ")}
      >
        {active ? (
          <Check size={11} />
        ) : (
          number
        )}
      </div>

      <span
        className={[
          "text-[9px]",
          active
            ? "text-white/65"
            : "text-white/25",
        ].join(" ")}
      >
        {label}
      </span>

    </div>
  );
}