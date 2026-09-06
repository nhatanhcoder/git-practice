"use client";

/**
 * Three.js teacher carousel — ported from the prototype's
 * `frontend/src/components/home/ThreeTeacherCylinderStage.tsx`
 * (`Chinese UI test/ui-claude`), unchanged in geometry, lighting and easing.
 *
 * Port notes for Next.js 14:
 * - loaded via `next/dynamic` with `ssr: false` — WebGL and `three` never run on
 *   the server (see `student/landing/landing-view.tsx`);
 * - `three` is a client-only dependency (~600 KB) deliberately kept out of the
 *   server bundle.
 *
 * MOCK(student): mockup mode per docs/prompts/student-product/.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Teacher } from "./landing-data";

interface ThreeTeacherCylinderStageProps {
  teachers: Teacher[];
  rotationStep: number;
  setRotationStep: React.Dispatch<React.SetStateAction<number>>;
}

/**
 * WebGL cylinder stage: teacher portraits curved onto a CylinderGeometry
 * (radius = 2.12, thetaLength = 1.05 rad), rotating in one direction with
 * easing, soft lighting, raycaster clicks and touch swipes.
 */
export function ThreeTeacherCylinderStage({
  teachers,
  rotationStep,
  setRotationStep,
}: ThreeTeacherCylinderStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  const activeIdx = ((rotationStep % teachers.length) + teachers.length) % teachers.length;
  const activeTeacher = teachers[activeIdx];

  // Rotation state read instantly by the Three.js animation loop.
  const rotationStepRef = useRef(rotationStep);
  rotationStepRef.current = rotationStep;

  const next = useCallback(() => {
    setRotationStep((prev) => prev + 1);
  }, [setRotationStep]);

  const prev = useCallback(() => {
    setRotationStep((prev) => prev - 1);
  }, [setRotationStep]);

  const goTo = useCallback(
    (targetIdx: number) => {
      setRotationStep((prev) => {
        const currentIdx = ((prev % teachers.length) + teachers.length) % teachers.length;
        let diff = (targetIdx - currentIdx) % teachers.length;
        if (diff > teachers.length / 2) diff -= teachers.length;
        if (diff < -teachers.length / 2) diff += teachers.length;
        return prev + diff;
      });
    },
    [teachers.length, setRotationStep],
  );

  // Auto-play timer
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(next, 7500);
    return () => clearInterval(timer);
  }, [isPaused, next]);

  // Build and render the WebGL scene once per teacher list.
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let width = container.clientWidth || 480;
    let height = container.clientHeight || 520;
    // 1. Scene & camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    // Far enough to always see the whole portrait and both edges of the wheel.
    camera.position.set(0, 0.1, 7.35);
    camera.lookAt(0, 0, 0);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    // CSS keeps the stage size; the renderer only updates the drawing buffer so
    // the ResizeObserver cannot loop the canvas ever taller.
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
    mainLight.position.set(3, 4, 5);
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.9);
    rimLight.position.set(-3, 3, -3);
    scene.add(rimLight);

    // 4. Carousel group
    const carouselGroup = new THREE.Group();
    scene.add(carouselGroup);

    // 5. Curved cylinder geometry per portrait
    const radius = 2.12;
    const cylinderHeight = 3.28;
    const thetaLength = 1.05;
    const radialSegments = 64;

    const cylinderGeom = new THREE.CylinderGeometry(
      radius,
      radius,
      cylinderHeight,
      radialSegments,
      1,
      true,
      -thetaLength / 2,
      thetaLength,
    );

    // Load textures for the 4 teachers
    const textureLoader = new THREE.TextureLoader();
    const teacherMeshes: THREE.Mesh[] = [];

    teachers.forEach((teacher, idx) => {
      const texture = textureLoader.load(teacher.avatar);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;

      const mat = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.005,
        depthWrite: false,
        side: THREE.DoubleSide,
        roughness: 0.35,
        metalness: 0.05,
      });

      const mesh = new THREE.Mesh(cylinderGeom, mat);
      mesh.name = `teacher-${idx}`;
      mesh.userData = { index: idx };

      // Rotate each mesh 0° / 90° / 180° / 270° around Y.
      mesh.rotation.y = idx * (Math.PI / 2);
      carouselGroup.add(mesh);
      teacherMeshes.push(mesh);
    });

    // 6. Raycaster so the two flank teachers are directly clickable
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleCanvasClick = (event: MouseEvent) => {
      const rect = canvas!.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(teacherMeshes);

      if (intersects.length > 0) {
        const clickedIdx = intersects[0].object.userData.index as number;
        if (typeof clickedIdx === "number") {
          goTo(clickedIdx);
        }
      }
    };

    canvas.addEventListener("click", handleCanvasClick);

    // 8. Animation loop
    let animationFrameId = 0;
    let currentRotationY = -rotationStepRef.current * (Math.PI / 2);
    let targetRotationY = currentRotationY;
    const startedAt = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = (performance.now() - startedAt) / 1000;

      // Keep the target moving in one direction only.
      targetRotationY = -rotationStepRef.current * (Math.PI / 2);

      // Smooth easing
      currentRotationY += (targetRotationY - currentRotationY) * 0.065;
      carouselGroup.rotation.y = currentRotationY;

      // Very subtle float; the portrait base stays anchored.
      carouselGroup.position.y = -0.18 + Math.sin(elapsedTime * 1.2) * 0.018;

      // Fade the meshes by viewing angle
      teacherMeshes.forEach((mesh, idx) => {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        let angleDiff = (currentRotationY + idx * (Math.PI / 2)) % (Math.PI * 2);
        if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        const absDiff = Math.abs(angleDiff);
        if (absDiff < 0.35) {
          mat.opacity = 1.0;
          mat.roughness = 0.35;
        } else if (absDiff < 1.8) {
          mat.opacity = 0.55;
          mat.roughness = 0.55;
        } else {
          mat.opacity = 0.03;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newW = entry.contentRect.width;
        const newH = entry.contentRect.height;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH, false);
        }
      }
    });
    resizeObserver.observe(container);

    // 10. Touch swipe
    let touchStartX = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const dist = touchStartX - e.changedTouches[0].clientX;
      if (dist > 40) next();
      if (dist < -40) prev();
    };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: true });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      canvas.removeEventListener("click", handleCanvasClick);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchend", handleTouchEnd);

      // Dispose Three.js resources
      cylinderGeom.dispose();
      teacherMeshes.forEach((m) => {
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.map?.dispose();
        mat.dispose();
      });
      renderer.dispose();
    };
    // The scene is built once from the teacher list; rotationStep is read via a
    // ref. Rebuilding on the active teacher would snap the cylinder to its
    // target angle and lose the easing between teachers entirely.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachers, setRotationStep]);

  return (
    <div
      ref={containerRef}
      className="lp-teacher-3d-stage lp-three-stage"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          prev();
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          next();
        }
      }}
      tabIndex={0}
      role="region"
      aria-label="Sân khấu 3D WebGL chân dung đội ngũ giáo viên"
      style={
        {
          "--teacher-theme": activeTeacher.themeColor,
        } as React.CSSProperties
      }
    >
      {/* Backdrop glow */}
      <div className="lp-cylinder__ink-aura" aria-hidden="true" />

      {/* WebGL canvas */}
      <div className="lp-three-canvas-wrap">
        <canvas ref={canvasRef} className="lp-three-canvas" />
      </div>

      {/* Minimal controls: back, dots, next */}
      <div className="lp-teacher-3d__controls-simple">
        <button
          type="button"
          className="lp-cylinder__nav-btn"
          onClick={prev}
          aria-label="Giảng viên trước"
          title="Giảng viên trước"
        >
          <ChevronLeft size={22} />
        </button>

        <div className="lp-cylinder__dots" role="tablist" aria-label="Chỉ báo vị trí giảng viên">
          {teachers.map((t, idx) => {
            const isSelected = idx === activeIdx;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`lp-cylinder__dot ${isSelected ? "is-active" : ""}`}
                onClick={() => goTo(idx)}
                aria-label={`Chuyển tới ${t.nameVi}`}
              />
            );
          })}
        </div>

        <button
          type="button"
          className="lp-cylinder__nav-btn"
          onClick={next}
          aria-label="Giảng viên tiếp theo"
          title="Giảng viên tiếp theo"
        >
          <ChevronRight size={22} />
        </button>
      </div>
    </div>
  );
}
