"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

function fadeMaterial(material: THREE.Material, opacity: number) {
  material.transparent = true;
  material.opacity = opacity;
  material.depthWrite = false;
}

function createMaterial(color: THREE.ColorRepresentation, opacity = 0.6, wireframe = false) {
  const material = new THREE.MeshBasicMaterial({ color, opacity, transparent: true, depthWrite: false, wireframe });
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

function addMountainLayer(group: THREE.Group, color: THREE.ColorRepresentation, baseY: number, peaks: number[], z: number, opacity = 0.5) {
  const shape = new THREE.Shape();
  const left = -16;
  const step = 32 / (peaks.length - 1);
  shape.moveTo(left, -5);
  peaks.forEach((peak, index) => shape.lineTo(left + index * step, baseY + peak));
  shape.lineTo(16, -5);
  shape.closePath();
  const mountain = new THREE.Mesh(new THREE.ShapeGeometry(shape), createMaterial(color, opacity));
  mountain.position.z = z;
  group.add(mountain);
}

function addGround(group: THREE.Group, color: THREE.ColorRepresentation, opacity = 0.34) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(34, 13), createMaterial(color, opacity));
  ground.position.set(0, -4, -3.8);
  ground.rotation.x = -Math.PI / 2.55;
  group.add(ground);
}

function addStudyPath(group: THREE.Group, color: THREE.ColorRepresentation, points: Array<[number, number, number]>, opacity = 0.72) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const path = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.06, 8, false), createMaterial(color, opacity));
  group.add(path);
  points.forEach(([x, y, z], index) => {
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(index === 0 ? 0.18 : 0.14, index === 0 ? 0.24 : 0.18, 0.12, 8), createMaterial(color, opacity * 0.72));
    stone.position.set(x, y, z + 0.02);
    stone.rotation.x = Math.PI / 2;
    group.add(stone);
  });
}

function addSun(group: THREE.Group, color: THREE.ColorRepresentation, position: [number, number, number], radius = 1.1, opacity = 0.34) {
  const sun = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), createMaterial(color, opacity));
  sun.position.set(...position);
  group.add(sun);
  const halo = new THREE.Mesh(new THREE.RingGeometry(radius * 1.18, radius * 1.22, 32), createMaterial(color, opacity * 0.55));
  halo.position.copy(sun.position);
  group.add(halo);
}

function addPine(group: THREE.Group, color: THREE.ColorRepresentation, position: [number, number, number], scale = 1) {
  const tree = new THREE.Group();
  const material = createMaterial(color, 0.58);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.09, 0.78, 6), material);
  trunk.position.y = 0.38;
  const lower = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.15, 6), material);
  lower.position.y = 1.02;
  const upper = new THREE.Mesh(new THREE.ConeGeometry(0.44, 0.9, 6), material);
  upper.position.y = 1.78;
  tree.add(trunk, lower, upper);
  tree.position.set(...position);
  tree.scale.setScalar(scale);
  group.add(tree);
}

function addStoneLantern(group: THREE.Group, color: THREE.ColorRepresentation, position: [number, number, number], scale = 1) {
  const lantern = new THREE.Group();
  const material = createMaterial(color, 0.54);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.5, 0.18, 6), material);
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.25, 0.2), material);
  const chamber = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.52, 0.54), material);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.68, 0.34, 4), material);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.28, 6), material);
  base.position.y = 0.08;
  stem.position.y = 0.78;
  chamber.position.y = 1.57;
  roof.position.y = 2;
  roof.rotation.y = Math.PI / 4;
  cap.position.y = 2.28;
  lantern.add(base, stem, chamber, roof, cap);
  lantern.position.set(...position);
  lantern.scale.setScalar(scale);
  group.add(lantern);
}

function addTorii(group: THREE.Group, position: [number, number, number], scale = 1, color: THREE.ColorRepresentation = "#a6332b") {
  const material = createMaterial(color, 0.66);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.13 * scale, 3.2 * scale, 0.13 * scale), material);
  const secondPost = post.clone();
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.6 * scale, 0.16 * scale, 0.16 * scale), material);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(3 * scale, 0.12 * scale, 0.13 * scale), material);
  post.position.set(position[0] - 1.05 * scale, position[1], position[2]);
  secondPost.position.set(position[0] + 1.05 * scale, position[1], position[2]);
  lintel.position.set(position[0], position[1] + 1.45 * scale, position[2]);
  cap.position.set(position[0], position[1] + 1.82 * scale, position[2]);
  [post, secondPost, lintel, cap].forEach((piece) => group.add(piece));
}

type StudyCardSpec = {
  label: string;
  title: string;
  glyph?: string;
  lines?: string[];
  accent?: string;
  paper?: boolean;
};

function createStudyTexture(spec: StudyCardSpec) {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 420;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  const ink = spec.paper ? "#1b2025" : "#f5ecdf";
  const muted = spec.paper ? "#6e685f" : "#a4a8ae";
  const accent = spec.accent ?? "#ef6559";
  context.fillStyle = spec.paper ? "#eee2d0" : "#121a24";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = spec.paper ? "rgba(54,44,34,.22)" : "rgba(245,236,223,.2)";
  context.lineWidth = 3;
  context.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);
  context.strokeStyle = spec.paper ? "rgba(54,44,34,.08)" : "rgba(245,236,223,.07)";
  context.lineWidth = 1;
  for (let x = 40; x < canvas.width - 20; x += 80) {
    context.beginPath();
    context.moveTo(x, 38);
    context.lineTo(x, canvas.height - 38);
    context.stroke();
  }
  for (let y = 62; y < canvas.height - 20; y += 72) {
    context.beginPath();
    context.moveTo(38, y);
    context.lineTo(canvas.width - 38, y);
    context.stroke();
  }
  context.fillStyle = accent;
  context.font = "700 18px Arial, sans-serif";
  context.fillText(spec.label, 42, 58);
  context.fillStyle = ink;
  context.font = "500 32px Georgia, serif";
  context.fillText(spec.title, 42, 106);
  if (spec.glyph) {
    context.textAlign = "center";
    context.fillStyle = ink;
    context.font = spec.glyph.length > 4 ? "500 74px Georgia, serif" : "500 142px Georgia, serif";
    context.fillText(spec.glyph, canvas.width / 2, 282);
    context.textAlign = "left";
  }
  (spec.lines ?? []).forEach((line, index) => {
    context.fillStyle = index === 0 ? muted : accent;
    context.font = `${index === 0 ? "500" : "700"} ${index === 0 ? 18 : 16}px Arial, sans-serif`;
    context.fillText(line, 42, 340 + index * 24);
  });
  context.fillStyle = spec.paper ? "rgba(27,32,37,.12)" : "rgba(245,236,223,.12)";
  context.fillRect(42, 384, 636, 6);
  context.fillStyle = accent;
  context.fillRect(42, 384, 410, 6);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function addStudyCard(group: THREE.Group, spec: StudyCardSpec, position: [number, number, number], scale: [number, number], rotation: [number, number, number], opacity = 0.72) {
  const material = new THREE.MeshBasicMaterial({ map: createStudyTexture(spec), opacity, transparent: true, depthWrite: false });
  fadeMaterial(material, opacity);
  const card = new THREE.Mesh(new THREE.BoxGeometry(1, 0.58, 0.09), material);
  card.position.set(...position);
  card.scale.set(scale[0], scale[1], 1);
  card.rotation.set(...rotation);
  group.add(card);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 0.58, 0.09)), createMaterial(spec.paper ? "#6b5847" : "#f5ecdf", 0.34));
  edge.position.copy(card.position);
  edge.scale.copy(card.scale);
  edge.rotation.copy(card.rotation);
  group.add(edge);
}

function buildHeroScene() {
  const scene = new THREE.Group();

  addBackdrop(scene, "#0a1625", 0.48);
  addSun(scene, "#d7b47b", [-4.9, 3.1, -8], 1.1, 0.32);
  addMountainLayer(scene, "#102b45", -1.7, [0, 1.8, 0.4, 2.8, 0.7, 2.1, 0], -7, 0.8);
  addMountainLayer(scene, "#08121f", -2.2, [0, 0.8, 0.2, 1.2, 0.1, 1, 0], -5.5, 0.88);
  addGround(scene, "#07101a", 0.7);
  addPine(scene, "#15364d", [-5.7, -3.4, -4.2], 0.88);
  addPine(scene, "#102b42", [5.8, -3.55, -3.9], 1.12);
  addStoneLantern(scene, "#4f7580", [5.4, -3.2, -3.1], 0.6);
  addTorii(scene, [-4.9, -2.2, -2], 0.62, "#e45b50");
  addStudyPath(scene, "#17d5cc", [[-4.7, -2.05, -1.8], [-2.9, -1.65, -0.9], [-0.8, -1.25, -0.3], [1.1, -0.85, -0.1]], 0.42);
  addStudyCard(scene, { label: "JPLEARN · TODAY", title: "今日の勉強", glyph: "学", lines: ["18 MIN · LESSONS + REVIEWS", "N5 PATH · 68% READY"], accent: "#ff655c" }, [1.8, 0.7, -0.5], [5.6, 3.25], [0.04, -0.14, -0.06], 0.62);
  addStudyCard(scene, { label: "NEXT REVIEW", title: "木 · tree", glyph: "木", lines: ["THURSDAY · RECALL", "KEEP MOVING"], accent: "#17d5cc", paper: true }, [-3.8, -1.6, -1.1], [2.8, 1.63], [-0.08, 0.14, -0.18], 0.58);
  addRing(scene, "#18d3ca", 3.3, [1.8, 0.7, -0.9], [0.8, 0.15, 0.12], 0.18);
  addParticles(scene, "#77c9dc", 75, 14, 12);

  return scene;
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
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 12);
    const world = buildHeroScene();
    scene.add(world);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let pointerX = 0;
    let pointerY = 0;
    let currentPointerX = 0;
    let currentPointerY = 0;
    let frame = 0;

    const resize = () => {
      const { clientWidth: width, clientHeight: height } = canvas;
      if (!width || !height) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const render = (timestamp: number) => {
      frame = window.requestAnimationFrame(render);
      const time = timestamp * 0.00035;
      currentPointerX += (pointerX - currentPointerX) * 0.06;
      currentPointerY += (pointerY - currentPointerY) * 0.06;
      world.position.x += (currentPointerX * 0.34 - world.position.x) * 0.03;
      world.position.y += (currentPointerY * 0.22 - world.position.y) * 0.03;
      if (!reducedMotion.matches) {
        world.rotation.x += (Math.sin(time * 1.5) * 0.025 - world.rotation.x) * 0.03;
        world.rotation.y += (Math.cos(time) * 0.025 - world.rotation.y) * 0.03;
        world.rotation.z += (Math.sin(time * 0.8) * 0.012 - world.rotation.z) * 0.03;
        world.position.z += (Math.sin(time) * 0.06 - world.position.z) * 0.03;
      } else {
        world.rotation.set(0, 0, 0);
        world.position.z = 0;
      }
      camera.position.x += (currentPointerX * 0.22 - camera.position.x) * 0.035;
      camera.position.y += (-currentPointerY * 0.18 - camera.position.y) * 0.035;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointerX = event.clientX / window.innerWidth - 0.5;
      pointerY = event.clientY / window.innerHeight - 0.5;
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        if (frame) {
          window.cancelAnimationFrame(frame);
          frame = 0;
        }
      } else if (!frame) {
        frame = window.requestAnimationFrame(render);
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    frame = window.requestAnimationFrame(render);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (frame) window.cancelAnimationFrame(frame);
      world.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        if (!mesh.material) return;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => {
          (material as THREE.MeshBasicMaterial).map?.dispose();
          material.dispose();
        });
      });
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="world-canvas" aria-hidden="true" />;
}
