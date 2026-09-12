"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

import * as THREE from "three";

export interface HairSceneHandle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

interface HairSceneProps {
  className?: string;
}

const HairScene = forwardRef<
  HairSceneHandle,
  HairSceneProps
>(function HairScene(
  { className = "" },
  ref
) {
  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const sceneRef =
    useRef<THREE.Scene | null>(null);

  const cameraRef =
    useRef<THREE.PerspectiveCamera | null>(null);

  const rendererRef =
    useRef<THREE.WebGLRenderer | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      scene: sceneRef.current!,
      camera: cameraRef.current!,
      renderer: rendererRef.current!,
    }),
    []
  );

  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    /*
     * -------------------------------------------------------
     * SCENE
     * -------------------------------------------------------
     */

    const scene = new THREE.Scene();

    sceneRef.current = scene;

    /*
     * -------------------------------------------------------
     * CAMERA
     * -------------------------------------------------------
     *
     * Perspective camera gives us a natural
     * 3D viewing perspective.
     */

    const camera =
      new THREE.PerspectiveCamera(
        45,
        1,
        0.01,
        100
      );

    camera.position.set(
      0,
      0,
      5
    );

    camera.lookAt(
      0,
      0,
      0
    );

    cameraRef.current = camera;

    /*
     * -------------------------------------------------------
     * RENDERER
     * -------------------------------------------------------
     */

    const renderer =
      new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });

    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        2
      )
    );

    renderer.setClearColor(
      0x000000,
      0
    );

    renderer.outputColorSpace =
      THREE.SRGBColorSpace;

    renderer.toneMapping =
      THREE.ACESFilmicToneMapping;

    renderer.toneMappingExposure = 1;

    renderer.domElement.style.display =
      "block";

    renderer.domElement.style.width =
      "100%";

    renderer.domElement.style.height =
      "100%";

    renderer.domElement.style.pointerEvents =
      "none";

    container.appendChild(
      renderer.domElement
    );

    rendererRef.current =
      renderer;

    /*
     * -------------------------------------------------------
     * LIGHTING
     * -------------------------------------------------------
     */

    const ambientLight =
      new THREE.AmbientLight(
        0xffffff,
        1.2
      );

    ambientLight.userData.hairVisionLight =
      true;

    scene.add(ambientLight);

    const keyLight =
      new THREE.DirectionalLight(
        0xffffff,
        1.5
      );

    keyLight.position.set(
      2,
      3,
      4
    );

    keyLight.userData.hairVisionLight =
      true;

    scene.add(keyLight);

    const fillLight =
      new THREE.DirectionalLight(
        0xffffff,
        0.6
      );

    fillLight.position.set(
      -3,
      1,
      2
    );

    fillLight.userData.hairVisionLight =
      true;

    scene.add(fillLight);

    const rimLight =
      new THREE.DirectionalLight(
        0xffffff,
        0.8
      );

    rimLight.position.set(
      0,
      3,
      -4
    );

    rimLight.userData.hairVisionLight =
      true;

    scene.add(rimLight);

    /*
     * -------------------------------------------------------
     * RESIZE
     * -------------------------------------------------------
     */

    const resize = () => {
      const width =
        container.clientWidth;

      const height =
        container.clientHeight;

      if (
        width <= 0 ||
        height <= 0
      ) {
        return;
      }

      camera.aspect =
        width / height;

      camera.updateProjectionMatrix();

      renderer.setSize(
        width,
        height,
        false
      );
    };

    resize();

    const resizeObserver =
      new ResizeObserver(resize);

    resizeObserver.observe(
      container
    );

    /*
     * -------------------------------------------------------
     * RENDER LOOP
     * -------------------------------------------------------
     */

    let animationFrame = 0;

    const render = () => {
      animationFrame =
        requestAnimationFrame(
          render
        );

      renderer.render(
        scene,
        camera
      );
    };

    render();

    /*
     * -------------------------------------------------------
     * CLEANUP
     * -------------------------------------------------------
     */

    return () => {
      cancelAnimationFrame(
        animationFrame
      );

      resizeObserver.disconnect();

      /*
       * Dispose scene resources.
       */

      scene.traverse(
        (
          object: THREE.Object3D
        ) => {
          const mesh =
            object as THREE.Mesh;

          if (
            mesh.geometry
          ) {
            mesh.geometry.dispose();
          }

          if (
            mesh.material
          ) {
            const material =
              mesh.material;

            if (
              Array.isArray(
                material
              )
            ) {
              material.forEach(
                (item) =>
                  item.dispose()
              );
            } else {
              material.dispose();
            }
          }
        }
      );

      renderer.dispose();

      if (
        renderer.domElement.parentElement ===
        container
      ) {
        container.removeChild(
          renderer.domElement
        );
      }

      sceneRef.current =
        null;

      cameraRef.current =
        null;

      rendererRef.current =
        null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 ${className}`}
      aria-hidden="true"
    />
  );
});

HairScene.displayName =
  "HairScene";

export default HairScene;