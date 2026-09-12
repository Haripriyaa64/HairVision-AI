"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

interface HairModelProps {
  scene: THREE.Scene;
  modelUrl: string | null;

  position?: {
    x?: number;
    y?: number;
    z?: number;
  };

  rotation?: {
    x?: number;
    y?: number;
    z?: number;
  };

  scale?: number;

  visible?: boolean;

  onLoaded?: (model: THREE.Group) => void;

  onError?: (error: unknown) => void;
}

export default function HairModel({
  scene,
  modelUrl,
  position = {},
  rotation = {},
  scale = 1,
  visible = true,
  onLoaded,
  onError,
}: HairModelProps) {
  const modelRef =
    useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!scene || !modelUrl) {
      return;
    }

    let cancelled = false;

    const loader = new GLTFLoader();

    /*
     * -------------------------------------------------------
     * LOAD GLB / GLTF MODEL
     * -------------------------------------------------------
     */

    loader.load(
      modelUrl,

      (gltf) => {
        if (cancelled) {
          return;
        }

        const model = gltf.scene;

        model.name = "HairVisionHairModel";

        /*
         * Position
         */

        model.position.set(
          position.x ?? 0,
          position.y ?? 0,
          position.z ?? 0
        );

        /*
         * Rotation
         */

        model.rotation.set(
          THREE.MathUtils.degToRad(
            rotation.x ?? 0
          ),
          THREE.MathUtils.degToRad(
            rotation.y ?? 0
          ),
          THREE.MathUtils.degToRad(
            rotation.z ?? 0
          )
        );

        /*
         * Scale
         */

        model.scale.setScalar(scale);

        /*
         * Visibility
         */

        model.visible = visible;

        /*
         * Prepare meshes.
         */

        model.traverse(
          (object: THREE.Object3D) => {
            if (
              object instanceof THREE.Mesh
            ) {
              object.castShadow = false;
              object.receiveShadow = false;

              object.frustumCulled = false;
            }
          }
        );

        /*
         * Add to scene.
         */

        scene.add(model);

        modelRef.current = model;

        onLoaded?.(model);
      },

      /*
       * Loading progress
       */

      undefined,

      /*
       * Loading error
       */

      (error) => {
        if (cancelled) {
          return;
        }

        console.error(
          "HairVision: Failed to load hairstyle model:",
          modelUrl,
          error
        );

        onError?.(error);
      }
    );

    /*
     * Cleanup.
     */

    return () => {
      cancelled = true;

      const model =
        modelRef.current;

      if (!model) {
        return;
      }

      /*
       * Remove model from scene.
       */

      scene.remove(model);

      /*
       * Dispose geometries
       * and materials.
       */

      model.traverse(
        (object: THREE.Object3D) => {
          if (
            object instanceof THREE.Mesh
          ) {
            object.geometry.dispose();

            const material =
              object.material;

            if (
              Array.isArray(material)
            ) {
              material.forEach(
                (item) => {
                  item.dispose();
                }
              );
            } else {
              material.dispose();
            }
          }
        }
      );

      modelRef.current = null;
    };
  }, [
    scene,
    modelUrl,
    position.x,
    position.y,
    position.z,
    rotation.x,
    rotation.y,
    rotation.z,
    scale,
    visible,
    onLoaded,
    onError,
  ]);

  /*
   * This component renders the model
   * directly into the Three.js scene.
   */

  return null;
}