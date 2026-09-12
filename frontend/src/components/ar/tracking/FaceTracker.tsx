"use client";

import { useEffect, useRef, useState } from "react";

import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";

interface FaceTrackerProps {
  video: HTMLVideoElement | null;
  onResults?: (result: FaceLandmarkerResult) => void;
}

export default function FaceTracker({
  video,
  onResults,
}: FaceTrackerProps) {
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);

  const [ready, setReady] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================
  // INITIALIZE MEDIAPIPE
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        setError(null);
        setReady(false);

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
        );

        if (cancelled) {
          return;
        }

        const landmarker = await FaceLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "GPU",
            },

            runningMode: "VIDEO",

            numFaces: 1,

            minFaceDetectionConfidence: 0.5,

            minFacePresenceConfidence: 0.5,

            minTrackingConfidence: 0.5,

            outputFaceBlendshapes: false,

            outputFacialTransformationMatrixes: true,
          }
        );

        if (cancelled) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;

        setReady(true);

        console.log("HairVision Face Landmarker ready");
      } catch (err) {
        console.error("MediaPipe initialization error:", err);

        if (!cancelled) {
          setError("Unable to initialize face tracking.");
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  // ============================================================
  // REAL-TIME FACE DETECTION
  // ============================================================

  useEffect(() => {
    if (!ready || !video) {
      return;
    }

    let stopped = false;

    function scheduleNextFrame() {
      if (!stopped) {
        animationFrameRef.current =
          requestAnimationFrame(detectFace);
      }
    }

    function detectFace() {
      if (stopped) {
        return;
      }

      const landmarker = landmarkerRef.current;

      if (!landmarker) {
        scheduleNextFrame();
        return;
      }

      if (
        video.readyState <
        HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        scheduleNextFrame();
        return;
      }

      if (
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {
        scheduleNextFrame();
        return;
      }

      const currentVideo = video;

if (!currentVideo) {
  scheduleNextFrame();
  return;
}

if (
  currentVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
  currentVideo.videoWidth === 0 ||
  currentVideo.videoHeight === 0
) {
  scheduleNextFrame();
  return;
}

const currentTime = currentVideo.currentTime;

if (currentTime !== lastVideoTimeRef.current) {
  lastVideoTimeRef.current = currentTime;

  try {
    const result = landmarker.detectForVideo(
      currentVideo,
      performance.now()
    );

          const hasFace =
            result.faceLandmarks.length > 0;

          setTracking(hasFace);

          onResults?.(result);
        } catch (err) {
          console.error("Face detection error:", err);

          console.error("Video state:", {
            readyState: currentVideo.readyState,
            videoWidth: currentVideo.videoWidth,
            videoHeight: currentVideo.videoHeight,
            currentTime: currentVideo.currentTime,
          });
        }
      }

      scheduleNextFrame();
    }

    animationFrameRef.current =
      requestAnimationFrame(detectFace);

    return () => {
      stopped = true;

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(
          animationFrameRef.current
        );

        animationFrameRef.current = null;
      }
    };
  }, [ready, video, onResults]);

  // ============================================================
  // UI
  // ============================================================

  if (error) {
    return (
      <div className="absolute left-1/2 top-5 z-30 -translate-x-1/2 rounded-full border border-red-400/20 bg-black/70 px-4 py-2 text-[10px] text-red-300 backdrop-blur-xl">
        {error}
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="absolute left-1/2 top-5 z-30 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-[10px] text-white/60 backdrop-blur-xl">
        Loading face tracking...
      </div>
    );
  }

  return (
    <div className="absolute right-5 top-5 z-30 flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-2 text-[10px] text-white/70 backdrop-blur-xl">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          tracking
            ? "animate-pulse bg-emerald-400"
            : "bg-yellow-400"
        }`}
      />

      {tracking
        ? "Face tracked"
        : "Looking for face"}
    </div>
  );
}