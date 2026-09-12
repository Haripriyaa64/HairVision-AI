"use client";

import type { CSSProperties } from "react";
import type { FaceGeometry } from "./FaceGeometry";

interface FaceGeometryOverlayProps {
  geometry: FaceGeometry | null;
  visible?: boolean;
}

export default function FaceGeometryOverlay({
  geometry,
  visible = true,
}: FaceGeometryOverlayProps) {
  if (!geometry || !visible) {
    return null;
  }

  const width = geometry.faceWidth * 1.22;
  const height = geometry.faceHeight * 1.28;

  const left =
    (geometry.centerX - width / 2) * 100;

  const top =
    (geometry.foreheadY -
      geometry.faceHeight * 0.08) *
    100;

  const style: CSSProperties = {
    position: "absolute",
    left: `${left}%`,
    top: `${top}%`,
    width: `${width * 100}%`,
    height: `${height * 100}%`,
    border: "2px solid rgba(167,139,250,0.95)",
    borderRadius: "48% 48% 44% 44%",
    boxShadow:
      "0 0 0 1px rgba(255,255,255,0.12), 0 0 22px rgba(139,92,246,0.38)",
    pointerEvents: "none",
    zIndex: 30,
    transform: "translateZ(0)",
    transition:
      "left 80ms linear, top 80ms linear, width 80ms linear, height 80ms linear",
  };

  return (
    <div style={style}>
      {/* Top tracking point */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "-7px",
          width: "14px",
          height: "14px",
          border:
            "2px solid rgba(255,255,255,0.95)",
          borderRadius: "50%",
          transform: "translateX(-50%)",
          background:
            "rgba(139,92,246,0.35)",
        }}
      />

      {/* Left ear point */}
      <div
        style={{
          position: "absolute",
          left: "-8px",
          top: "45%",
          width: "14px",
          height: "14px",
          border:
            "2px solid rgba(167,139,250,0.95)",
          borderRadius: "50%",
          background:
            "rgba(139,92,246,0.22)",
        }}
      />

      {/* Right ear point */}
      <div
        style={{
          position: "absolute",
          right: "-8px",
          top: "45%",
          width: "14px",
          height: "14px",
          border:
            "2px solid rgba(167,139,250,0.95)",
          borderRadius: "50%",
          background:
            "rgba(139,92,246,0.22)",
        }}
      />

      {/* Center tracking point */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "5px",
          height: "5px",
          borderRadius: "50%",
          background:
            "rgba(255,255,255,0.95)",
          transform:
            "translate(-50%, -50%)",
          boxShadow:
            "0 0 10px rgba(255,255,255,0.8)",
        }}
      />

      {/* Label */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: "-34px",
          transform: "translateX(-50%)",
          padding: "6px 12px",
          border:
            "1px solid rgba(255,255,255,0.12)",
          borderRadius: "999px",
          background:
            "rgba(5,5,8,0.72)",
          color:
            "rgba(255,255,255,0.8)",
          fontSize: "9px",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          backdropFilter: "blur(12px)",
        }}
      >
        Face locked
      </div>
    </div>
  );
}