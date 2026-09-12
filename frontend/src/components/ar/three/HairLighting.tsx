"use client";

import { useEffect } from "react";
import * as THREE from "three";

interface HairLightingProps {
  scene: THREE.Scene;
}

export default function HairLighting({
  scene,
}: HairLightingProps) {
  useEffect(() => {
    /*
     * Remove lights previously created
     * by HairVision.
     */

    const existingLights = scene.children.filter(
      (child: THREE.Object3D) =>
        child.userData.hairVisionLight === true
    );

    existingLights.forEach(
      (light: THREE.Object3D) => {
        scene.remove(light);
      }
    );

    /*
     * Main key light
     */

    const keyLight =
      new THREE.DirectionalLight(
        0xffffff,
        1.8
      );

    keyLight.position.set(
      0,
      2,
      4
    );

    keyLight.userData.hairVisionLight = true;

    scene.add(keyLight);

    /*
     * Front fill light
     */

    const fillLight =
      new THREE.DirectionalLight(
        0xffffff,
        0.8
      );

    fillLight.position.set(
      -3,
      1,
      2
    );

    fillLight.userData.hairVisionLight = true;

    scene.add(fillLight);

    /*
     * Back / rim light
     */

    const rimLight =
      new THREE.DirectionalLight(
        0xffffff,
        1.1
      );

    rimLight.position.set(
      2,
      3,
      -3
    );

    rimLight.userData.hairVisionLight = true;

    scene.add(rimLight);

    /*
     * Ambient light
     */

    const ambientLight =
      new THREE.AmbientLight(
        0xffffff,
        0.65
      );

    ambientLight.userData.hairVisionLight = true;

    scene.add(ambientLight);

    /*
     * Cleanup when component unmounts.
     */

    return () => {
      const lightsToRemove =
        scene.children.filter(
          (child: THREE.Object3D) =>
            child.userData.hairVisionLight === true
        );

      lightsToRemove.forEach(
        (light: THREE.Object3D) => {
          scene.remove(light);
        }
      );
    };
  }, [scene]);

  return null;
}