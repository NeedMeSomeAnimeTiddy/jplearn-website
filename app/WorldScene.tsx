"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { islandDetails, roofDetails, shrineDetails, toriiDetails, blockPine, blockBlossom, courtyardDetails, pagodaDetails, compileBlockDetails, lanternField, stoneLanternDetails, signDetails, festivalDetails, streamDetails, bridgeDetails } from "./WorldDetails";

/* A twilight floating-shrine world. Each scroll stop frames a purpose-built
   diorama: the grand gate, the shrine courtyard, six labeled curriculum
   islands, a lantern festival, a memory orrery, and a torii constellation.
   The camera flies a shaped spline (stops + shaping mids) with gentle
   easing and a level horizon; the fixed CSS sky shifts with camera altitude. */

type Vec3 = [number, number, number];
type FlightPoint = { p: Vec3; t: Vec3; stop?: boolean };

/* Cards alternate sides per section, so each subject is framed on the
   opposite side: stops 1/3/5 push subjects left, 0/2/4/6 push them right. */
const FLIGHT: FlightPoint[] = [
  { p: [-2, 6.8, 24], t: [-5.4, 0.5, 0], stop: true },     // 0 the gate — island right of frame
  { p: [0, 2.15, 10], t: [0, 1.9, 4.4] },                    //   locked approach to the torii
  { p: [0.2, 1.9, 3.1], t: [-0.4, 1.15, -3.1], stop: true }, // 1 threshold — shrine left of frame
  { p: [4.8, 3.6, 5.5], t: [7, 1, -8] },                     //   swing right over the garden
  { p: [5.2, 7.8, 10], t: [11.5, -0.5, -22], stop: true },  // 2 the route — chain recedes right
  { p: [-0.5, 5.6, 6.5], t: [-7, 2.5, -8] },                 //   arc back high across the island
  { p: [-8.8, 3.5, -8.2], t: [-15.5, 4.2, -14.5], stop: true }, // 3 lanterns — field left of frame
  { p: [-16, 7.2, -5], t: [-25, 11.2, 5], stop: true },         // 4 memory — orrery in open sky, upper right
  { p: [-13.5, 5.6, 2.5], t: [-7, 0.8, 9] },                 //   bank the gaze south so the turn is a pan, not a snap
  { p: [-7.5, 4.6, 2.8], t: [-2.4, 1.4, -2.4] },             //   descend around the west islet, clearing the maple
  { p: [1.9, 1.8, 0.7], t: [-1.5, 1.3, -3.5], stop: true },  // 5 tutor — shrine and maple left
  { p: [3.5, 7.5, 4], t: [-4, 13, -25] },                    //   spiral ascent
  { p: [-1, 16, -16], t: [-13, 25, -53], stop: true },       // 6 stars — constellation upper right
  { p: [8, 8.5, 17], t: [0, 2.6, 0] },                       //   swooping dive home
  { p: [0, 7, 30], t: [0, 3.4, 0], stop: true },           // 7 landing — centered, mirroring the gate
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

/* One small atlas serves all six orbiting study cards. */
function orbitCardAtlas() {
  const canvas = document.createElement("canvas");
  canvas.width = 768; canvas.height = 96;
  const context = canvas.getContext("2d");
  if (context) TRACK_GLYPHS.forEach((glyph, index) => {
    const x = index * 128;
    context.fillStyle = "#efd8ad"; context.fillRect(x, 0, 128, 96);
    context.strokeStyle = "#ad7b54"; context.lineWidth = 4; context.strokeRect(x + 7, 7, 114, 82);
    context.fillStyle = "#695266"; context.font = '46px "Yu Gothic", sans-serif';
    context.textAlign = "center"; context.textBaseline = "middle"; context.fillText(glyph, x + 64, 42);
    context.fillStyle = "#b69978";
    for (let line = 0; line < 3; line++) context.fillRect(x + 35 + line * 5, 69 + line * 5, 58 - line * 10, 2);
  });
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
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
  wall: () => new THREE.MeshLambertMaterial({ color: 0x9b7783, flatShading: true }),
  roof: () => new THREE.MeshLambertMaterial({ color: 0x38465e, flatShading: true }),
  dark: () => new THREE.MeshLambertMaterial({ color: 0x30224a }),
  pine: () => new THREE.MeshLambertMaterial({ color: 0x427a71, flatShading: true }),
  trunk: () => new THREE.MeshLambertMaterial({ color: 0x3d2f4a }),
  maple: () => new THREE.MeshLambertMaterial({ color: 0xc25668, flatShading: true }),
  sakura: () => new THREE.MeshLambertMaterial({ color: 0xe58fae, flatShading: true }),
  gold: () => new THREE.MeshLambertMaterial({ color: 0xc9a15a, flatShading: true }),
  warm: () => new THREE.MeshBasicMaterial({ color: 0xffb45e }),
  paper: () => new THREE.MeshBasicMaterial({ color: 0xffd9a0 }),
  white: () => new THREE.MeshBasicMaterial({ color: 0xf3ecff, side: THREE.DoubleSide }),
};

/* ---------- builders ---------- */

/* Radial strata share their vertices at each seam. The plateau remains at
   +0.07r so every existing landmark and bridge keeps its ground contact. */
function makeRockIsland(radius: number, far = false) {
  const island = new THREE.Group();
  const sides = 32;
  // One exposed shell: paired rings form actual stone shelves, without a second
  // layer of intersecting cuboids or coplanar faces that flicker during flight.
  const levels = [[0.07, 1], [-0.08, 1], [-0.08, 0.93], [-0.32, 0.9], [-0.32, 0.83], [-0.57, 0.77], [-0.57, 0.68], [-0.86, 0.53], [-0.86, 0.43], [-1.12, 0.22], [-1.23, 0.04]];
  const palette = [0x487765, 0x72857f, 0x6d7887, 0x8b9297, 0x646e82, 0x788390, 0x59677c, 0x74808a, 0x515e75, 0x48566d];
  const vertices: number[] = [];
  const colors: number[] = [];
  const point = (level: number, i: number) => {
    const a = (i % sides) / sides * Math.PI * 2;
    const crag = 1 + Math.sin(a * 5 + 0.4) * 0.045 + Math.cos(a * 9) * 0.025;
    const [y, r] = levels[level];
    return new THREE.Vector3(Math.cos(a) * r * radius * crag, y * radius + (level === 0 ? 0 : Math.sin(a * 5 + 0.4) * radius * 0.028), Math.sin(a) * r * radius * crag);
  };
  const face = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, color: number, shade: number) => {
    const tint = new THREE.Color(color).multiplyScalar(shade * (far ? 0.9 : 1));
    vertices.push(...a.toArray(), ...b.toArray(), ...c.toArray());
    for (let i = 0; i < 3; i++) colors.push(tint.r, tint.g, tint.b);
  };
  for (let i = 0; i < sides; i++) {
    face(new THREE.Vector3(0, radius * 0.07, 0), point(0, i + 1), point(0, i), 0x568d78, 0.94 + (i % 5) * 0.025);
    for (let level = 0; level < levels.length - 1; level++) {
      const a = point(level, i), b = point(level, i + 1), c = point(level + 1, i), d = point(level + 1, i + 1);
      const shade = 0.92 + Math.sin(i * 1.7 + Math.floor(level / 2)) * 0.065;
      face(a, b, c, palette[level], shade);
      face(b, d, c, palette[level], shade);
    }
    face(new THREE.Vector3(0, -radius * 1.25, 0), point(levels.length - 1, i), point(levels.length - 1, i + 1), 0x48566d, 0.9);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  island.add(new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));

  // Hanging moss follows the cliff, leaving the walkable plateau unobstructed.
  const moss = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), M.pine(), sides);
  scatterInstances(moss, sides, (i, dummy) => {
    const a = i / sides * Math.PI * 2;
    const length = radius * (0.06 + (i % 5) * 0.018);
    dummy.position.set(Math.cos(a) * radius * 0.97, -length * 0.4, Math.sin(a) * radius * 0.97);
    dummy.scale.set(radius * 0.045, length, radius * 0.045);
    dummy.rotation.set(0, -a, 0.12);
  });
  island.add(moss, islandDetails(radius));
  return island;
}

/* A shallow curved hip roof, with lifted eaves instead of a solid pyramid. */
function makeRoof(width: number, height: number) {
  const vertices: number[] = [];
  const levels = [[1, 0.12], [0.74, 0.2], [0.36, 0.72], [0.035, 1]];
  const corners = (r: number, y: number) => [[-r, y, -r], [-r, y, r], [r, y, r], [r, y, -r]];
  for (let tier = 0; tier < levels.length - 1; tier++) {
    const lower = corners(levels[tier][0] * width, levels[tier][1] * height);
    const upper = corners(levels[tier + 1][0] * width, levels[tier + 1][1] * height);
    for (let i = 0; i < 4; i++) {
      const n = (i + 1) % 4;
      vertices.push(...lower[i], ...lower[n], ...upper[i], ...lower[n], ...upper[n], ...upper[i]);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  const material = M.roof();
  material.side = THREE.DoubleSide;
  const roof = new THREE.Group();
  roof.add(new THREE.Mesh(geometry, material), roofDetails(width, height));
  return roof;
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
  torii.add(toriiDetails());
  torii.scale.setScalar(scale);
  return torii;
}

function makeShrine(scale = 1) {
  const shrine = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.3, 2), M.wall());
  base.position.y = 0.15;
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.1, 1.5), M.wall());
  body.position.y = 0.95;
  const roof = makeRoof(1.42, 0.85);
  roof.position.y = 1.48;
  const roofTop = makeRoof(0.82, 0.55);
  roofTop.position.y = 2.16;

  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), M.warm());
  door.position.set(0, 0.85, 0.755);
  const lampA = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), M.paper());
  lampA.position.set(-0.75, 1.35, 0.78);
  const lampB = lampA.clone();
  lampB.position.x = 0.75;
  shrine.add(base, body, roof, roofTop, door, lampA, lampB);
  const timber = M.redDark();
  [-0.84, -0.38, 0.38, 0.84].forEach((x) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.12, 0.08), timber);
    post.position.set(x, 0.94, 0.8);
    shrine.add(post);
  });
  [0.48, 0.65, 0.82, 0.99, 1.16, 1.33].forEach((y) => {
    [-0.64, 0.64].forEach((x) => {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.025, 0.07), M.gold());
      slat.position.set(x, y, 0.79);
      shrine.add(slat);
    });
  });
  const porch = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.12, 0.65), M.wood());
  porch.position.set(0, 0.3, 1.0);
  shrine.add(porch);
  shrine.add(shrineDetails());
  shrine.scale.setScalar(scale);
  return shrine;
}

function makePine(scale = 1) {
  const pine = new THREE.Group();
  pine.add(blockPine());
  pine.scale.setScalar(scale);
  return pine;
}

function makeBlossomTree(material: THREE.MeshLambertMaterial, scale = 1) {
  const tree = new THREE.Group();
  tree.add(blockBlossom(material.color.getHex()));
  material.dispose();
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
  lantern.add(base, stem, chamber, roof, halo, stoneLanternDetails());
  lantern.scale.setScalar(scale);
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
    const roof = makeRoof(width * 0.8, 0.45);
    roof.position.y = y + 0.56;
    const detail = pagodaDetails(width);
    detail.position.y = y;
    pagoda.add(body, roof, detail);
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
  sign.add(board, face, signDetails());
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
  bridge.add(bridgeDetails(from, to, bow));
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

/* Opaque, low-poly billows have readable volume without translucent box
   overlaps. Faceted lobes preserve the world's angular art direction. */
function makeCloud(scale: number, flat = false) {
  const lobes = [
    [-2.35, -0.22, 0.02, 0.95, 0.63, 0.85],
    [-1.25, 0.05, -0.2, 1.32, 0.95, 1.05],
    [0, 0.48, 0, 1.48, 1.3, 1.2],
    [1.35, 0.06, 0.1, 1.18, 1, 1.05],
    [2.3, -0.28, 0, 0.88, 0.57, 0.75],
    [-0.45, -0.26, 0.8, 1.2, 0.7, 0.86],
    [0.7, -0.22, -0.65, 1.25, 0.7, 0.85],
  ];
  const parts = lobes.map(([x, y, z, rx, ry, rz]) => {
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    geometry.scale(rx, ry, rz);
    geometry.translate(x, y, z);
    return geometry;
  });
  const geometry = mergeGeometries(parts)!;
  parts.forEach((part) => part.dispose());
  const cloud = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({
    color: flat ? 0xc4c8dd : 0xd1d5e4, emissive: 0x657189, emissiveIntensity: 0.35, flatShading: true,
  }));
  cloud.scale.set(scale, scale * (flat ? 0.58 : 0.95), scale * 0.9);
  cloud.rotation.y = Math.sin(scale * 7.3) * 0.55;
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
    const parameters = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      parameters[i * 3] = twinkleRandom() * Math.PI * 2;
      parameters[i * 3 + 1] = 1.6 + twinkleRandom() * 4.6;
      parameters[i * 3 + 2] = twinkle;
    }
    geometry.setAttribute("twinkleParameters", new THREE.BufferAttribute(parameters, 3));
    const timeUniform = { value: 0 };
    material.userData.twinkleTime = timeUniform;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.twinkleTime = timeUniform;
      shader.vertexShader = "attribute vec3 twinkleParameters;\nuniform float twinkleTime;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <color_vertex>",
        "#include <color_vertex>\nvColor *= 1.0 - twinkleParameters.z * (0.5 + 0.5 * sin(twinkleTime * twinkleParameters.y + twinkleParameters.x));");
    };
    material.customProgramCacheKey = () => "world-star-twinkle-v1";

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

/* Bake opaque stationary props by material. Animated groups and textured signs
   keep their own transforms; repeated foliage already uses instancing. */
function batchStaticGeometry(world: THREE.Group, animated: THREE.Object3D[]) {
  world.updateMatrixWorld(true);
  const excluded = new Set<THREE.Object3D>();
  animated.forEach((root) => root.traverse((object) => excluded.add(object)));
  const buckets = new Map<string, THREE.Mesh[]>();
  world.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh || excluded.has(object)) return;
    const material = object.material as THREE.MeshLambertMaterial;
    if (Array.isArray(material) || material.transparent || material.map) return;
    const position = new THREE.Vector3().setFromMatrixPosition(object.matrixWorld);
    const key = JSON.stringify([material.type, material.emissive?.getHex(), material.side, material.fog, Math.round(position.x / 16), Math.round(position.z / 16)]);
    const bucket = buckets.get(key) ?? [];
    bucket.push(object);
    buckets.set(key, bucket);
  });
  const retiredGeometry = new Set<THREE.BufferGeometry>();
  const retiredMaterials = new Set<THREE.Material>();
  buckets.forEach((meshes) => {
    if (meshes.length < 2) return;
    const parts = meshes.map((mesh) => {
      const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      geometry.deleteAttribute("uv");
      geometry.applyMatrix4(mesh.matrixWorld);
      const material = mesh.material as THREE.MeshLambertMaterial;
      const count = geometry.getAttribute("position").count;
      const existing = material.vertexColors ? geometry.getAttribute("color") : undefined;
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        colors[i * 3] = (existing?.getX(i) ?? 1) * material.color.r;
        colors[i * 3 + 1] = (existing?.getY(i) ?? 1) * material.color.g;
        colors[i * 3 + 2] = (existing?.getZ(i) ?? 1) * material.color.b;
      }
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      return geometry;
    });
    const merged = mergeGeometries(parts);
    parts.forEach((part) => part.dispose());
    if (!merged) return;
    const material = (meshes[0].material as THREE.MeshLambertMaterial).clone();
    material.color.setHex(0xffffff);
    material.vertexColors = true;
    material.flatShading = true;
    world.add(new THREE.Mesh(merged, material));
    meshes.forEach((mesh) => {
      retiredGeometry.add(mesh.geometry);
      retiredMaterials.add(mesh.material as THREE.Material);
      mesh.removeFromParent();
    });
  });
  world.traverse((object) => {
    const mesh = object as THREE.Mesh;
    retiredGeometry.delete(mesh.geometry);
    if (Array.isArray(mesh.material)) mesh.material.forEach((material) => retiredMaterials.delete(material));
    else retiredMaterials.delete(mesh.material);
  });
  retiredGeometry.forEach((geometry) => geometry.dispose());
  retiredMaterials.forEach((material) => material.dispose());
}

/* ---------- world assembly ---------- */

function buildWorld(glow: THREE.Texture, soft: THREE.Texture) {
  const world = new THREE.Group();
  const lanterns = lanternField(glow);
  world.add(lanterns.bodies, lanterns.halos);

  /* main island — gate, courtyard, garden */
  const island = makeRockIsland(6.4);
  world.add(island, courtyardDetails(), streamDetails(), festivalDetails());

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

  /* A spring spills over the eastern rim into the cloud sea. */
  const waterMaterial = new THREE.MeshBasicMaterial({ color: 0x9bdbdd, transparent: true, opacity: 0.48, side: THREE.DoubleSide, depthWrite: false });
  for (let i = 0; i < 3; i++) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(5.65, 0.48, 1.9 + i * 0.13),
      new THREE.Vector3(6.38, 0.1, 1.9 + i * 0.13),
      new THREE.Vector3(6.48, -2.8, 1.95 + i * 0.14),
      new THREE.Vector3(6.25, -6.6, 2.1 + i * 0.17),
    ]);
    world.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.055 + i * 0.012, 4, false), waterMaterial));
  }
  const spray = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: 0xc5e4e9, transparent: true, opacity: 0.2, depthWrite: false }));
  spray.position.set(6.25, -6.5, 2.2);
  spray.scale.set(2.5, 1.7, 1);
  world.add(spray);

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
  const grass = new THREE.InstancedMesh(new THREE.BoxGeometry(0.055, 0.24, 0.055), new THREE.MeshLambertMaterial({ color: 0x3f7a68, flatShading: true }), 70);
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
    { pos: [11.8, -0.7, -2], radius: 1.7 }, // offset from the stop-2 sightline so its bridge reads

    { pos: [15.5, 0.5, -9], radius: 2.1 }, // roomier — the pagoda needs clearance from its sign
    { pos: [19.5, -0.5, -16], radius: 1.8 },
    { pos: [22.5, 0.7, -24], radius: 1.4 },
    { pos: [24.5, -0.3, -33], radius: 1.6 },
    { pos: [25.5, 0.5, -43], radius: 2 },
  ];
  const stop2Camera = new THREE.Vector3(5.2, 7.8, 10);
  routeSpecs.forEach(({ pos, radius }, index) => {
    const [x, y, z] = pos;
    const rock = makeRockIsland(radius, true);
    rock.position.set(x, y, z);
    world.add(rock);
    // the grassy top sits at radius * 0.07 above the island origin
    const surface = y + radius * 0.07;

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

  /* rope bridges between route islands — anchored at the facing edges of
     each pair, so both ends land on turf with posts marking the crossing */
  const plankCount = (routeSpecs.length - 1) * 13;
  const planks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.05, 0.16), M.wood(), plankCount);
  const bridgePostMaterial = M.wood();
  const ropePositions: number[] = [];
  let plankIndex = 0;
  const plankDummy = new THREE.Object3D();
  const plankAim = new THREE.Vector3();
  for (let span = 0; span < routeSpecs.length - 1; span += 1) {
    const near = routeSpecs[span];
    const farSide = routeSpecs[span + 1];
    const nearCenter = new THREE.Vector3(near.pos[0], near.pos[1] + near.radius * 0.07, near.pos[2]);
    const farCenter = new THREE.Vector3(farSide.pos[0], farSide.pos[1] + farSide.radius * 0.07, farSide.pos[2]);
    const direction = farCenter.clone().sub(nearCenter);
    direction.y = 0;
    direction.normalize();
    // one skewed direction, added at the near end and subtracted at the far
    // end — the endpoints land on opposite sides of the chain axis, so every
    // span crosses it diagonally instead of foreshortening into a ladder
    const skew = 0.55;
    const skewDir = new THREE.Vector3(
      direction.x * Math.cos(skew) - direction.z * Math.sin(skew), 0,
      direction.x * Math.sin(skew) + direction.z * Math.cos(skew),
    );
    const from = nearCenter.clone().addScaledVector(skewDir, near.radius * 0.78).add(new THREE.Vector3(0, 0.04, 0));
    const to = farCenter.clone().addScaledVector(skewDir, -farSide.radius * 0.78).add(new THREE.Vector3(0, 0.04, 0));
    const sag = Math.min(1.1, Math.max(0.45, from.distanceTo(to) * 0.13));
    const walkway = catenary(from, to, sag, 12);
    walkway.forEach((point, index) => {
      plankDummy.position.copy(point);
      const behind = walkway[Math.max(0, index - 1)];
      const ahead = walkway[Math.min(walkway.length - 1, index + 1)];
      plankAim.copy(plankDummy.position).add(ahead.clone().sub(behind));
      plankDummy.lookAt(plankAim);
      plankDummy.updateMatrix();
      planks.setMatrixAt(plankIndex, plankDummy.matrix);
      plankIndex += 1;
    });
    const across = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(0.2);
    [1, -1].forEach((side) => {
      const rope = catenary(
        from.clone().addScaledVector(across, side).add(new THREE.Vector3(0, 0.34, 0)),
        to.clone().addScaledVector(across, side).add(new THREE.Vector3(0, 0.34, 0)),
        sag * 0.85,
        12,
      );
      for (let index = 0; index < rope.length - 1; index += 1) {
        ropePositions.push(rope[index].x, rope[index].y, rope[index].z, rope[index + 1].x, rope[index + 1].y, rope[index + 1].z);
      }
      [from, to].forEach((endPoint) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.038, 0.42, 5), bridgePostMaterial);
        post.position.copy(endPoint).addScaledVector(across, side).add(new THREE.Vector3(0, 0.17, 0));
        world.add(post);
      });
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

  /* memory orrery — rings and orbiting cards in its own open sky,
     well clear of the lantern festival */
  const orrery = new THREE.Group();
  orrery.position.set(-25, 11, 1);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), M.warm());
  const coreHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffb45e, transparent: true, opacity: 0.7, depthWrite: false }));
  coreHalo.scale.setScalar(4);
  orrery.add(core, coreHalo);
  const orbitCards: THREE.Mesh[] = [];
  const cardMaterial = new THREE.MeshBasicMaterial({ map: orbitCardAtlas(), side: THREE.DoubleSide });
  const ringSpecs: Array<[number, number, number]> = [[1.3, 0.5, 0.35], [2.1, -0.35, 0.42], [2.9, 0.25, -0.3]];
  ringSpecs.forEach(([radius, tiltX, tiltZ], ringIndex) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.025, 6, 60), new THREE.MeshBasicMaterial({ color: 0xcdb8ff, transparent: true, opacity: 0.5 }));
    ring.rotation.set(Math.PI / 2 + tiltX, 0, tiltZ);
    orrery.add(ring);
    for (let cardIndex = 0; cardIndex < 2; cardIndex += 1) {
      const cardGeometry = new THREE.PlaneGeometry(0.44, 0.3);
      const uv = cardGeometry.getAttribute("uv");
      const atlasIndex = ringIndex * 2 + cardIndex;
      for (let vertex = 0; vertex < uv.count; vertex++) uv.setX(vertex, (atlasIndex + 0.02 + uv.getX(vertex) * 0.96) / 6);
      const card = new THREE.Mesh(cardGeometry, cardMaterial);
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
    const cloud = makeCloud(s * 0.60, true);
    cloud.position.set(x, y - 4, z);
    world.add(cloud);
  });
  const midCloudSpecs: Array<[number, number, number, number]> = [
    [-28, 10.5, -33, 2.6], [-2, 13, -36, 3.2], [26, 14, -32, 2.2], [32, 16, -48, 3.4], [-30, 12.5, -46, 2.4], [30, 19, -24, 2],
    [-40, 14, 8, 2.6], [-34, 8.5, -9, 1.8],
  ];
  midCloudSpecs.forEach(([x, y, z, s]) => {
    const cloud = makeCloud(s * 0.7);
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
  moon.position.set(18, 16, -80);
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
  const stars = makeStarShell(850, 115, 165, 0xffffff, 0.7, soft, 0.7, 11, 0.6);
  const starsFine = makeStarShell(650, 130, 185, 0xcfd8ff, 0.4, soft, 0.45, 23, 0.5);
  const starsBright = makeStarShell(70, 110, 150, 0xfff2d8, 1.3, soft, 0.8, 37, 0.5);
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

  const detailStats = compileBlockDetails(world);
  batchStaticGeometry(world, [...orbitCards, moon]);
  const prune = (object: THREE.Object3D) => {
    [...object.children].forEach(prune);
    if (object !== world && object instanceof THREE.Group && object.children.length === 0) object.removeFromParent();
  };
  prune(world);
  const moving = new Set<THREE.Object3D>([world, ...orbitCards, moon, fireflies, pebbles, ...streaks]);
  world.traverse((object) => {
    object.updateMatrix();
    if (!moving.has(object)) object.matrixAutoUpdate = false;
  });

  return { world, lanterns, stars, starsFine, starsBright, fireflies, petals, streaks, orbitCards, pebbles, constellationStars, moon, detailStats };
}

type StreakState = { active: boolean; life: number; nextAt: number; velocity: THREE.Vector3 };

export function WorldScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "default" });
    } catch {
      canvas.classList.add("is-fallback", "is-on");
      return;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x555378, 0.007);
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 300);

    const hemisphere = new THREE.HemisphereLight(0xb9c8f5, 0x605977, 1.65);
    const warm = new THREE.DirectionalLight(0xffd1a3, 2.0);
    warm.position.set(-14, 6, 10);
    const cool = new THREE.DirectionalLight(0x9dbdff, 1.1);
    cool.position.set(10, 14, -8);
    scene.add(hemisphere, warm, cool);

    const glow = glowTexture("rgba(255,220,170,1)", "rgba(255,160,80,0.35)");
    const soft = glowTexture("rgba(255,255,255,1)", "rgba(255,255,255,0.3)");
    const { world, lanterns, stars, starsFine, starsBright, fireflies, petals, streaks, orbitCards, pebbles, constellationStars, moon, detailStats } = buildWorld(glow, soft);
    scene.add(world);

    const fineBatches: THREE.InstancedMesh[] = [];
    world.traverse((object) => { if (object instanceof THREE.InstancedMesh && object.userData.detailDistance) fineBatches.push(object); });
    const detailCenter = new THREE.Vector3();
    const updateDetailVisibility = () => {
      fineBatches.forEach((mesh) => {
        detailCenter.copy(mesh.boundingSphere!.center).add(world.position);
        const reach = mesh.userData.detailDistance + mesh.boundingSphere!.radius;
        mesh.visible = detailCenter.distanceToSquared(camera.position) < reach * reach;
      });
    };
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
      f = f * f * f * (f * (f * 6 - 15) + 10);
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

    let contextLost = false;
    let frame = 0;
    let lastTime = 0;
    let devProgress: number | null = null;
    let frozenTime: number | null = null;
    let elapsed = 0;

    /* Anchor each shot while its card is visible. The long finale anchors near
       its heading, not halfway down the campaign graphics and FAQ. */
    let sectionCenters: number[] = [];
    const measureSections = () => {
      const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-stop]"));
      if (sections.length < 2) return;
      const viewport = window.innerHeight;
      sectionCenters = sections.map((section, index) => index === 0 ? 0 :
        section.offsetTop + (index === sections.length - 1 ? -viewport * 0.12 : Math.min(viewport * 0.25, (section.offsetHeight - viewport) / 2)));
    };
    const scrollToU = () => {
      if (sectionCenters.length < 2) return 0;
      const y = window.scrollY;
      let segment = 0;
      while (segment < sectionCenters.length - 2 && y > sectionCenters[segment + 1]) segment += 1;
      let f = (y - sectionCenters[segment]) / Math.max(1, sectionCenters[segment + 1] - sectionCenters[segment]);
      f = (Math.min(1, Math.max(0, f)) - DWELL) / (1 - 2 * DWELL);
      f = Math.min(1, Math.max(0, f));
      f = f * f * f * (f * (f * 6 - 15) + 10);
      return stopU[segment] + (stopU[segment + 1] - stopU[segment]) * f;
    };

    const mobileTargets: Vec3[] = [[0, 0.5, 0], [-1.5, 1.5, -2.9], [17, 0, -17], [-14, 4.5, -14], [-25, 11, 1], [-1.8, 1.5, -2.9], [-9, 26, -54], [0, 0.5, 0]];
    const mobileTargetCurve = new THREE.CatmullRomCurve3(FLIGHT.map((point, index) => {
      const stopIndex = stopU.indexOf(index / (FLIGHT.length - 1));
      return new THREE.Vector3(...(stopIndex >= 0 ? mobileTargets[stopIndex] : point.t));
    }), false, "centripetal");
    const mobilePositionCurve = new THREE.CatmullRomCurve3(FLIGHT.map((point, index) => {
      const stopIndex = stopU.indexOf(index / (FLIGHT.length - 1));
      if (stopIndex === 1) return new THREE.Vector3(-5, 6, 8);
      if (stopIndex === 5) return new THREE.Vector3(-5.2, 5.6, 7);
      const target = new THREE.Vector3(...(stopIndex >= 0 ? mobileTargets[stopIndex] : point.t));
      const position = new THREE.Vector3(...point.p);
      return position.addScaledVector(position.clone().sub(target), 0.65);
    }), false, "centripetal");
    const frameCamera = (u: number) => {
      positionCurve.getPoint(u, desiredPosition);
      (camera.aspect < 0.85 ? mobileTargetCurve : targetCurve).getPoint(u, desiredTarget);
      if (camera.aspect < 0.85) {
        // Pull back to retain the whole island, then reserve the lower view for cards.
        mobilePositionCurve.getPoint(u, desiredPosition);
        const drop = desiredPosition.distanceTo(desiredTarget) * 0.32;
        desiredTarget.y -= drop;
      }
    };
    const resize = () => {
      const { clientWidth: width, clientHeight: height } = canvas;
      if (!width || !height) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(2_500_000 / (width * height))));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.fov = width / height < 0.85 ? 64 : 52;
      camera.updateProjectionMatrix();
      if (!frame && !contextLost && !document.hidden) frame = window.requestAnimationFrame(render);
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

    // Three scalar uniform updates replace per-star CPU work and colour uploads.
    const twinkleLayers = [stars, starsFine, starsBright];
    const updateTwinkle = (time: number) => {
      twinkleLayers.forEach((layer) => {
        const uniform = layer.material.userData.twinkleTime as { value: number } | undefined;
        if (uniform) uniform.value = time;
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
      if (contextLost) { frame = 0; return; }
      frame = reducedMotion.matches ? 0 : window.requestAnimationFrame(render);
      const seconds = timestamp * 0.001;
      const delta = Math.min(0.05, lastTime ? seconds - lastTime : 0.016);
      lastTime = seconds;
      if (!reducedMotion.matches && frozenTime === null) elapsed += delta;
      const time = reducedMotion.matches ? 0 : frozenTime ?? elapsed;

      if (!reducedMotion.matches) {
        const u = devProgress === null ? scrollToU() : progressToU(devProgress);
        frameCamera(u);

        lanterns.update(time);

        world.position.y = Math.sin(time * 0.4) * 0.12;
        fireflies.rotation.y = time * 0.02;
        (fireflies.material as THREE.PointsMaterial).opacity = 0.62 + Math.sin(time * 1.3) * 0.22;
        updateTwinkle(time);
        (constellationStars.material as THREE.PointsMaterial).opacity = 0.72 + Math.sin(time * 1.4) * 0.26;
        pebbles.rotation.y = time * 0.012;
        moon.rotation.y = time * 0.018;

        orbitCards.forEach((card) => placeOrbitCard(card, time));

        for (let index = 0; frozenTime === null && index < petalPositions.count; index += 1) {
          let y = petalPositions.getY(index) - petalSpeeds[index] * delta;
          if (y < -3) y += 15;
          petalPositions.setY(index, y);
          petalPositions.setX(index, petalPositions.getX(index) + Math.sin(time * 0.8 + index) * delta * 0.24);
        }
        petalPositions.needsUpdate = true;

        if (frozenTime === null) updateStreaks(time, delta);

        if (sky) {
          const altitude = Math.min(34, Math.max(0, (camera.position.y - 2.4) * 4));
          sky.style.transform = `translate3d(0, ${altitude.toFixed(2)}vh, 0)`;
        }
      }

      if (reducedMotion.matches) {
        frameCamera(0);
        camera.position.copy(desiredPosition);
        currentTarget.copy(desiredTarget);
        world.position.y = 0;
        if (sky) sky.style.transform = "none";
      } else {
        const damping = 1 - Math.exp(-5 * delta);
        camera.position.lerp(desiredPosition, damping);
        currentTarget.lerp(desiredTarget, damping);
      }
      // A level horizon and time-based damping avoid scroll-induced rolling.
      camera.lookAt(currentTarget);

      updateDetailVisibility();
      renderer.render(scene, camera);
      canvas.classList.add("is-on");
    };

    /* dev-only hook: lets tooling park the camera at an exact progress and
       force a frame, so compositions can be verified from rendered stills */
    const devHook = {
      setProgress: (progress: number) => {
        devProgress = progress;
        frameCamera(reducedMotion.matches ? 0 : progressToU(progress));
        camera.position.copy(desiredPosition);
        currentTarget.copy(desiredTarget);
        camera.lookAt(currentTarget);
      },
      snap: (time = 0) => {
        frozenTime = time;
        if (!reducedMotion.matches) {
          updateTwinkle(time);
          orbitCards.forEach((card) => placeOrbitCard(card, time));
        }
        if (!contextLost) { updateDetailVisibility(); renderer.render(scene, camera); }
        return canvas;
      },
      setSize: (width: number, height: number) => {
        renderer.setPixelRatio(1);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.fov = width / height < 0.85 ? 64 : 52;
        camera.updateProjectionMatrix();
      },
      resume: () => { devProgress = null; frozenTime = null; },
      inspect: () => ({
        position: camera.position.toArray(), target: currentTarget.toArray(),
        calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
        pixelRatio: renderer.getPixelRatio(), reducedMotion: reducedMotion.matches,
        progress: devProgress, sectionAnchors: [...sectionCenters], contextLost, ...detailStats,
      }),
      look: (px: number, py: number, pz: number, tx: number, ty: number, tz: number) => {
        desiredPosition.set(px, py, pz);
        desiredTarget.set(tx, ty, tz);
        camera.position.copy(desiredPosition);
        currentTarget.copy(desiredTarget);
        camera.lookAt(currentTarget);
      },
    };
    if (process.env.NODE_ENV !== "production") (window as unknown as { __nightflight?: typeof devHook }).__nightflight = devHook;

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (frame) {
          window.cancelAnimationFrame(frame);
          frame = 0;
        }
      } else if (!frame && !contextLost) {
        lastTime = 0;
        frame = window.requestAnimationFrame(render);
      }
    };

    // Preserve Claude's driver-crash fallback and context recovery from 8df52c4.
    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      if (frame) { window.cancelAnimationFrame(frame); frame = 0; }
      canvas.classList.remove("is-on");
      canvas.classList.add("is-fallback");
    };
    const onContextRestored = () => {
      contextLost = false;
      canvas.classList.remove("is-fallback");
      lastTime = 0;
      if (!frame && !document.hidden) frame = window.requestAnimationFrame(render);
    };
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);

    const onMotionChange = () => {
      lastTime = 0;
      if (!frame && !contextLost && !document.hidden) frame = window.requestAnimationFrame(render);
    };
    reducedMotion.addEventListener("change", onMotionChange);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const layoutObserver = new ResizeObserver(measureSections);
    layoutObserver.observe(document.body);
    resize();
    measureSections();
    document.addEventListener("visibilitychange", onVisibilityChange);
    orbitCards.forEach((card) => placeOrbitCard(card, 0));
    if (!frame && !contextLost && !document.hidden) frame = window.requestAnimationFrame(render);

    return () => {
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      reducedMotion.removeEventListener("change", onMotionChange);
      resizeObserver.disconnect();
      layoutObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      delete (window as unknown as { __nightflight?: unknown }).__nightflight;
      if (frame) window.cancelAnimationFrame(frame);
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      const textures = new Set<THREE.Texture>([glow, soft]);
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (object instanceof THREE.InstancedMesh) object.dispose();
        if (mesh.geometry) geometries.add(mesh.geometry);
        if (!mesh.material) return;
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => {
          materials.add(material);
          const map = (material as THREE.MeshBasicMaterial).map;
          if (map) textures.add(map);
        });
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      if (sky) sky.style.transform = "";
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="w-canvas" aria-hidden="true" />;
}
