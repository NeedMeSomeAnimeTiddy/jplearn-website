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
  const halo = new THREE.Mesh(new THREE.RingGeometry(radius * 1.18, radius * 1.22, 32), createLineMaterial(color, opacity * 0.55));
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

function addBamboo(group: THREE.Group, color: THREE.ColorRepresentation, position: [number, number, number], scale = 1) {
  const cluster = new THREE.Group();
  const material = createMaterial(color, 0.5);
  [-0.34, 0, 0.38].forEach((offset, index) => {
    const height = 2.7 + index * 0.38;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, height, 7), material);
    stem.position.set(offset, height / 2, index * -0.12);
    stem.rotation.z = (index - 1) * 0.035;
    cluster.add(stem);
    for (let node = 1; node < 4; node += 1) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.035, 7), material);
      ring.position.set(offset, node * height / 4, index * -0.12);
      cluster.add(ring);
    }
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.62, 3), material);
    leaf.position.set(offset + (index === 1 ? -0.3 : 0.3), height * 0.74, 0);
    leaf.rotation.z = index === 1 ? Math.PI / 2.7 : -Math.PI / 2.7;
    cluster.add(leaf);
  });
  cluster.position.set(...position);
  cluster.scale.setScalar(scale);
  group.add(cluster);
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
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 0.58, 0.09)), createLineMaterial(spec.paper ? "#6b5847" : "#f5ecdf", 0.34));
  edge.position.copy(card.position);
  edge.scale.copy(card.scale);
  edge.rotation.copy(card.rotation);
  group.add(edge);
}

function buildWorldGroups() {
  const groups = SCENES.map((_, index) => {
    const group = new THREE.Group() as WorldGroup;
    group.userData = { index, drift: (index % 2 ? -1 : 1) * (0.06 + index * 0.008), tilt: index % 2 ? -0.03 : 0.025 };
    return group;
  });

  const [home, path, route, play, write, tutor, progress, back, final] = groups;

  addBackdrop(home, "#0a1625", 0.48);
  addSun(home, "#d7b47b", [-4.9, 3.1, -8], 1.1, 0.32);
  addMountainLayer(home, "#102b45", -1.7, [0, 1.8, 0.4, 2.8, 0.7, 2.1, 0], -7, 0.8);
  addMountainLayer(home, "#08121f", -2.2, [0, 0.8, 0.2, 1.2, 0.1, 1, 0], -5.5, 0.88);
  addGround(home, "#07101a", 0.7);
  addPine(home, "#15364d", [-5.7, -3.4, -4.2], 0.88);
  addPine(home, "#102b42", [5.8, -3.55, -3.9], 1.12);
  addTorii(home, [-4.9, -2.2, -2], 0.62, "#e45b50");
  addStudyPath(home, "#17d5cc", [[-4.7, -2.05, -1.8], [-2.9, -1.65, -0.9], [-0.8, -1.25, -0.3], [1.1, -0.85, -0.1]], 0.42);
  addStudyCard(home, { label: "JPLEARN · TODAY", title: "今日の勉強", glyph: "学", lines: ["18 MIN · LESSONS + REVIEWS", "N5 PATH · 68% READY"], accent: "#ff655c" }, [1.8, 0.7, -0.5], [5.6, 3.25], [0.04, -0.14, -0.06], 0.62);
  addStudyCard(home, { label: "NEXT REVIEW", title: "木 · tree", glyph: "木", lines: ["THURSDAY · RECALL", "KEEP MOVING"], accent: "#17d5cc", paper: true }, [-3.8, -1.6, -1.1], [2.8, 1.63], [-0.08, 0.14, -0.18], 0.58);
  addRing(home, "#18d3ca", 3.3, [1.8, 0.7, -0.9], [0.8, 0.15, 0.12], 0.18);
  addParticles(home, "#77c9dc", 75, 14, 12);

  addBackdrop(path, "#9f8369", 0.27);
  addSun(path, "#f0d18a", [5.1, 3.1, -8], 1.15, 0.3);
  addMountainLayer(path, "#c4a988", -1.9, [0, 1.3, 0.2, 2.2, 0.5, 1.5, 0], -7, 0.55);
  addMountainLayer(path, "#8f705d", -2.5, [0, 0.6, 0.1, 1.2, 0.2, 0.9, 0], -5.2, 0.58);
  addGround(path, "#b69a7a", 0.42);
  addPine(path, "#6f554b", [-6.1, -3.45, -4.3], 0.84);
  addPine(path, "#755a4d", [6.4, -3.55, -4.1], 1.02);
  addStoneLantern(path, "#766554", [-5, -3.2, -3.2], 0.62);
  addStudyPath(path, "#a6332b", [[-5.6, -2.25, -1], [-3.2, -1.55, -0.5], [-0.7, -1.05, -0.1], [1.9, -0.55, 0], [4.8, 0.1, -0.2]], 0.66);
  addGrid(path, "#6d5949", 14, 9, 1.4);
  addStudyCard(path, { label: "01 · HIRAGANA", title: "Start with sound", glyph: "あ", lines: ["BUILDING BLOCKS", "READ · RECALL"], accent: "#ff655c", paper: true }, [-4.2, 1.35, 0], [2.8, 1.63], [0.04, -0.08, -0.11], 0.6);
  addStudyCard(path, { label: "02 · KATAKANA", title: "Make it familiar", glyph: "カ", lines: ["CHARACTERS", "SEE · HEAR"], accent: "#ff655c", paper: true }, [0, 1.05, -0.4], [2.8, 1.63], [-0.03, 0.08, 0.04], 0.62);
  addStudyCard(path, { label: "03 · KANJI", title: "Read the shape", glyph: "漢", lines: ["MEANING + FORM", "TRACE · REMEMBER"], accent: "#17d5cc", paper: true }, [4, -0.1, -0.9], [2.8, 1.63], [0.08, -0.12, -0.08], 0.6);
  addStudyCard(path, { label: "04 · WORDS", title: "Put it in context", glyph: "言", lines: ["WORDS IN CONTEXT", "USE · REVIEW"], accent: "#ff655c", paper: true }, [0.9, -1.8, -1.3], [3.1, 1.8], [-0.05, 0.18, 0.12], 0.55);
  addRing(path, "#a6332b", 3.1, [0, 0, -1.8], [Math.PI / 2, 0.1, 0], 0.3);

  addBackdrop(route, "#243d4d", 0.3);
  addSun(route, "#82c5d0", [-4.7, 2.9, -8], 1.2, 0.24);
  addMountainLayer(route, "#315a6a", -1.9, [0, 1.4, 0.3, 2.1, 0.2, 1.4, 0], -7, 0.65);
  addMountainLayer(route, "#1b2e3b", -2.4, [0, 0.7, 0.1, 1.3, 0.2, 0.9, 0], -5.2, 0.74);
  addGround(route, "#18303d", 0.58);
  addPine(route, "#224654", [-6.2, -3.45, -4.3], 0.92);
  addPine(route, "#1e3b4a", [6.1, -3.5, -4.1], 1.14);
  addStoneLantern(route, "#5b7980", [-4.8, -3.2, -3.1], 0.62);
  addTorii(route, [4.1, -1.95, -1.2], 0.55, "#ff655c");
  addStudyPath(route, "#17d5cc", [[-4.6, -2.25, -1], [-2.6, -1.55, -0.6], [-0.6, -0.9, -0.2], [1.8, -0.55, -0.1], [4, -0.1, -0.3]], 0.58);
  addStudyCard(route, { label: "DAILY PLAN · 今日", title: "Your focused session", glyph: "24", lines: ["DUE CARDS · NOW", "WARM UP → REVIEW → PLAY"], accent: "#ff655c" }, [0.2, 0.3, -0.2], [5.6, 3.25], [-0.04, -0.13, 0.06], 0.62);
  addStudyCard(route, { label: "ROUTE 02", title: "Review queue", glyph: "復", lines: ["24 CARDS DUE", "ONE CLEAR NEXT STEP"], accent: "#17d5cc", paper: true }, [-3.5, -1.85, -1.1], [3.1, 1.75], [0.08, 0.1, -0.16], 0.52);
  addParticles(route, "#a9dce6", 70, 13, 8);

  addBackdrop(play, "#5c2526", 0.34);
  addSun(play, "#f0d18a", [4.8, 2.8, -8], 1.15, 0.28);
  addMountainLayer(play, "#8b3530", -1.9, [0, 1.4, 0.3, 2.2, 0.4, 1.6, 0], -7, 0.68);
  addMountainLayer(play, "#4f1d25", -2.5, [0, 0.8, 0.1, 1.3, 0.2, 0.9, 0], -5.3, 0.82);
  addGround(play, "#401925", 0.66);
  addPine(play, "#5c2428", [-6.2, -3.45, -4.3], 0.9);
  addPine(play, "#4b1c25", [6.2, -3.5, -4.2], 1.08);
  addStudyPath(play, "#f0d18a", [[-5.2, -2.1, -0.9], [-3, -1.5, -0.5], [-0.9, -1.15, -0.2], [1.8, -0.65, 0], [4.8, -0.15, -0.2]], 0.58);
  addStudyCard(play, { label: "01 · RECALL", title: "Find the meaning", glyph: "思", lines: ["FAST RESPONSE", "REMEMBER · MOVE"], accent: "#f0d18a" }, [-4, 1.4, 0.1], [3.1, 1.8], [0.02, 0.08, -0.12], 0.58);
  addStudyCard(play, { label: "03 · HANDWRITING", title: "Draw the stroke", glyph: "書", lines: ["PRACTISE FROM MEMORY", "CHECK ORDER"], accent: "#17d5cc", paper: true }, [0.2, -0.3, -0.5], [3.5, 2.03], [-0.06, -0.06, 0.08], 0.62);
  addStudyCard(play, { label: "04 · LISTENING", title: "Catch the sound", glyph: "聞", lines: ["HEAR · CHOOSE", "KEEP THE RHYTHM"], accent: "#f0d18a" }, [4.1, 1.7, -0.7], [2.9, 1.67], [0.08, -0.16, 0.13], 0.52);
  addStreaks(play, "#f0d18a", 11);
  addParticles(play, "#f6b19c", 65, 15, 8);

  addBackdrop(write, "#d4c7b3", 0.22);
  addSun(write, "#b65e4e", [4.7, 2.8, -8], 1.1, 0.22);
  addMountainLayer(write, "#a49789", -2, [0, 1.1, 0.2, 1.8, 0.3, 1.2, 0], -7, 0.42);
  addMountainLayer(write, "#6d5d55", -2.55, [0, 0.5, 0.1, 1.1, 0.2, 0.7, 0], -5.4, 0.48);
  addGround(write, "#c7b8a2", 0.56);
  addPine(write, "#77675e", [-6, -3.5, -4.25], 0.84);
  addPine(write, "#64564f", [6.2, -3.55, -4.1], 1.04);
  addBamboo(write, "#58675b", [5.25, -3.35, -3.2], 0.8);
  addStudyPath(write, "#a5362b", [[-4.8, -2.1, -1], [-2.4, -1.55, -0.5], [0.1, -1.2, -0.1], [2.7, -0.8, -0.2]], 0.32);
  addGrid(write, "#897966", 12, 8, 1);
  addStudyCard(write, { label: "HANDWRITING · 書く", title: "Stroke order", glyph: "永", lines: ["STROKE 01 / 05", "WRITE FROM MEMORY"], accent: "#a5362b", paper: true }, [0.8, 0.2, -0.7], [5.3, 3.08], [0.04, -0.06, -0.05], 0.6);
  addStudyCard(write, { label: "PROMPT", title: "water · みず", glyph: "水", lines: ["TRACE → HIDE → CHECK", "CHARACTER BY CHARACTER"], accent: "#17aeb2", paper: true }, [-3.2, -1.55, -1.5], [3, 1.72], [-0.06, 0.14, 0.12], 0.52);
  addRing(write, "#a5362b", 2.9, [0.8, 0.2, -1.2], [0.8, 0.12, -0.1], 0.18);

  addBackdrop(tutor, "#102b3c", 0.4);
  addSun(tutor, "#17d5cc", [-4.6, 3.1, -8], 1.08, 0.2);
  addMountainLayer(tutor, "#1b4d62", -1.8, [0, 1.7, 0.2, 2.6, 0.4, 1.8, 0], -7, 0.66);
  addMountainLayer(tutor, "#0e2433", -2.4, [0, 0.8, 0.1, 1.5, 0.2, 1, 0], -5.4, 0.84);
  addGround(tutor, "#0b202d", 0.62);
  addPine(tutor, "#184258", [-6.1, -3.45, -4.3], 0.9);
  addPine(tutor, "#133247", [6.3, -3.55, -4.1], 1.08);
  addStoneLantern(tutor, "#4f7580", [5.1, -3.2, -3.15], 0.62);
  addStudyPath(tutor, "#17d5cc", [[-4.6, -2.15, -1], [-2.3, -1.55, -0.5], [0, -1.1, -0.2], [2.6, -0.62, -0.1], [4.7, -0.18, -0.2]], 0.48);
  addStudyCard(tutor, { label: "OPTIONAL LOCAL TUTOR", title: "Why は sounds like wa", glyph: "は", lines: ["TOPIC PARTICLE", "EXPLANATION · EXAMPLE"], accent: "#17d5cc" }, [1.5, 0.55, -0.3], [5.2, 3], [0.03, -0.12, 0.06], 0.6);
  addStudyCard(tutor, { label: "CONVERSATION", title: "Try another example", glyph: "話", lines: ["ASK WHEN STUCK", "ON THIS DEVICE"], accent: "#ff655c", paper: true }, [-3.3, -1.55, -1.1], [3.2, 1.85], [-0.08, 0.12, -0.16], 0.52);
  addRing(tutor, "#17d5cc", 3.7, [1.5, 0.55, -1.1], [0.9, 0.16, 0.22], 0.22);
  addParticles(tutor, "#90dbe4", 80, 14, 10);

  addBackdrop(progress, "#756b60", 0.25);
  addSun(progress, "#d8bd84", [4.8, 3.0, -8], 1.15, 0.25);
  addMountainLayer(progress, "#b4a48d", -1.9, [0, 1.1, 0.2, 2.4, 0.4, 1.5, 0], -7, 0.58);
  addMountainLayer(progress, "#756553", -2.5, [0, 0.7, 0.1, 1.4, 0.2, 0.9, 0], -5.4, 0.72);
  addGround(progress, "#5d554d", 0.72);
  addPine(progress, "#806c58", [-6.2, -3.45, -4.25], 0.88);
  addPine(progress, "#665648", [6.1, -3.55, -4.1], 1.08);
  addBamboo(progress, "#6d7159", [-5.2, -3.35, -3.2], 0.76);
  addStudyPath(progress, "#17d5cc", [[-5.2, -2.25, -1], [-3.2, -1.65, -0.6], [-1.1, -1.05, -0.2], [1.2, -0.45, -0.1], [3.6, 0.22, -0.3]], 0.72);
  addStudyCard(progress, { label: "PROGRESS · 積み重ね", title: "See the work adding up", glyph: "68%", lines: ["MASTERED · 126", "8 DAY STREAK · N5 PATH"], accent: "#17d5cc" }, [0, 0.45, -0.4], [5.5, 3.17], [-0.03, 0.08, -0.04], 0.62);
  addStudyCard(progress, { label: "STUDY HISTORY", title: "A little, often", glyph: "続", lines: ["REVIEWS · LESSONS", "EVERY SESSION COUNTS"], accent: "#ff655c", paper: true }, [-3.7, -1.65, -1.3], [3, 1.75], [0.08, 0.14, 0.14], 0.5);
  for (let index = 0; index < 14; index += 1) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.35 + (index % 5) * 0.28, 0.15), createMaterial(index % 3 === 0 ? "#a6463c" : "#d6bd84", 0.58));
    bar.position.set(index * 0.54 - 3.55, -2.2 + (bar.geometry.parameters.height as number) / 2, -0.5 - (index % 3) * 0.2);
    progress.add(bar);
  }

  addBackdrop(back, "#8b6356", 0.22);
  addSun(back, "#ff655c", [-4.7, 3.05, -8], 1.1, 0.22);
  addMountainLayer(back, "#b38a70", -1.9, [0, 1.5, 0.3, 2.1, 0.4, 1.4, 0], -7, 0.56);
  addMountainLayer(back, "#69443e", -2.4, [0, 0.7, 0.1, 1.3, 0.2, 0.9, 0], -5.5, 0.72);
  addGround(back, "#704c48", 0.65);
  addPine(back, "#744940", [-6.1, -3.45, -4.25], 0.9);
  addPine(back, "#5c3836", [6.3, -3.55, -4.1], 1.1);
  addStudyPath(back, "#f0d18a", [[-5.1, -2.1, -1], [-2.8, -1.55, -0.5], [-0.5, -1.05, -0.1], [2.2, -0.55, -0.1], [4.8, 0.05, -0.2]], 0.52);
  addStudyCard(back, { label: "JPLEARN 1.0", title: "Help shape the next chapter", glyph: "次", lines: ["BACKER BETA", "SUPPORT · BUILD · SHARE"], accent: "#ff655c", paper: true }, [-0.5, 0.3, -0.4], [5.3, 3.08], [0.04, -0.1, -0.05], 0.6);
  const seal = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.32, 6), createMaterial("#ff655c", 0.72));
  seal.position.set(4, 0.3, -0.2);
  seal.rotation.set(0.8, 0.35, 0.4);
  back.add(seal);
  addRing(back, "#17d5cc", 2, [4, 0.3, -0.1], [0.6, -0.2, 0.1], 0.3);
  addParticles(back, "#f0d18a", 48, 12, 8);

  addBackdrop(final, "#0a1625", 0.46);
  addSun(final, "#d7b47b", [4.8, 3.1, -8], 1.12, 0.3);
  addMountainLayer(final, "#102b45", -1.8, [0, 1.4, 0.3, 2.3, 0.4, 1.6, 0], -7, 0.76);
  addMountainLayer(final, "#08121f", -2.4, [0, 0.8, 0.1, 1.4, 0.2, 1, 0], -5.5, 0.9);
  addGround(final, "#07101a", 0.8);
  addPine(final, "#15364d", [-6.2, -3.45, -4.2], 0.9);
  addPine(final, "#102b42", [6.2, -3.55, -4.05], 1.1);
  addStoneLantern(final, "#5f7783", [-4.8, -3.2, -3.1], 0.65);
  addTorii(final, [0, -2.1, -1.2], 0.74, "#ff655c");
  addStudyPath(final, "#17d5cc", [[-4.8, -2.25, -1], [-2.6, -1.65, -0.6], [-0.4, -1.1, -0.2], [2, -0.55, -0.1], [4.8, 0.1, -0.2]], 0.46);
  addStudyCard(final, { label: "JPLEARN", title: "Your Japanese journey", glyph: "学", lines: ["ONE FOCUSED PLACE", "KEEP MOVING FORWARD"], accent: "#17d5cc" }, [0, 0.25, -0.5], [5.5, 3.17], [0.02, 0.04, 0], 0.62);
  addRing(final, "#ff655c", 3.4, [0, 0.25, -1.2], [0.8, 0.2, 0.12], 0.2);
  addParticles(final, "#d9c9ad", 70, 14, 10);

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
        materials.forEach((material) => {
          (material as THREE.MeshBasicMaterial).map?.dispose();
          material.dispose();
        });
      }));
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="world-canvas" aria-hidden="true" />;
}
