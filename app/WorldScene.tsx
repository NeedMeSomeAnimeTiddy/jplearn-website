"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/* A twilight floating-shrine world. Each scroll stop frames a purpose-built
   diorama: the grand gate, the shrine courtyard, six labeled curriculum
   islands, a lantern festival, a memory orrery, and a torii constellation.
   The camera flies a shaped spline (stops + shaping mids) with gentle
   banking; the fixed CSS sky shifts with camera altitude. */

type Vec3 = [number, number, number];
type FlightPoint = { p: Vec3; t: Vec3; stop?: boolean };

/* Cards alternate sides per section, so each subject is framed on the
   opposite side: stops 1/3/5 push subjects left, 0/2/4/6 push them right. */
const FLIGHT: FlightPoint[] = [
  { p: [-2, 2.6, 19.5], t: [-3.2, 1.7, 0], stop: true },     // 0 the gate — island right of frame
  { p: [0, 2.15, 10], t: [0, 1.9, 4.4] },                    //   locked approach to the torii
  { p: [0.2, 1.9, 3.1], t: [-0.4, 1.15, -3.1], stop: true }, // 1 threshold — shrine left of frame
  { p: [4.8, 3.6, 5.5], t: [7, 1, -8] },                     //   swing right over the garden
  { p: [5.2, 4.4, 4.5], t: [11.5, -0.5, -22], stop: true },  // 2 the route — chain recedes right
  { p: [-0.5, 5.6, 6.5], t: [-7, 2.5, -8] },                 //   arc back high across the island
  { p: [-8.8, 3.5, -8.2], t: [-15.5, 4.2, -14.5], stop: true }, // 3 lanterns — field left of frame
  { p: [-16, 7.2, -5], t: [-25, 11.2, 5], stop: true },         // 4 memory — orrery in open sky, upper right
  { p: [-13.5, 5.6, 2.5], t: [-7, 0.8, 9] },                 //   bank the gaze south so the turn is a pan, not a snap
  { p: [-7.5, 4.6, 2.8], t: [-2.4, 1.4, -2.4] },             //   descend around the west islet, clearing the maple
  { p: [1.9, 1.8, 0.7], t: [-1.5, 1.3, -3.5], stop: true },  // 5 tutor — shrine and maple left
  { p: [3.5, 7.5, 4], t: [-4, 13, -25] },                    //   spiral ascent
  { p: [-1, 16, -16], t: [-13, 25, -53], stop: true },       // 6 stars — constellation upper right
  { p: [8, 8.5, 17], t: [0, 2.6, 0] },                       //   swooping dive home
  { p: [0, 3.3, 24], t: [0, 1.7, 0], stop: true },           // 7 landing — centered, mirroring the gate
];

const TRACK_GLYPHS = ["あ", "カ", "漢", "語", "文", "読"];

/* deterministic PRNG so scatters stay identical between visits */
function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function glowTexture(inner: string, outer: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.4, outer);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function glyphTexture(glyph: string, color = "#ffe9c7") {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = color;
    context.font = '92px "Noto Sans JP", "Yu Gothic", sans-serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(glyph, 64, 70);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* ---------- shared materials ---------- */
const M = {
  rock: () => new THREE.MeshLambertMaterial({ color: 0x352a52, flatShading: true }),
  rockFar: () => new THREE.MeshLambertMaterial({ color: 0x302650, flatShading: true }),
  grassTop: () => new THREE.MeshLambertMaterial({ color: 0x35635c, flatShading: true }),
  red: () => new THREE.MeshLambertMaterial({ color: 0xd9503f, emissive: 0x521309 }),
  redDark: () => new THREE.MeshLambertMaterial({ color: 0xc8422f, emissive: 0x40100a }),
  wood: () => new THREE.MeshLambertMaterial({ color: 0x5a4670, flatShading: true }),
  stone: () => new THREE.MeshLambertMaterial({ color: 0x6e6194, flatShading: true }),
  stoneDark: () => new THREE.MeshLambertMaterial({ color: 0x54487a, flatShading: true }),
  wall: () => new THREE.MeshLambertMaterial({ color: 0x4a3866, flatShading: true }),
  roof: () => new THREE.MeshLambertMaterial({ color: 0x2b2150, flatShading: true }),
  dark: () => new THREE.MeshLambertMaterial({ color: 0x30224a }),
  pine: () => new THREE.MeshLambertMaterial({ color: 0x265752, flatShading: true }),
  trunk: () => new THREE.MeshLambertMaterial({ color: 0x3d2f4a }),
  maple: () => new THREE.MeshLambertMaterial({ color: 0xc25668, flatShading: true }),
  sakura: () => new THREE.MeshLambertMaterial({ color: 0xe58fae, flatShading: true }),
  gold: () => new THREE.MeshLambertMaterial({ color: 0xc9a15a, flatShading: true }),
  warm: () => new THREE.MeshBasicMaterial({ color: 0xffb45e }),
  paper: () => new THREE.MeshBasicMaterial({ color: 0xffd9a0 }),
  white: () => new THREE.MeshBasicMaterial({ color: 0xf3ecff, side: THREE.DoubleSide }),
};

/* ---------- builders ---------- */

/* One continuous mesh per island: the icosahedron's top is flattened into a
   walkable plateau at exactly +0.07r (prop placement depends on it), the
   keel stretches downward, and faces are vertex-colored — grass on top,
   rock below — so turf and stone can never separate. */
function makeRockIsland(radius: number, far = false) {
  const island = new THREE.Group();
  const geometry = new THREE.IcosahedronGeometry(radius, 2);
  geometry.scale(1, 1.15, 1);
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const vertex = new THREE.Vector3();
  const plateau = radius * 0.07;
  for (let index = 0; index < positions.count; index += 1) {
    vertex.fromBufferAttribute(positions, index);
    const height = vertex.y;
    if (height > 0) vertex.y = Math.min(plateau, height * 0.25);
    else vertex.y = height * 1.22; // deeper keel
    // deterministic crags — a function of the original position, so the
    // coincident copies in this non-indexed geometry always move together
    const jitter = 1 + (Math.sin(vertex.x * 7.3 + vertex.z * 5.1) * 0.5 + Math.sin(height * 9.7) * 0.5) * 0.07;
    if (vertex.y < plateau * 0.9) {
      vertex.x *= jitter;
      vertex.z *= jitter;
      if (vertex.y < 0) vertex.y *= jitter;
    }
    positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }
  geometry.computeVertexNormals();

  const grassA = new THREE.Color(0x35635c);
  const grassB = new THREE.Color(0x3b6b60);
  const rockA = new THREE.Color(far ? 0x362b5c : 0x3c3163);
  const rockB = new THREE.Color(far ? 0x2e2450 : 0x342a57);
  const colors = new Float32Array(positions.count * 3);
  for (let face = 0; face < positions.count; face += 3) {
    const centroidY = (positions.getY(face) + positions.getY(face + 1) + positions.getY(face + 2)) / 3;
    const color = centroidY > plateau * 0.6 ? (face % 2 ? grassA : grassB) : (face % 3 ? rockA : rockB);
    for (let corner = 0; corner < 3; corner += 1) {
      colors[(face + corner) * 3] = color.r;
      colors[(face + corner) * 3 + 1] = color.g;
      colors[(face + corner) * 3 + 2] = color.b;
    }
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  island.add(new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
  return island;
}

function makeTorii(scale = 1, withShimenawa = false) {
  const torii = new THREE.Group();
  const red = M.red();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.6, 8), red);
  const postB = post.clone();
  post.position.set(-0.95, 1.3, 0);
  postB.position.set(0.95, 1.3, 0);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.14, 0.18), red);
  lintel.position.y = 2.18;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.16, 0.24), red);
  cap.position.y = 2.62;
  const capTop = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.08, 0.28), M.dark());
  capTop.position.y = 2.74;
  const strut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.12), red);
  strut.position.y = 2.4;
  torii.add(post, postB, lintel, cap, capTop, strut);
  if (withShimenawa) {
    // sacred rope with three paper streamers
    const ropeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.92, 2.06, 0.12),
      new THREE.Vector3(0, 1.9, 0.14),
      new THREE.Vector3(0.92, 2.06, 0.12),
    ]);
    const rope = new THREE.Mesh(new THREE.TubeGeometry(ropeCurve, 12, 0.035, 6, false), M.gold());
    torii.add(rope);
    [-0.55, 0, 0.55].forEach((x) => {
      const shide = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.28), M.white());
      shide.position.set(x, 1.82 - Math.abs(x) * 0.12, 0.14);
      shide.rotation.y = 0.3;
      torii.add(shide);
    });
  }
  torii.scale.setScalar(scale);
  return torii;
}

function makeShrine(scale = 1) {
  const shrine = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.3, 2), M.wall());
  base.position.y = 0.15;
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.1, 1.5), M.wall());
  body.position.y = 0.95;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.85, 0.9, 4), M.roof());
  roof.position.y = 1.98;
  roof.rotation.y = Math.PI / 4;
  const roofTop = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.55, 4), M.roof());
  roofTop.position.y = 2.62;
  roofTop.rotation.y = Math.PI / 4;
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), M.warm());
  door.position.set(0, 0.85, 0.755);
  const lampA = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), M.paper());
  lampA.position.set(-0.75, 1.35, 0.78);
  const lampB = lampA.clone();
  lampB.position.x = 0.75;
  shrine.add(base, body, roof, roofTop, door, lampA, lampB);
  shrine.scale.setScalar(scale);
  return shrine;
}

function makePine(scale = 1) {
  const pine = new THREE.Group();
  const foliage = M.pine();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.8, 6), M.trunk());
  trunk.position.y = 0.4;
  const lower = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.05, 7), foliage);
  lower.position.y = 1.05;
  const upper = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.85, 7), foliage);
  upper.position.y = 1.75;
  pine.add(trunk, lower, upper);
  pine.scale.setScalar(scale);
  return pine;
}

function makeBlossomTree(material: THREE.Material, scale = 1) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.9, 6), M.trunk());
  trunk.position.y = 0.45;
  const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.5, 5), M.trunk());
  branch.position.set(0.25, 0.95, 0);
  branch.rotation.z = -0.7;
  const blobA = new THREE.Mesh(new THREE.IcosahedronGeometry(0.52, 0), material);
  blobA.position.set(0, 1.35, 0);
  const blobB = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 0), material);
  blobB.position.set(0.5, 1.18, 0.12);
  const blobC = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), material);
  blobC.position.set(-0.42, 1.12, -0.14);
  tree.add(trunk, branch, blobA, blobB, blobC);
  tree.scale.setScalar(scale);
  return tree;
}

function makeStoneLantern(glow: THREE.Texture, scale = 1) {
  const lantern = new THREE.Group();
  const stone = M.stoneDark();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.12, 6), stone);
  base.position.y = 0.06;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.5, 6), stone);
  stem.position.y = 0.37;
  const chamber = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.24), new THREE.MeshBasicMaterial({ color: 0xffc98a }));
  chamber.position.y = 0.72;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.16, 4), stone);
  roof.position.y = 0.9;
  roof.rotation.y = Math.PI / 4;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffb45e, transparent: true, opacity: 0.55, depthWrite: false }));
  halo.scale.setScalar(1.15);
  halo.position.y = 0.72;
  lantern.add(base, stem, chamber, roof, halo);
  lantern.scale.setScalar(scale);
  return lantern;
}

function makePaperLantern(glow: THREE.Texture) {
  const lantern = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), M.paper());
  body.scale.y = 1.25;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.07, 8), new THREE.MeshBasicMaterial({ color: 0x3d2f4a }));
  rim.position.y = 0.44;
  const rimB = rim.clone();
  rimB.position.y = -0.44;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffb45e, transparent: true, opacity: 0.5, depthWrite: false }));
  halo.scale.setScalar(2.1);
  lantern.add(body, rim, rimB, halo);
  lantern.userData.halo = halo;
  return lantern;
}

function makeKomainu() {
  const lion = new THREE.Group();
  const stone = M.stone();
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.56), M.stoneDark());
  plinth.position.y = 0.08;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.46), stone);
  body.position.set(0, 0.3, 0.02);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.34, 0.2), stone);
  chest.position.set(0, 0.36, 0.18);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 6), stone);
  head.position.set(0, 0.62, 0.2);
  const earA = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 4), stone);
  earA.position.set(-0.09, 0.76, 0.16);
  const earB = earA.clone();
  earB.position.x = 0.09;
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 5), stone);
  tail.position.set(0, 0.42, -0.22);
  tail.rotation.x = -0.7;
  lion.add(plinth, body, chest, head, earA, earB, tail);
  return lion;
}

function makePagoda() {
  const pagoda = new THREE.Group();
  const widths = [1.5, 1.2, 0.9];
  widths.forEach((width, tier) => {
    const y = tier * 0.85;
    const body = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, 0.6, width * 0.72), M.wall());
    body.position.y = y + 0.3;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(width, 0.45, 4), M.roof());
    roof.position.y = y + 0.82;
    roof.rotation.y = Math.PI / 4;
    pagoda.add(body, roof);
  });
  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 5), M.gold());
  finial.position.y = 2.85;
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), M.gold());
  orb.position.y = 3.14;
  pagoda.add(finial, orb);
  return pagoda;
}

function makeStele(glyph: string) {
  const stele = new THREE.Group();
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.5), M.stoneDark());
  plinth.position.y = 0.09;
  const stone = new THREE.Mesh(new THREE.BoxGeometry(0.52, 1.15, 0.26), M.stone());
  stone.position.y = 0.75;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.44, 0.44),
    new THREE.MeshBasicMaterial({ map: glyphTexture(glyph, "#ffd9a0"), transparent: true, side: THREE.DoubleSide }),
  );
  face.position.set(0, 0.85, 0.135);
  stele.add(plinth, stone, face);
  return stele;
}

function makeBellTower() {
  const tower = new THREE.Group();
  const wood = M.wood();
  [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]].forEach(([x, z]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.2, 6), wood);
    post.position.set(x, 0.6, z);
    tower.add(post);
  });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.5, 4), M.roof());
  roof.position.y = 1.42;
  roof.rotation.y = Math.PI / 4;
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.34, 8), M.gold());
  bell.position.y = 0.82;
  const bellTop = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), M.gold());
  bellTop.position.y = 0.99;
  tower.add(roof, bell, bellTop);
  return tower;
}

function makeSign(glyph: string, faceAngle: number) {
  const sign = new THREE.Group();
  const wood = M.wood();
  [[-0.28], [0.28]].forEach(([x]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.85, 5), wood);
    post.position.set(x, 0.42, 0);
    sign.add(post);
  });
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.62, 0.06), wood);
  board.position.y = 0.85;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshBasicMaterial({ map: glyphTexture(glyph), transparent: true, side: THREE.DoubleSide }),
  );
  face.position.set(0, 0.85, 0.035);
  sign.add(board, face);
  sign.rotation.y = faceAngle;
  return sign;
}

/* A red arched bridge built in world space between two landing points —
   the deck follows one curve, so both feet always sit on their islands. */
function makeBridge(from: THREE.Vector3, to: THREE.Vector3, bow: number) {
  const bridge = new THREE.Group();
  const plankMaterial = M.wood();
  const rail = M.redDark();
  const mid = from.clone().lerp(to, 0.5);
  mid.y = Math.max(from.y, to.y) + bow;
  const deck = new THREE.QuadraticBezierCurve3(from, mid, to);

  const planks = 11;
  const dummy = new THREE.Object3D();
  const tangentTarget = new THREE.Vector3();
  for (let index = 0; index < planks; index += 1) {
    const t = index / (planks - 1);
    const point = deck.getPoint(t);
    const plank = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.055, 0.3), plankMaterial);
    dummy.position.copy(point);
    tangentTarget.copy(point).add(deck.getTangent(t));
    dummy.lookAt(tangentTarget);
    plank.position.copy(dummy.position);
    plank.quaternion.copy(dummy.quaternion);
    bridge.add(plank);
  }

  const across = new THREE.Vector3(to.z - from.z, 0, from.x - to.x).normalize().multiplyScalar(0.33);
  [1, -1].forEach((side) => {
    const railPoints = [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const point = deck.getPoint(t);
      return point.addScaledVector(across, side).add(new THREE.Vector3(0, 0.34, 0));
    });
    bridge.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPoints), 16, 0.03, 5, false), rail));
    [0, 0.5, 1].forEach((t) => {
      const foot = deck.getPoint(t).addScaledVector(across, side);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.36, 5), rail);
      post.position.copy(foot).add(new THREE.Vector3(0, 0.17, 0));
      bridge.add(post);
    });
  });
  return bridge;
}

function makeEmaBoard() {
  const board = new THREE.Group();
  const wood = M.wood();
  [[-0.5], [0.5]].forEach(([x]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1, 5), wood);
    post.position.set(x, 0.5, 0);
    board.add(post);
  });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.1), wood);
  beam.position.y = 0.98;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.3), M.roof());
  roof.position.y = 1.06;
  board.add(beam, roof);
  const emaMaterial = new THREE.MeshLambertMaterial({ color: 0xe8d9b8, side: THREE.DoubleSide });
  for (let index = 0; index < 6; index += 1) {
    const ema = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.13), emaMaterial);
    ema.position.set(-0.42 + (index % 3) * 0.42, 0.78 - Math.floor(index / 3) * 0.2, 0.02);
    ema.rotation.z = ((index * 7) % 5 - 2) * 0.06;
    board.add(ema);
  }
  return board;
}

function makeZenGarden() {
  const garden = new THREE.Group();
  const sand = new THREE.MeshLambertMaterial({ color: 0x494073, side: THREE.DoubleSide });
  [0.45, 0.72, 1.0].forEach((radius) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius - 0.035, radius, 28), sand);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    garden.add(ring);
  });
  const rockA = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), M.stone());
  rockA.position.y = 0.12;
  rockA.scale.y = 0.75;
  const rockB = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), M.stoneDark());
  rockB.position.set(0.3, 0.08, 0.18);
  garden.add(rockA, rockB);
  return garden;
}

function makeTsukubai() {
  const basin = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.22, 8), M.stone());
  bowl.position.y = 0.11;
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.15, 12), new THREE.MeshBasicMaterial({ color: 0x8fb9d8 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.225;
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 5), new THREE.MeshLambertMaterial({ color: 0x7a9660 }));
  spout.position.set(0.22, 0.3, 0);
  spout.rotation.z = 0.9;
  basin.add(bowl, water, spout);
  return basin;
}

function makeMoon(radius: number) {
  const geometry = new THREE.IcosahedronGeometry(radius, 2);
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  const vertex = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const random = mulberry32(7);
  const craters = Array.from({ length: 11 }, () => ({
    direction: new THREE.Vector3(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1).normalize(),
    size: 0.22 + random() * 0.38,
    depth: 0.025 + random() * 0.05,
  }));
  for (let index = 0; index < positions.count; index += 1) {
    vertex.fromBufferAttribute(positions, index);
    direction.copy(vertex).normalize();
    let offset = 0;
    craters.forEach((crater) => {
      const angle = direction.angleTo(crater.direction);
      if (angle < crater.size) offset -= Math.cos((angle / crater.size) * Math.PI * 0.5) * crater.depth;
    });
    vertex.setLength(radius * (1 + offset));
    positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }
  geometry.computeVertexNormals();
  // fog: false — the moon sits above the atmosphere, so it stays crisp
  const moon = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({
    color: 0xf6e7c8, emissive: 0xc7ae82, flatShading: true, fog: false,
  }));
  moon.rotation.z = 0.25;
  return moon;
}

function makeCloud(scale: number, flat = false) {
  const cloud = new THREE.Group();
  const material = new THREE.MeshLambertMaterial({ color: 0x6a5a9e, transparent: true, opacity: flat ? 0.38 : 0.5, flatShading: true });
  const blobs = 4 + Math.floor(scale);
  for (let index = 0; index < blobs; index += 1) {
    const blob = new THREE.Mesh(new THREE.SphereGeometry(0.8 + (index % 3) * 0.4, 7, 6), material);
    blob.position.set(index * 1.1 - blobs * 0.5, (index % 2) * 0.3, (index % 3) * 0.6 - 0.6);
    blob.scale.y = flat ? 0.26 : 0.42;
    cloud.add(blob);
  }
  cloud.scale.setScalar(scale);
  return cloud;
}

function makePoints(count: number, spread: Vec3, center: Vec3, color: number, size: number, texture: THREE.Texture, opacity = 0.9, seed = 1, fog = true) {
  const random = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = center[0] + (random() - 0.5) * spread[0];
    positions[index * 3 + 1] = center[1] + (random() - 0.5) * spread[1];
    positions[index * 3 + 2] = center[2] + (random() - 0.5) * spread[2];
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color, size, map: texture, transparent: true, opacity,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog,
  });
  return new THREE.Points(geometry, material);
}

/* stars on a spherical shell around the scene, so every view direction is
   equally dense; slight below-horizon spill keeps low shots starry too.
   `twinkle` > 0 gives every star its own brightness cycle via vertex colors */
function makeStarShell(count: number, radiusMin: number, radiusMax: number, color: number, size: number, texture: THREE.Texture, opacity: number, seed: number, twinkle = 0) {
  const random = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    const y = -0.08 + 1.08 * random();
    const theta = random() * Math.PI * 2;
    const horizontal = Math.sqrt(Math.max(0, 1 - y * y));
    const radius = radiusMin + random() * (radiusMax - radiusMin);
    positions[index * 3] = Math.cos(theta) * horizontal * radius;
    positions[index * 3 + 1] = 8 + y * radius;
    positions[index * 3 + 2] = -15 + Math.sin(theta) * horizontal * radius;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color, size, map: texture, transparent: true, opacity,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false,
  });
  const points = new THREE.Points(geometry, material);
  if (twinkle > 0) {
    geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(count * 3).fill(1), 3));
    material.vertexColors = true;
    const twinkleRandom = mulberry32(seed + 1);
    points.userData.twinkle = {
      amp: twinkle,
      phases: Float32Array.from({ length: count }, () => twinkleRandom() * Math.PI * 2),
      speeds: Float32Array.from({ length: count }, () => 1.6 + twinkleRandom() * 4.6),
    };
  }
  return points;
}

function scatterInstances(mesh: THREE.InstancedMesh, count: number, place: (index: number, dummy: THREE.Object3D) => void) {
  const dummy = new THREE.Object3D();
  for (let index = 0; index < count; index += 1) {
    place(index, dummy);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function catenary(from: THREE.Vector3, to: THREE.Vector3, sag: number, samples: number) {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const point = from.clone().lerp(to, t);
    point.y -= Math.sin(t * Math.PI) * sag;
    points.push(point);
  }
  return points;
}

/* ---------- world assembly ---------- */

function buildWorld(glow: THREE.Texture, soft: THREE.Texture) {
  const world = new THREE.Group();
  const lanterns: THREE.Group[] = [];

  /* main island — gate, courtyard, garden */
  const island = makeRockIsland(6.4);
  world.add(island);

  const grandTorii = makeTorii(1.2, true);
  grandTorii.position.set(0, 0.42, 4.6);
  world.add(grandTorii);

  const komainuA = makeKomainu();
  komainuA.position.set(-0.95, 0.45, 3.2);
  komainuA.rotation.y = 0.15;
  const komainuB = makeKomainu();
  komainuB.position.set(0.95, 0.45, 3.2);
  komainuB.rotation.y = -0.15;
  komainuB.scale.x = -1;
  world.add(komainuA, komainuB);

  const stoneMaterial = M.stone();
  for (let index = 0; index < 8; index += 1) {
    const stepStone = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.07, 6), stoneMaterial);
    stepStone.position.set(Math.sin(index * 1.3) * 0.35, 0.46, 4 - index * 0.95);
    world.add(stepStone);
  }

  const shrine = makeShrine(1.05);
  shrine.position.set(-1.8, 0.45, -2.9);
  shrine.rotation.y = 0.25;
  const sideShrine = makeShrine(0.5);
  sideShrine.position.set(0.8, 0.45, -3.9);
  sideShrine.rotation.y = -0.2;
  world.add(shrine, sideShrine);

  const ema = makeEmaBoard();
  ema.position.set(2.1, 0.45, -3.4);
  ema.rotation.y = -0.5;
  world.add(ema);

  const garden = makeZenGarden();
  garden.position.set(3.4, 0.45, -1.4);
  world.add(garden);

  const tsukubai = makeTsukubai();
  tsukubai.position.set(1.9, 0.45, 0.4);
  world.add(tsukubai);

  const pond = new THREE.Mesh(new THREE.CircleGeometry(1.05, 16), new THREE.MeshBasicMaterial({ color: 0x33356e }));
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(3, 0.465, 1.8);
  world.add(pond);

  const maple = makeBlossomTree(M.maple(), 1.15);
  maple.position.set(-3.8, 0.45, -0.5);
  const sakura = makeBlossomTree(M.sakura(), 1.3);
  sakura.position.set(4.3, 0.45, -3);
  world.add(maple, sakura);

  const pineSpots: Array<[number, number, number]> = [[5.4, 0.7, 1.05], [-4.7, -3.2, 1.15], [-2.9, 3.9, 0.75], [2.5, 4.3, 0.6]];
  pineSpots.forEach(([x, z, s]) => {
    const pine = makePine(s);
    pine.position.set(x, 0.42, z);
    world.add(pine);
  });

  [[1.25, 2.3, 0.95], [-1.35, 1, 0.95], [-2.7, -4.6, 0.8], [3.9, 0.3, 0.8]].forEach(([x, z, s]) => {
    const lantern = makeStoneLantern(glow, s);
    lantern.position.set(x, 0.45, z);
    world.add(lantern);
  });

  /* west islet — moved clear of the main island so the crossing is real */
  const islet = makeRockIsland(2);
  islet.position.set(-9.2, -0.75, 3);
  world.add(islet);
  const isletMaple = makeBlossomTree(M.maple(), 0.9);
  isletMaple.position.set(-9.7, -0.63, 2.6);
  const isletLantern = makeStoneLantern(glow, 0.8);
  isletLantern.position.set(-8.5, -0.63, 3.7);
  world.add(isletMaple, isletLantern);

  /* the bridge spans grass edge to islet surface — feet on both islands */
  const bridge = makeBridge(new THREE.Vector3(-5.6, 0.43, 1.83), new THREE.Vector3(-7.65, -0.58, 2.5), 0.5);
  world.add(bridge);

  /* grass, rocks, drifting pebbles (instanced) */
  const grass = new THREE.InstancedMesh(new THREE.ConeGeometry(0.055, 0.24, 4), new THREE.MeshLambertMaterial({ color: 0x3f7a68, flatShading: true }), 70);
  scatterInstances(grass, 70, (index, dummy) => {
    const angle = index * 2.39996; // golden angle spiral over the island top
    const radius = 1.1 + (index % 47) / 47 * 4.9;
    let x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(x) < 1 && z > -0.5) x += x < 0 ? -1.1 : 1.1; // keep the path clear
    dummy.position.set(x, 0.56, z);
    dummy.rotation.y = index;
    dummy.scale.setScalar(0.7 + ((index * 13) % 10) / 14);
    dummy.rotation.x = 0;
  });
  world.add(grass);

  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.13, 0), M.stoneDark(), 16);
  scatterInstances(rocks, 16, (index, dummy) => {
    const angle = index * 1.7 + 0.9;
    const radius = 2.2 + (index % 5);
    let x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 0.85;
    if (Math.abs(x) < 1.1 && z > -0.5) x += 1.4;
    dummy.position.set(x, 0.52, z);
    dummy.rotation.set(index, index * 2, 0);
    dummy.scale.set(1, 0.7, 1);
    dummy.scale.multiplyScalar(0.7 + (index % 4) / 4);
  });
  world.add(rocks);

  const pebbles = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.11, 0), new THREE.MeshLambertMaterial({ color: 0x3f3468, flatShading: true }), 14);
  scatterInstances(pebbles, 14, (index, dummy) => {
    dummy.position.set(
      -6 + (((index * 43) % 37) / 36 - 0.5) * 44,
      0.6 + (((index * 29) % 23) / 22 - 0.5) * 7,
      -10 + (((index * 17) % 31) / 30 - 0.5) * 36,
    );
    dummy.rotation.set(index * 1.3, index * 0.7, index * 0.4);
    dummy.scale.setScalar(0.3 + (index % 5) / 10);
  });
  world.add(pebbles);

  /* the route — six labeled curriculum islands, roped together */
  const routeSpecs: Array<{ pos: Vec3; radius: number }> = [
    { pos: [10.5, -0.7, -3], radius: 1.7 },
    { pos: [15.5, 0.5, -9], radius: 2.1 }, // roomier — the pagoda needs clearance from its sign
    { pos: [19.5, -0.5, -16], radius: 1.8 },
    { pos: [22.5, 0.7, -24], radius: 1.4 },
    { pos: [24.5, -0.3, -33], radius: 1.6 },
    { pos: [25.5, 0.5, -43], radius: 2 },
  ];
  const routeAnchors: THREE.Vector3[] = [];
  const stop2Camera = new THREE.Vector3(5.2, 4.4, 4.5);
  routeSpecs.forEach(({ pos, radius }, index) => {
    const [x, y, z] = pos;
    const rock = makeRockIsland(radius, true);
    rock.position.set(x, y, z);
    world.add(rock);
    // the grassy top sits at radius * 0.07 above the island origin
    const surface = y + radius * 0.07;
    routeAnchors.push(new THREE.Vector3(x, surface + 0.3, z));

    /* the sign goes to the camera's left, the landmark to its right —
       perpendicular to the stop-2 view axis, so they never stack up */
    const toCamera = new THREE.Vector3(stop2Camera.x - x, 0, stop2Camera.z - z).normalize();
    const side = new THREE.Vector3(-toCamera.z, 0, toCamera.x);
    const signX = x + toCamera.x * radius * 0.25 + side.x * radius * 0.55;
    const signZ = z + toCamera.z * radius * 0.25 + side.z * radius * 0.55;
    const signAngle = Math.atan2(stop2Camera.x - signX, stop2Camera.z - signZ);
    const sign = makeSign(TRACK_GLYPHS[index], signAngle);
    sign.position.set(signX, surface - 0.02, signZ);
    world.add(sign);

    let landmark: THREE.Object3D;
    if (index === 0) { landmark = makeTorii(0.55); landmark.rotation.y = signAngle; }
    else if (index === 1) { landmark = makePagoda(); landmark.scale.setScalar(0.85); }
    else if (index === 2) { landmark = makeStele("道"); landmark.rotation.y = signAngle; }
    else if (index === 3) { landmark = new THREE.Group(); [[-0.4, 0.8], [0.35, 1.05], [0, 0.6]].forEach(([px, s]) => { const pine = makePine(s); pine.position.set(px, 0, px * 0.5); landmark.add(pine); }); }
    else if (index === 4) { landmark = makeBellTower(); }
    else { landmark = makeShrine(0.55); landmark.rotation.y = signAngle; }
    landmark.position.set(
      x - side.x * radius * 0.35 - toCamera.x * radius * 0.15,
      surface - 0.02,
      z - side.z * radius * 0.35 - toCamera.z * radius * 0.15,
    );
    world.add(landmark);
  });

  /* rope bridges between route islands */
  const plankCount = (routeAnchors.length - 1) * 9;
  const planks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.05, 0.16), M.wood(), plankCount);
  const ropePositions: number[] = [];
  let plankIndex = 0;
  const plankDummy = new THREE.Object3D();
  for (let span = 0; span < routeAnchors.length - 1; span += 1) {
    const from = routeAnchors[span];
    const to = routeAnchors[span + 1];
    const direction = to.clone().sub(from);
    const yaw = Math.atan2(direction.x, direction.z);
    const walkway = catenary(from, to, 0.9, 9);
    walkway.slice(1, -1).forEach((point) => {
      plankDummy.position.copy(point);
      plankDummy.rotation.set(0, yaw + Math.PI / 2, 0);
      plankDummy.updateMatrix();
      planks.setMatrixAt(plankIndex, plankDummy.matrix);
      plankIndex += 1;
    });
    [-0.22, 0.22].forEach((side) => {
      const offset = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)).multiplyScalar(side);
      const rope = catenary(from.clone().add(offset).add(new THREE.Vector3(0, 0.35, 0)), to.clone().add(offset).add(new THREE.Vector3(0, 0.35, 0)), 0.7, 10);
      for (let index = 0; index < rope.length - 1; index += 1) {
        ropePositions.push(rope[index].x, rope[index].y, rope[index].z, rope[index + 1].x, rope[index + 1].y, rope[index + 1].z);
      }
    });
  }
  planks.count = plankIndex;
  world.add(planks);
  const ropeGeometry = new THREE.BufferGeometry();
  ropeGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ropePositions), 3));
  world.add(new THREE.LineSegments(ropeGeometry, new THREE.LineBasicMaterial({ color: 0x8d7fb8, transparent: true, opacity: 0.55 })));

  /* lantern festival — platform, poles, strung garlands, floating field */
  const platform = makeRockIsland(1.7, true);
  platform.position.set(-13, 1, -10);
  world.add(platform);
  const poleMaterial = M.wood();
  const poleTops: THREE.Vector3[] = [];
  [[-14.2, -10.3], [-11.8, -9.7]].forEach(([x, z]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.1, 6), poleMaterial);
    pole.position.set(x, 2.63, z); // base sunk just into the platform surface
    world.add(pole);
    poleTops.push(new THREE.Vector3(x, 4.18, z));
  });

  const stringAnchors: Array<[THREE.Vector3, THREE.Vector3]> = [
    [poleTops[0], poleTops[1]],
    [poleTops[0], new THREE.Vector3(-17.5, 5.4, -14)],
    [poleTops[1], new THREE.Vector3(-9.5, 5.8, -14.5)],
    [new THREE.Vector3(-17.5, 5.4, -14), new THREE.Vector3(-13.5, 7, -18.5)],
    [new THREE.Vector3(-9.5, 5.8, -14.5), new THREE.Vector3(-12.5, 7.4, -19)],
  ];
  const wirePositions: number[] = [];
  const miniLanterns = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 6, 5), M.paper(), stringAnchors.length * 7);
  let miniIndex = 0;
  const miniDummy = new THREE.Object3D();
  stringAnchors.forEach(([from, to]) => {
    const wire = catenary(from, to, 0.55, 14);
    for (let index = 0; index < wire.length - 1; index += 1) {
      wirePositions.push(wire[index].x, wire[index].y, wire[index].z, wire[index + 1].x, wire[index + 1].y, wire[index + 1].z);
    }
    for (let index = 1; index <= 7; index += 1) {
      const point = wire[index * 2];
      miniDummy.position.set(point.x, point.y - 0.12, point.z);
      miniDummy.scale.setScalar(0.8 + (index % 3) * 0.2);
      miniDummy.updateMatrix();
      miniLanterns.setMatrixAt(miniIndex, miniDummy.matrix);
      miniIndex += 1;
    }
  });
  world.add(miniLanterns);
  const wireGeometry = new THREE.BufferGeometry();
  wireGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(wirePositions), 3));
  world.add(new THREE.LineSegments(wireGeometry, new THREE.LineBasicMaterial({ color: 0x8d7fb8, transparent: true, opacity: 0.5 })));

  for (let index = 0; index < 40; index += 1) {
    const lantern = makePaperLantern(glow);
    lantern.position.set(
      -14 + (((index * 29) % 23) / 22 - 0.5) * 11,
      4.2 + (((index * 41) % 19) / 18 - 0.5) * 6.5,
      -14 + (((index * 13) % 17) / 16 - 0.5) * 11,
    );
    lantern.scale.setScalar(0.5 + ((index * 7) % 10) / 20);
    world.add(lantern);
    lanterns.push(lantern);
  }

  /* memory orrery — rings and orbiting cards in its own open sky,
     well clear of the lantern festival */
  const orrery = new THREE.Group();
  orrery.position.set(-25, 11, 1);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), M.warm());
  const coreHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffb45e, transparent: true, opacity: 0.7, depthWrite: false }));
  coreHalo.scale.setScalar(4);
  orrery.add(core, coreHalo);
  const orbitCards: THREE.Mesh[] = [];
  const ringSpecs: Array<[number, number, number]> = [[1.3, 0.5, 0.35], [2.1, -0.35, 0.42], [2.9, 0.25, -0.3]];
  ringSpecs.forEach(([radius, tiltX, tiltZ], ringIndex) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.025, 6, 60), new THREE.MeshBasicMaterial({ color: 0xcdb8ff, transparent: true, opacity: 0.5 }));
    ring.rotation.set(Math.PI / 2 + tiltX, 0, tiltZ);
    orrery.add(ring);
    for (let cardIndex = 0; cardIndex < 2; cardIndex += 1) {
      const card = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.3), new THREE.MeshBasicMaterial({ color: 0xffd9a0, side: THREE.DoubleSide }));
      card.userData = { radius, tiltX, tiltZ, angle: cardIndex * Math.PI + ringIndex, speed: 0.28 - ringIndex * 0.07 };
      orrery.add(card);
      orbitCards.push(card);
    }
  });
  world.add(orrery);

  /* clouds — a sea below, wisps between, a few above */
  const cloudSeaSpecs: Array<[number, number, number, number]> = [
    [-8, -7.5, 6, 5], [6, -8.2, -4, 6], [-20, -7.8, -8, 5.5], [18, -7.2, -18, 6.5],
    [-2, -8.5, -24, 7], [-28, -8, -28, 6], [12, -7.6, 12, 5], [28, -8.4, -38, 7],
    [-16, -8.8, 14, 5.5], [2, -7.9, -44, 6.5], [36, -7.4, -10, 5], [-34, -8.2, 2, 5.5],
  ];
  cloudSeaSpecs.forEach(([x, y, z, s]) => {
    const cloud = makeCloud(s, true);
    cloud.position.set(x, y, z);
    world.add(cloud);
  });
  const midCloudSpecs: Array<[number, number, number, number]> = [
    [-28, 10.5, -33, 2.6], [-2, 13, -36, 3.2], [14, 12, -30, 2.2], [24, 14, -44, 3.4], [-30, 12.5, -46, 2.4], [16, 17, -24, 2],
    [-40, 14, 8, 2.6], [-34, 8.5, -9, 1.8],
  ];
  midCloudSpecs.forEach(([x, y, z, s]) => {
    const cloud = makeCloud(s);
    cloud.position.set(x, y, z);
    world.add(cloud);
  });

  /* the torii constellation — progress written in stars */
  const constellation = new THREE.Group();
  constellation.position.set(-9, 25, -54);
  const starSpots: Vec3[] = [
    [-4, 0, 0], [-4, 3.4, 0], [-4.6, 4.6, 0], [4, 0, 0], [4, 3.4, 0], [4.6, 4.6, 0],
    [-5.6, 4.4, 0], [5.6, 4.4, 0], [0, 4.7, 0], [-2.6, 3.4, 0], [2.6, 3.4, 0], [0, 3.4, 0],
  ];
  const linkPairs: Array<[number, number]> = [[0, 1], [3, 4], [6, 2], [2, 8], [8, 5], [5, 7], [1, 9], [9, 11], [11, 10], [10, 4]];
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(starSpots.flat()), 3));
  const constellationStars = new THREE.Points(starGeometry, new THREE.PointsMaterial({
    color: 0xffe9c7, size: 1.8, map: soft, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  }));
  const linkPositions: number[] = [];
  linkPairs.forEach(([a, b]) => linkPositions.push(...starSpots[a], ...starSpots[b]));
  const linkGeometry = new THREE.BufferGeometry();
  linkGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(linkPositions), 3));
  const constellationLines = new THREE.LineSegments(linkGeometry, new THREE.LineBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.45 }));
  constellation.add(constellationStars, constellationLines);
  world.add(constellation);

  /* a real moon — cratered, lit, slowly turning */
  const moon = makeMoon(7);
  moon.position.set(-34, 30, -80);
  const moonHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xf6e7c8, transparent: true, opacity: 0.4, depthWrite: false }));
  moonHalo.scale.setScalar(32);
  moonHalo.position.copy(moon.position);
  world.add(moon, moonHalo);

  /* mist hugging the islands */
  const mistA = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: 0x8a7bd8, transparent: true, opacity: 0.14, depthWrite: false }));
  mistA.scale.set(26, 7, 1);
  mistA.position.set(0, -3.8, -2);
  const mistB = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: 0x9a6ba8, transparent: true, opacity: 0.1, depthWrite: false }));
  mistB.scale.set(18, 5, 1);
  mistB.position.set(-13, 0, -14);
  world.add(mistA, mistB);

  /* ambient particles — a three-layer star dome, fog-exempt like the moon */
  const stars = makeStarShell(2600, 115, 165, 0xffffff, 1.3, soft, 1, 11, 0.92);
  const starsFine = makeStarShell(2000, 130, 185, 0xcfd8ff, 0.8, soft, 0.65, 23, 0.85);
  const starsBright = makeStarShell(130, 110, 150, 0xfff2d8, 2.4, soft, 0.95, 37, 0.78);
  const fireflies = makePoints(70, [26, 9, 24], [-4, 3.5, -4], 0xffd27e, 0.42, glow, 0.85, 51);
  const petals = makePoints(90, [26, 14, 22], [3, 5, -1], 0xf2a7c3, 0.3, soft, 0.65, 67);
  world.add(stars, starsFine, starsBright, fireflies, petals);

  /* shooting stars */
  const streaks = [0, 1].map(() => {
    const streak = new THREE.Sprite(new THREE.SpriteMaterial({
      map: soft, color: 0xffffff, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    streak.scale.set(7, 0.09, 1);
    world.add(streak);
    return streak;
  });

  return { world, lanterns, stars, starsFine, starsBright, fireflies, petals, streaks, orbitCards, pebbles, constellationStars, moon };
}

type StreakState = { active: boolean; life: number; nextAt: number; velocity: THREE.Vector3 };

export function WorldScene() {
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
    scene.fog = new THREE.FogExp2(0x241d4e, 0.0095);
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 300);

    const hemisphere = new THREE.HemisphereLight(0x8d7fd8, 0xd4694a, 1.0);
    const warm = new THREE.DirectionalLight(0xffb45e, 1.1);
    warm.position.set(-14, 6, 10);
    const cool = new THREE.DirectionalLight(0x7f9fe8, 0.4);
    cool.position.set(10, 14, -8);
    scene.add(hemisphere, warm, cool);

    const glow = glowTexture("rgba(255,220,170,1)", "rgba(255,160,80,0.35)");
    const soft = glowTexture("rgba(255,255,255,1)", "rgba(255,255,255,0.3)");
    const { world, lanterns, stars, starsFine, starsBright, fireflies, petals, streaks, orbitCards, pebbles, constellationStars, moon } = buildWorld(glow, soft);
    scene.add(world);

    const sky = document.querySelector<HTMLElement>(".w-sky");

    /* stop-aware spline: sections map to stop control points, with shaping
       mids between them, so every section lands exactly on its composition */
    const positionCurve = new THREE.CatmullRomCurve3(FLIGHT.map(({ p }) => new THREE.Vector3(...p)), false, "centripetal", 0.6);
    const targetCurve = new THREE.CatmullRomCurve3(FLIGHT.map(({ t }) => new THREE.Vector3(...t)), false, "centripetal", 0.6);
    const stopU = FLIGHT.map((point, index) => (point.stop ? index / (FLIGHT.length - 1) : null)).filter((u): u is number => u !== null);
    /* Each section holds the camera at its stop for DWELL of the scroll on
       both sides, and the transit in between is smoothstepped — so shots
       linger while cards are read, then glide. */
    const DWELL = 0.22;
    const progressToU = (progress: number) => {
      const scaled = Math.min(0.9999, Math.max(0, progress)) * (stopU.length - 1);
      const section = Math.floor(scaled);
      let f = (scaled - section - DWELL) / (1 - 2 * DWELL);
      f = Math.min(1, Math.max(0, f));
      f = f * f * (3 - 2 * f);
      return stopU[section] + (stopU[section + 1] - stopU[section]) * f;
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desiredPosition = new THREE.Vector3(...FLIGHT[0].p);
    const desiredTarget = new THREE.Vector3(...FLIGHT[0].t);
    const currentTarget = desiredTarget.clone();
    camera.position.copy(desiredPosition);
    camera.lookAt(currentTarget);

    const petalPositions = petals.geometry.getAttribute("position") as THREE.BufferAttribute;
    const petalSpeeds = Float32Array.from({ length: petalPositions.count }, (_, index) => 0.28 + ((index * 31) % 17) / 17 * 0.5);

    const streakStates: StreakState[] = streaks.map((_, index) => ({
      active: false, life: 0, nextAt: 3 + index * 5, velocity: new THREE.Vector3(),
    }));

    let pointerX = 0;
    let pointerY = 0;
    let frame = 0;
    let lastTime = 0;
    let bank = 0;
    let previousCameraX = camera.position.x;

    /* The camera anchors to real section centres, so it rests exactly while
       each section's pinned card is on screen, whatever the section heights. */
    let sectionCenters: number[] = [];
    const measureSections = () => {
      const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-stop]"));
      if (sections.length < 2) return;
      const viewport = window.innerHeight;
      sectionCenters = sections.map((section) => section.offsetTop + section.offsetHeight / 2 - viewport / 2);
    };
    const scrollToU = () => {
      if (sectionCenters.length < 2) return 0;
      const y = window.scrollY;
      let segment = 0;
      while (segment < sectionCenters.length - 2 && y > sectionCenters[segment + 1]) segment += 1;
      let f = (y - sectionCenters[segment]) / Math.max(1, sectionCenters[segment + 1] - sectionCenters[segment]);
      f = (Math.min(1, Math.max(0, f)) - DWELL) / (1 - 2 * DWELL);
      f = Math.min(1, Math.max(0, f));
      f = f * f * (3 - 2 * f);
      return stopU[segment] + (stopU[segment + 1] - stopU[segment]) * f;
    };

    const resize = () => {
      const { clientWidth: width, clientHeight: height } = canvas;
      if (!width || !height) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const updateStreaks = (time: number, delta: number) => {
      streakStates.forEach((state, index) => {
        const streak = streaks[index];
        if (!state.active) {
          if (time >= state.nextAt) {
            state.active = true;
            state.life = 0;
            streak.position.set((Math.random() - 0.5) * 110, 26 + Math.random() * 18, -64);
            state.velocity.set(-(12 + Math.random() * 10), -(4 + Math.random() * 3), 0);
            streak.material.rotation = Math.atan2(state.velocity.y, state.velocity.x);
          }
          return;
        }
        state.life += delta / 1.2;
        streak.position.addScaledVector(state.velocity, delta);
        streak.material.opacity = Math.sin(Math.min(1, state.life) * Math.PI) * 0.85;
        if (state.life >= 1) {
          state.active = false;
          streak.material.opacity = 0;
          state.nextAt = time + 5 + Math.random() * 8;
        }
      });
    };

    const twinkleLayers = [stars, starsFine, starsBright];
    const updateTwinkle = (time: number) => {
      twinkleLayers.forEach((layer) => {
        const twinkle = layer.userData.twinkle as { amp: number; phases: Float32Array; speeds: Float32Array } | undefined;
        if (!twinkle) return;
        const colors = layer.geometry.getAttribute("color") as THREE.BufferAttribute;
        for (let index = 0; index < twinkle.phases.length; index += 1) {
          const level = 1 - twinkle.amp * (0.5 + 0.5 * Math.sin(time * twinkle.speeds[index] + twinkle.phases[index]));
          colors.setXYZ(index, level, level, level);
        }
        colors.needsUpdate = true;
      });
    };

    const orbitAxis = new THREE.Vector3();
    const placeOrbitCard = (card: THREE.Mesh, time: number) => {
      const { radius, tiltX, tiltZ, angle, speed } = card.userData as { radius: number; tiltX: number; tiltZ: number; angle: number; speed: number };
      const theta = angle + time * speed;
      orbitAxis.set(Math.cos(theta) * radius, 0, Math.sin(theta) * radius);
      orbitAxis.applyEuler(new THREE.Euler(tiltX, 0, tiltZ));
      card.position.copy(orbitAxis);
      card.lookAt(0, 0, 0);
    };

    const render = (timestamp: number) => {
      frame = window.requestAnimationFrame(render);
      const time = timestamp * 0.001;
      const delta = Math.min(0.05, lastTime ? time - lastTime : 0.016);
      lastTime = time;

      if (!reducedMotion.matches) {
        const u = scrollToU();
        positionCurve.getPoint(u, desiredPosition);
        targetCurve.getPoint(u, desiredTarget);

        lanterns.forEach((lantern, index) => {
          lantern.position.y += Math.sin(time * 0.6 + index * 1.7) * 0.0035;
          lantern.rotation.y = Math.sin(time * 0.3 + index) * 0.2;
          const halo = lantern.userData.halo as THREE.Sprite | undefined;
          if (halo) halo.material.opacity = 0.42 + Math.sin(time * 2.1 + index * 2.4) * 0.13;
        });

        world.position.y = Math.sin(time * 0.4) * 0.12;
        fireflies.rotation.y = time * 0.02;
        (fireflies.material as THREE.PointsMaterial).opacity = 0.62 + Math.sin(time * 1.3) * 0.22;
        updateTwinkle(time);
        (constellationStars.material as THREE.PointsMaterial).opacity = 0.72 + Math.sin(time * 1.4) * 0.26;
        pebbles.rotation.y = time * 0.012;
        moon.rotation.y = time * 0.018;

        orbitCards.forEach((card) => placeOrbitCard(card, time));

        for (let index = 0; index < petalPositions.count; index += 1) {
          let y = petalPositions.getY(index) - petalSpeeds[index] * delta;
          if (y < -3) y += 15;
          petalPositions.setY(index, y);
          petalPositions.setX(index, petalPositions.getX(index) + Math.sin(time * 0.8 + index) * 0.004);
        }
        petalPositions.needsUpdate = true;

        updateStreaks(time, delta);

        if (sky) {
          const altitude = Math.min(34, Math.max(0, (camera.position.y - 2.4) * 4));
          sky.style.transform = `translate3d(0, ${altitude.toFixed(2)}vh, 0)`;
        }
      }

      camera.position.x += (desiredPosition.x + pointerX * 1.1 - camera.position.x) * 0.055;
      camera.position.y += (desiredPosition.y - pointerY * 0.8 - camera.position.y) * 0.055;
      camera.position.z += (desiredPosition.z - camera.position.z) * 0.055;
      currentTarget.lerp(desiredTarget, 0.055);
      camera.lookAt(currentTarget);

      /* gentle banking on lateral movement, like a real flight */
      const lateral = camera.position.x - previousCameraX;
      previousCameraX = camera.position.x;
      bank += (Math.max(-0.05, Math.min(0.05, -lateral * 0.5)) - bank) * 0.06;
      camera.rotateZ(bank);

      renderer.render(scene, camera);
      canvas.classList.add("is-on");
    };

    /* dev-only hook: lets tooling park the camera at an exact progress and
       force a frame, so compositions can be verified from rendered stills */
    const devHook = {
      setProgress: (progress: number) => {
        const u = progressToU(progress);
        positionCurve.getPoint(u, desiredPosition);
        targetCurve.getPoint(u, desiredTarget);
        camera.position.copy(desiredPosition);
        currentTarget.copy(desiredTarget);
        camera.lookAt(currentTarget);
      },
      snap: (time = 0) => {
        if (time > 0) {
          updateTwinkle(time);
          orbitCards.forEach((card) => placeOrbitCard(card, time));
        }
        renderer.render(scene, camera);
        return canvas;
      },
      setSize: (width: number, height: number) => {
        renderer.setPixelRatio(1);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      },
      look: (px: number, py: number, pz: number, tx: number, ty: number, tz: number) => {
        desiredPosition.set(px, py, pz);
        desiredTarget.set(tx, ty, tz);
        camera.position.copy(desiredPosition);
        currentTarget.copy(desiredTarget);
        camera.lookAt(currentTarget);
      },
    };
    (window as unknown as { __nightflight?: typeof devHook }).__nightflight = devHook;

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
        lastTime = 0;
        frame = window.requestAnimationFrame(render);
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const layoutObserver = new ResizeObserver(measureSections);
    layoutObserver.observe(document.body);
    resize();
    measureSections();
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    frame = window.requestAnimationFrame(render);

    return () => {
      resizeObserver.disconnect();
      layoutObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      delete (window as unknown as { __nightflight?: unknown }).__nightflight;
      if (frame) window.cancelAnimationFrame(frame);
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        if (!mesh.material) return;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => {
          (material as THREE.MeshBasicMaterial).map?.dispose();
          material.dispose();
        });
      });
      glow.dispose();
      soft.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="w-canvas" aria-hidden="true" />;
}
