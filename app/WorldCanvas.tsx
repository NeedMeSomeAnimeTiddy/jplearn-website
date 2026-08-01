"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const SCENES = ["home", "path", "route", "play", "write", "tutor", "progress", "back", "final"] as const;

type FadeObject = THREE.Object3D & {
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material | THREE.Material[];
};

type WorldGroup = THREE.Group & {
  userData: {
    drift: number;
    tilt: number;
    index: number;
  };
};

function fadeMaterial(material: THREE.Material, opacity: number) {
  material.transparent = true;
  material.opacity = opacity;
  material.depthWrite = false;
  material.userData.worldOpacity = opacity;
}

function createMaterial(color: THREE.ColorRepresentation, opacity = 0.6, wireframe = false) {
  const material = new THREE.MeshBasicMaterial({ color, opacity, transparent: true, depthWrite: false, wireframe });
  fadeMaterial(material, opacity);
  return material;
}

function createLineMaterial(color: THREE.ColorRepresentation, opacity = 0.6) {
  const material = new THREE.LineBasicMaterial({ color, opacity, transparent: true, depthWrite: false });
  fadeMaterial(material, opacity);
  return material;
}

function addBackdrop(group: THREE.Group, color: THREE.ColorRepresentation, opacity = 0.3) {
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(32, 22), createMaterial(color, opacity));
  plane.position.set(0, 0, -11);
  group.add(plane);
}

function addParticles(group: THREE.Group, color: THREE.ColorRepresentation, count = 90, spread = 12, depth = 8) {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = ((index * 37) % 101) / 100 * spread - spread / 2;
    positions[index * 3 + 1] = ((index * 61) % 97) / 96 * spread * 0.65 - spread * 0.32;
    positions[index * 3 + 2] = -((index * 17) % 100) / 100 * depth - 1;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color, size: 0.055, opacity: 0.6, transparent: true, depthWrite: false, sizeAttenuation: true });
  fadeMaterial(material, 0.6);
  group.add(new THREE.Points(geometry, material));
}

function addRing(group: THREE.Group, color: THREE.ColorRepresentation, radius: number, position: [number, number, number], rotation: [number, number, number], opacity = 0.55) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.018, 8, 72), createMaterial(color, opacity, true));
  ring.position.set(...position);
  ring.rotation.set(...rotation);
  group.add(ring);
}

function addPaper(group: THREE.Group, color: THREE.ColorRepresentation, position: [number, number, number], scale: [number, number, number], rotation: [number, number, number], opacity = 0.62) {
  const card = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.09), createMaterial(color, opacity));
  card.position.set(...position);
  card.scale.set(...scale);
  card.rotation.set(...rotation);
  group.add(card);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(card.geometry), createLineMaterial("#fff6e8", Math.min(opacity * 0.8, 0.6)));
  edge.position.copy(card.position);
  edge.scale.copy(card.scale);
  edge.rotation.copy(card.rotation);
  group.add(edge);
}

function addGrid(group: THREE.Group, color: THREE.ColorRepresentation, width = 12, height = 8, step = 1) {
  const vertices: number[] = [];
  for (let x = -width / 2; x <= width / 2; x += step) vertices.push(x, -height / 2, -3, x, height / 2, -3);
  for (let y = -height / 2; y <= height / 2; y += step) vertices.push(-width / 2, y, -3, width / 2, y, -3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  group.add(new THREE.LineSegments(geometry, createLineMaterial(color, 0.24)));
}

function addStreaks(group: THREE.Group, color: THREE.ColorRepresentation, count = 12) {
  for (let index = 0; index < count; index += 1) {
    const streak = new THREE.Mesh(new THREE.BoxGeometry(1.8 + (index % 3) * 0.6, 0.035, 0.035), createMaterial(color, 0.35));
    streak.position.set((index % 5) * 2.7 - 5.4, (index % 4) * 1.25 - 2.3, -1 - (index % 4));
    streak.rotation.z = index % 2 ? -0.14 : 0.08;
    group.add(streak);
  }
}

function buildWorldGroups() {
  const groups = SCENES.map((_, index) => {
    const group = new THREE.Group() as WorldGroup;
    group.userData = { index, drift: (index % 2 ? -1 : 1) * (0.06 + index * 0.008), tilt: index % 2 ? -0.03 : 0.025 };
    return group;
  });

  const [home, path, route, play, write, tutor, progress, back, final] = groups;

  addBackdrop(home, "#111522", 0.42);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(2.35, 28, 18), createMaterial("#d9d0bc", 0.74));
  moon.position.set(4.6, 1.2, -5.5);
  home.add(moon);
  addRing(home, "#c9ae73", 3.2, [4.6, 1.2, -5.1], [0.8, 0.2, 0.2], 0.22);
  addRing(home, "#e7c787", 3.85, [4.6, 1.2, -5.6], [0.8, -0.1, -0.2], 0.14);
  addParticles(home, "#b7c4dd", 130, 14, 12);
  addPaper(home, "#1b263b", [-3.8, -1.7, -2.2], [3.8, 2.4, 1], [-0.08, 0.12, -0.18], 0.48);

  addBackdrop(path, "#b9aa91", 0.28);
  addGrid(path, "#6d5949", 14, 9, 1.4);
  addRing(path, "#a6332b", 3.35, [0, 0.1, -1.2], [Math.PI / 2, 0.12, 0], 0.48);
  addPaper(path, "#f3eadb", [-3.3, 1.3, 0], [3.7, 2.2, 1], [0.05, -0.08, -0.1], 0.72);
  addPaper(path, "#e6d8bf", [1.1, -1.25, -0.8], [4.1, 2.3, 1], [-0.08, 0.15, 0.12], 0.68);
  addPaper(path, "#d4b79d", [4.7, 1.75, -1.8], [2.3, 1.35, 1], [0.2, -0.18, 0.28], 0.56);
  addParticles(path, "#8d4338", 50, 13, 8);

  addBackdrop(route, "#8b7968", 0.25);
  addGrid(route, "#e6d4b4", 12, 8, 2);
  for (let index = -2; index <= 2; index += 1) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 7.8, 0.12), createMaterial("#554c45", 0.64));
    post.position.set(index * 2.2, 0, -1.4);
    route.add(post);
  }
  for (const [x, y] of [[-4, 1.65], [-1.5, -1.1], [1.4, 1.25], [4.1, -0.6]] as const) {
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), createMaterial("#d95a43", 0.82));
    lantern.position.set(x, y, 0.1);
    route.add(lantern);
    addRing(route, "#f0c87c", 0.58, [x, y, 0], [Math.PI / 2, 0, 0], 0.3);
  }
  addPaper(route, "#f4ead9", [2.3, -1.85, -0.7], [3.4, 1.4, 1], [0.1, -0.08, -0.2], 0.5);

  addBackdrop(play, "#5c2526", 0.34);
  addStreaks(play, "#f0d18a", 17);
  addParticles(play, "#f6b19c", 120, 15, 8);
  [
    [-3.8, 1.4, 0.4, "#f0d18a"],
    [0.2, -0.5, -0.2, "#f8efe0"],
    [3.8, 1.9, 0.2, "#d67363"],
  ].forEach(([x, y, z, color], index) => {
    const token = new THREE.Mesh(new THREE.TorusGeometry(0.7 + index * 0.14, 0.055, 8, 40), createMaterial(color as string, 0.64));
    token.position.set(x as number, y as number, z as number);
    token.rotation.set(0.3, index * 0.25, 0.4);
    play.add(token);
  });

  addBackdrop(write, "#d4c7b3", 0.22);
  addGrid(write, "#897966", 12, 8, 1);
  addPaper(write, "#f8f2e6", [1.4, 0.1, -0.8], [7.3, 4.5, 1], [0.04, -0.05, -0.06], 0.72);
  const strokeMaterial = createMaterial("#1b1715", 0.78);
  [[0, 1.15, 0.18, 2.25, -0.2], [-0.6, -0.15, 2.4, 0.17, 0.18], [0.72, -0.7, 0.2, 1.7, -0.8]].forEach(([x, y, width, height, rotation]) => {
    const stroke = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.12), strokeMaterial);
    stroke.position.set(x, y, 0.1);
    stroke.rotation.z = rotation;
    write.add(stroke);
  });
  const brush = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 4.8, 12), createMaterial("#a5362b", 0.58));
  brush.rotation.z = -Math.PI / 2.9;
  brush.position.set(2.5, -1.6, 0.2);
  write.add(brush);

  addBackdrop(tutor, "#17162d", 0.46);
  addParticles(tutor, "#c7b3ff", 120, 14, 10);
  addRing(tutor, "#a478e9", 2.9, [1.7, 0.3, -0.4], [0.5, 0.2, 0.2], 0.52);
  addRing(tutor, "#6c51ac", 4.1, [1.7, 0.3, -1.3], [1.1, -0.18, 0.4], 0.25);
  addPaper(tutor, "#292544", [-3, 1.1, -0.2], [3.8, 2.2, 1], [-0.08, 0.15, 0.12], 0.66);
  addPaper(tutor, "#3b305a", [3.5, -1.25, 0.1], [3.1, 1.7, 1], [0.12, -0.15, -0.15], 0.54);

  addBackdrop(progress, "#8e887d", 0.22);
  addRing(progress, "#865a48", 2.3, [0, 0.1, -0.8], [Math.PI / 2, 0, 0], 0.42);
  addRing(progress, "#b88653", 3.6, [0, 0.1, -1.2], [Math.PI / 2, 0.12, 0], 0.3);
  addRing(progress, "#ded1b3", 4.8, [0, 0.1, -1.6], [Math.PI / 2, -0.08, 0.2], 0.26);
  for (let index = 0; index < 16; index += 1) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.5 + (index % 6) * 0.32, 0.18), createMaterial(index % 3 === 0 ? "#a6463c" : "#cab07e", 0.64));
    bar.position.set(index * 0.55 - 4.1, -2.35 + bar.geometry.parameters.height / 2, -0.5 - (index % 3) * 0.2);
    progress.add(bar);
  }
  addParticles(progress, "#f1e2c7", 75, 13, 8);

  addBackdrop(back, "#b8a58a", 0.24);
  const seal = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.35, 6), createMaterial("#a93f35", 0.82));
  seal.position.set(3.7, 0.25, -0.5);
  seal.rotation.set(0.8, 0.35, 0.4);
  back.add(seal);
  addRing(back, "#f1d49d", 2.15, [3.7, 0.25, -0.2], [0.6, -0.2, 0.1], 0.32);
  const fold = new THREE.Mesh(new THREE.TetrahedronGeometry(2.8, 0), createMaterial("#ede1cc", 0.68));
  fold.position.set(-2.4, 0.4, -1.2);
  fold.rotation.set(0.24, -0.45, 0.35);
  back.add(fold);
  addParticles(back, "#e8c786", 70, 13, 8);

  addBackdrop(final, "#111522", 0.38);
  addRing(final, "#c6a365", 3.1, [0, 0.1, -1], [0.75, 0.22, 0], 0.34);
  addRing(final, "#a85a4e", 4.2, [0, 0.1, -1.4], [0.8, -0.18, 0.2], 0.2);
  addParticles(final, "#d9c9ad", 115, 14, 10);
  const finalOrb = new THREE.Mesh(new THREE.SphereGeometry(1.2, 24, 16), createMaterial("#c45043", 0.58));
  finalOrb.position.set(0, 0.15, -0.6);
  final.add(finalOrb);

  return groups;
}

function setGroupOpacity(group: WorldGroup, active: boolean) {
  group.traverse((object) => {
    const fadeObject = object as FadeObject;
    if (!fadeObject.material) return;
    const materials = Array.isArray(fadeObject.material) ? fadeObject.material : [fadeObject.material];
    materials.forEach((material) => {
      const baseOpacity = typeof material.userData.worldOpacity === "number" ? material.userData.worldOpacity : 1;
      const targetOpacity = active ? baseOpacity : 0;
      material.opacity += (targetOpacity - material.opacity) * 0.085;
    });
  });
}

export function WorldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    } catch {
      canvas.hidden = true;
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 12);
    const groups = buildWorldGroups();
    groups.forEach((group) => scene.add(group));

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let targetIndex = 0;
    let pointerX = 0;
    let pointerY = 0;
    let currentPointerX = 0;
    let currentPointerY = 0;
    let frame = 0;
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-scene]"));

    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const updateSceneTarget = () => {
      targetIndex = sections.reduce((active, section, index) => section.getBoundingClientRect().top <= window.innerHeight * 0.55 ? index : active, 0);
      document.documentElement.dataset.worldScene = SCENES[targetIndex] ?? "home";
    };

    const render = (timestamp: number) => {
      frame = window.requestAnimationFrame(render);
      updateSceneTarget();
      const time = timestamp * 0.00035;
      currentPointerX += (pointerX - currentPointerX) * 0.06;
      currentPointerY += (pointerY - currentPointerY) * 0.06;
      groups.forEach((group, index) => {
        setGroupOpacity(group, index === targetIndex);
        const distance = index - targetIndex;
        group.position.x += ((currentPointerX * (index === targetIndex ? 0.34 : 0.12)) - group.position.x) * 0.03;
        group.position.y += ((currentPointerY * (index === targetIndex ? 0.22 : 0.08)) - group.position.y) * 0.03;
        if (!reducedMotion.matches) {
          group.rotation.x += (Math.sin(time * 1.5 + index) * 0.025 * (index === targetIndex ? 1 : 0.35) - group.rotation.x) * 0.03;
          group.rotation.y += (Math.cos(time + index * 0.7) * group.userData.tilt - group.rotation.y) * 0.03;
          group.rotation.z += (Math.sin(time * 0.8 + index) * 0.012 - group.rotation.z) * 0.03;
          group.position.z += (Math.sin(time + index) * 0.06 - group.position.z) * 0.03;
        } else {
          group.rotation.x += (0 - group.rotation.x) * 0.12;
          group.rotation.y += (0 - group.rotation.y) * 0.12;
          group.rotation.z += (0 - group.rotation.z) * 0.12;
          group.position.z += (0 - group.position.z) * 0.12;
        }
        group.userData.drift = distance;
      });
      camera.position.x += (currentPointerX * 0.22 - camera.position.x) * 0.035;
      camera.position.y += (-currentPointerY * 0.18 - camera.position.y) * 0.035;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };

    const onScroll = () => updateSceneTarget();
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointerX = event.clientX / window.innerWidth - 0.5;
      pointerY = event.clientY / window.innerHeight - 0.5;
    };

    resize();
    updateSceneTarget();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    frame = window.requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      if (frame) window.cancelAnimationFrame(frame);
      groups.forEach((group) => group.traverse((object) => {
        const fadeObject = object as FadeObject;
        fadeObject.geometry?.dispose();
        if (!fadeObject.material) return;
        const materials = Array.isArray(fadeObject.material) ? fadeObject.material : [fadeObject.material];
        materials.forEach((material) => material.dispose());
      }));
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="world-canvas" aria-hidden="true" />;
}
