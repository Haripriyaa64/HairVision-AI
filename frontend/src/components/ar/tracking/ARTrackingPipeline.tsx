"use client";

import {
  useCallback,
  useState,
} from "react";

import type {
  FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";

import FaceTracker from "./FaceTracker";

import {
  getFaceGeometry,
  type FaceGeometry,
} from "./FaceGeometry";

export interface ARTrackingResult {
  result: FaceLandmarkerResult | null;

  geometry: FaceGeometry | null;

  detected: boolean;
}

interface ARTrackingPipelineProps {
  video: HTMLVideoElement | null;

  onResults?: (
    result: FaceLandmarkerResult | null,
    geometry: FaceGeometry | null
  ) => void;
}

export default function ARTrackingPipeline({
  video,
  onResults,
}: ARTrackingPipelineProps) {
  const [geometry, setGeometry] =
    useState<FaceGeometry | null>(null);

  const handleResults = useCallback(
    (result: FaceLandmarkerResult) => {
      const landmarks =
        result.faceLandmarks?.[0];

      if (!landmarks) {
        setGeometry(null);

        onResults?.(
          result,
          null
        );

        return;
      }

      const newGeometry =
        getFaceGeometry(
          landmarks
        );

      setGeometry(
        newGeometry
      );

      onResults?.(
        result,
        newGeometry
      );
    },
    [onResults]
  );

  if (!video) {
    return null;
  }

  return (
    <>
      <FaceTracker
        video={video}
        onResults={handleResults}
      />

      {/*
       * Geometry is calculated here and
       * sent to the parent page.
       */}

      <div
        data-face-geometry={
          geometry
            ? "detected"
            : "searching"
        }
        className="hidden"
      />
    </>
  );
}