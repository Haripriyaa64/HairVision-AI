"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";

interface HairOcclusionProps {
  scene: THREE.Scene | null;
  result: FaceLandmarkerResult | null;
  enabled?: boolean;
}

export default function HairOcclusion({
  scene,
  result,
  enabled = true,
}: HairOcclusionProps) {
  const occluderRef =
    useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!scene || !result || !enabled) {
      return;
    }

    if (
      !result.faceLandmarks ||
      result.faceLandmarks.length === 0
    ) {
      return;
    }

    const landmarks =
      result.faceLandmarks[0];

    /*
     * -------------------------------------------------------
     * FACE BOUNDARY
     * -------------------------------------------------------
     */

    const indices = [
      10,
      338,
      297,
      332,
      284,
      251,
      389,
      356,
      454,
      323,
      361,
      288,
      397,
      365,
      379,
      378,
      400,
      377,
      152,
      148,
      176,
      149,
      150,
      136,
      172,
      58,
      132,
      93,
      234,
      127,
      162,
      21,
      54,
      103,
      67,
      109,
    ];

    /*
     * -------------------------------------------------------
     * CREATE 3D FACE OCCLUDER
     * -------------------------------------------------------
     *
     * This is intentionally a lightweight approximate
     * occlusion surface.
     */

    const shape =
      new THREE.Shape();

    const first =
      landmarks[indices[0]];

    if (!first) {
      return;
    }

    /*
     * Convert MediaPipe normalized coordinates
     * into a local 3D coordinate system.
     */

    const convertX = (x: number) =>
      (x - 0.5) * 2;

    const convertY = (y: number) =>
      -(y - 0.5) * 2;

    shape.moveTo(
      convertX(first.x),
      convertY(first.y)
    );

    for (
      let i = 1;
      i < indices.length;
      i++
    ) {
      const point =
        landmarks[indices[i]];

      if (!point) {
        continue;
      }

      shape.lineTo(
        convertX(point.x),
        convertY(point.y)
      );
    }

    shape.closePath();

    /*
     * -------------------------------------------------------
     * GEOMETRY
     * -------------------------------------------------------
     */

    const geometry =
      new THREE.ShapeGeometry(
        shape
      );

    /*
     * -------------------------------------------------------
     * OCCLUDER MATERIAL
     * -------------------------------------------------------
     *
     * ColorWrite is disabled so the surface
     * doesn't visibly cover the camera.
     *
     * It only participates in depth testing.
     */

    const material =
      new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthWrite: true,
        depthTest: true,
        side: THREE.DoubleSide,
      });

    const occluder =
      new THREE.Mesh(
        geometry,
        material
      );

    occluder.name =
      "HairVisionFaceOccluder";

    occluder.position.set(
      0,
      0,
      0.15
    );

    occluder.renderOrder = 1;

    occluderRef.current =
      occluder;

    scene.add(occluder);

    /*
     * -------------------------------------------------------
     * CLEANUP
     * -------------------------------------------------------
     */

    return () => {
      if (
        occluderRef.current
      ) {
        scene.remove(
          occluderRef.current
        );

        occluderRef.current.geometry.dispose();

        const material =
          occluderRef.current
            .material;

        if (
          Array.isArray(material)
        ) {
          material.forEach(
            (item) =>
              item.dispose()
          );
        } else {
          material.dispose();
        }

        occluderRef.current =
          null;
      }
    };
  }, [
    scene,
    result,
    enabled,
  ]);

  return null;
}