import * as THREE from "three";

type Vec3 = [number, number, number];

// Every detail uses one unit cube and per-instance colour. The world compiler
// later combines these local batches by spatial cell, retaining frustum culling.
class Blocks {
  private matrices: THREE.Matrix4[] = [];
  private colors: THREE.Color[] = [];
  private dummy = new THREE.Object3D();

  box(position: Vec3, size: Vec3, color: number, rotation: Vec3 = [0, 0, 0], order: THREE.EulerOrder = "XYZ") {
    this.dummy.position.set(...position);
    this.dummy.scale.set(...size);
    this.dummy.rotation.set(rotation[0], rotation[1], rotation[2], order);
    this.dummy.updateMatrix();
    this.matrices.push(this.dummy.matrix.clone());
    this.colors.push(new THREE.Color(color));
  }

  beam(from: Vec3, to: Vec3, width: number, color: number) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    this.dummy.position.copy(a).lerp(b, 0.5);
    this.dummy.scale.set(width, a.distanceTo(b), width);
    this.dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
    this.dummy.updateMatrix();
    this.matrices.push(this.dummy.matrix.clone());
    this.colors.push(new THREE.Color(color));
  }

  finish(fine = false) {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), this.matrices.length);
    this.matrices.forEach((matrix, i) => { mesh.setMatrixAt(i, matrix); mesh.setColorAt(i, this.colors[i]); });
    mesh.userData.blockDetail = true;
    mesh.userData.fineDetail = fine;
    mesh.computeBoundingSphere();
    return mesh;
  }
}

function random(seed: number) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}

export function islandDetails(radius: number) {
  const group = new THREE.Group();
  const stone = new Blocks(), plants = new Blocks();
  const rand = random(Math.round(radius * 1000));
  const n = Math.round(radius * 22);
  const rock = [0x617589, 0x71858e, 0x837e91, 0x535f77, 0x918895];
  // Broken shelves and masonry-sized seams under the continuous terrain shell.
  for (let row = 0; row < 5; row++) {
    const y = -radius * (0.08 + row * 0.165);
    const extent = [1.01, 0.93, 0.82, 0.73, 0.57][row];
    for (let i = 0; i < n; i++) {
      if (rand() < 0.24) continue;
      const angle = (i + (row % 2) * 0.5) / n * Math.PI * 2;
      const r = radius * extent;
      const h = radius * (0.035 + rand() * 0.095);
      stone.box([Math.cos(angle) * r, y, Math.sin(angle) * r], [radius * 0.09, h, radius * (0.09 + rand() * 0.04)], rock[(i + row) % rock.length], [0, -angle, 0]);
      if (row < 2 && i % 3 === 0) {
        plants.box([Math.cos(angle) * (r + 0.02), y + h * 0.55, Math.sin(angle) * (r + 0.02)], [radius * 0.095, radius * 0.012, radius * 0.11], 0x49745e, [0, -angle, 0]);
      }
    }
  }
  // Ragged hanging roots: short angular segments hug the rock instead of dangling
  // across bridge approaches. Fine leaves disappear only once they are subpixel.
  for (let i = 0; i < 18; i++) {
    const a = i * 2.39996 + 0.3;
    let prior: Vec3 = [Math.cos(a) * radius * 0.96, radius * 0.02, Math.sin(a) * radius * 0.96];
    for (let j = 1; j < 5; j++) {
      const r = radius * (0.99 - j * 0.035);
      const next: Vec3 = [Math.cos(a + j * 0.017) * r, -radius * j * 0.085, Math.sin(a + j * 0.017) * r];
      stone.beam(prior, next, radius * 0.011, 0x574c59);
      plants.box(next, [radius * 0.043, radius * 0.02, radius * 0.047], j % 2 ? 0x648867 : 0x3b675a, [0, a, 0.15]);
      prior = next;
    }
  }
  // Low turf at the rim leaves the centre free for the signs and landmarks.
  for (let i = 0; i < n * 2; i++) {
    const a = rand() * Math.PI * 2, r = radius * (0.74 + rand() * 0.2);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const y = radius * 0.07;
    plants.box([x, y + 0.014, z], [radius * (0.025 + rand() * 0.04), 0.024, radius * (0.02 + rand() * 0.04)], i % 3 ? 0x65946e : 0x829d77, [0, a, 0]);
    if (i % 4 === 0) {
      const h = 0.055 + rand() * 0.09;
      plants.box([x, y + h / 2, z], [0.025, h, 0.025], 0x3e6851);
      plants.box([x, y + h, z], [0.055, 0.035, 0.055], i % 8 ? 0xf7d0a1 : 0xd2accc);
    }
  }
  group.add(stone.finish(), plants.finish(true));
  return group;
}

export function roofDetails(width: number, height: number) {
  const tiles = new Blocks();
  const steps = [[1, 0.12], [0.74, 0.2], [0.36, 0.72], [0.035, 1]];
  for (let side = 0; side < 4; side++) {
    const angle = side * Math.PI / 2;
    const transform = (x: number, y: number, z: number): Vec3 => [Math.cos(angle) * x + Math.sin(angle) * z, y, -Math.sin(angle) * x + Math.cos(angle) * z];
    for (let band = 0; band < 3; band++) {
      const [outer, low] = steps[band], [inner, high] = steps[band + 1];
      const rows = band === 0 ? 2 : 3;
      for (let row = 0; row < rows; row++) {
        const f = (row + 0.5) / rows;
        const r = outer + (inner - outer) * f;
        const span = r * width;
        const count = Math.max(3, Math.ceil(span * 13));
        for (let i = 0; i < count; i++) {
          const x = -span + (i + 0.5) * span * 2 / count;
          const slope = Math.atan2((high - low) * height, (outer - inner) * width);
          tiles.box(transform(x, (low + (high - low) * f) * height + 0.018, span), [span * 2 / count * 0.87, 0.026, (outer - inner) * width / rows / Math.cos(slope) * 0.88], (i + row) % 3 === 0 ? 0x667a8d : 0x485d75, [slope, angle, 0], "YXZ");
        }
      }
    }
    tiles.box(transform(0, height * 0.1, width), [width * 2.06, 0.07, 0.08], 0x26374c, [0, angle, 0]);
  }
  // Ridge cap and raised corner finials retain a square, stepped silhouette.
  tiles.box([0, height + 0.03, 0], [width * 0.25, 0.08, width * 0.25], 0xbca070);
  return tiles.finish();
}

export function shrineDetails() {
  const b = new Blocks();
  // Stone footing, porch planks, stair treads and side balustrades.
  for (let row = 0; row < 2; row++) for (let i = 0; i < 9; i++) {
    b.box([-1.13 + i * 0.28 + row * 0.025, 0.055 + row * 0.135, 1.012], [0.26, 0.11, 0.09], (i + row) % 2 ? 0x73778a : 0x8e8597);
  }
  for (let i = 0; i < 16; i++) b.box([-1.2 + i * 0.16, 0.371, 1], [0.145, 0.025, 0.64], i % 3 ? 0x8f6e6c : 0xaf8a76);
  for (let step = 0; step < 3; step++) b.box([0, 0.07 + step * 0.085, 1.62 - step * 0.18], [0.78, 0.13, 0.3], 0x7c8290);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) b.box([side * 1.15, 0.61, 0.72 + i * 0.09], [0.035, 0.46, 0.035], 0x873d3d);
    b.box([side * 1.15, 0.87, 1.0], [0.085, 0.075, 0.68], 0xc4654c);
    // Timber frame and glowing paper-window lattice on both side walls.
    for (let i = 0; i < 5; i++) {
      b.box([side * 0.961, 1, -0.55 + i * 0.28], [0.035, 0.83, 0.038], 0x563d4c);
    }
    for (const y of [0.57, 0.9, 1.32]) b.box([side * 0.975, y, 0], [0.06, 0.04, 1.48], 0x72515e);
    for (let i = 0; i < 8; i++) b.box([side * (0.34 + i * 0.075), 1.48, 0.85], [0.035, 0.18, 0.22], 0xb17d64);
    // Sliding door frame, small bronze studs and carved diagonal brackets.
    b.box([side * 0.27, 0.9, 0.797], [0.035, 0.87, 0.055], 0x54394b);
    b.beam([side * 0.88, 1.1, 0.82], [side * 1.1, 1.45, 0.82], 0.07, 0x985a51);
  }
  for (let i = 0; i < 5; i++) b.box([0, 0.56 + i * 0.155, 0.795], [0.5, 0.023, 0.05], 0x7b5157);
  b.box([0, 1.4, 0.795], [0.72, 0.14, 0.07], 0x293744);
  b.box([0, 1.4, 0.84], [0.38, 0.055, 0.018], 0xd5ad6c);
  // Donation chest at the edge of the porch, slatted rather than an opaque cube.
  b.box([0.74, 0.51, 1.12], [0.38, 0.27, 0.3], 0x684858);
  for (let i = 0; i < 6; i++) b.box([0.585 + i * 0.062, 0.654, 1.12], [0.04, 0.025, 0.31], 0xd2a17c);
  return b.finish();
}

export function toriiDetails() {
  const b = new Blocks();
  for (const side of [-1, 1]) {
    b.box([side * 0.95, 0.08, 0], [0.34, 0.16, 0.34], 0x5c6477);
    for (const y of [0.25, 2.12]) b.box([side * 0.95, y, 0], [0.225, 0.075, 0.225], 0x363044);
    b.box([side * 1.25, 2.74, 0], [0.42, 0.09, 0.29], 0x30283c, [0, 0, side * 0.12]);
    for (const y of [2.18, 2.61]) b.box([side * 0.95, y, 0.106], [0.045, 0.045, 0.025], 0xd6b875);
  }
  b.box([0, 2.37, 0.13], [0.28, 0.4, 0.07], 0x332f45);
  b.box([0, 2.37, 0.174], [0.18, 0.28, 0.025], 0xbda471);
  b.box([0, 2.37, 0.189], [0.035, 0.19, 0.02], 0x624c51);
  return b.finish();
}

export function blockPine() {
  const b = new Blocks();
  b.box([0, 0.67, 0], [0.13, 1.34, 0.13], 0x624c51);
  for (let tier = 0; tier < 5; tier++) {
    const y = 0.72 + tier * 0.29, w = 0.64 - tier * 0.1;
    b.box([0, y, 0], [w * 1.75, 0.18, w * 1.5], tier % 2 ? 0x376454 : 0x487861);
    b.box([0.03, y + 0.14, -0.04], [w * 1.3, 0.17, w * 1.2], 0x54866c);
    for (let branch = 0; branch < 4; branch++) {
      const a = branch * Math.PI / 2 + tier * 0.5;
      b.beam([0, y - 0.2, 0], [Math.cos(a) * w, y, Math.sin(a) * w], 0.045, 0x65534e);
      b.box([Math.cos(a) * w * 0.83, y + 0.035, Math.sin(a) * w * 0.83], [w * 0.65, 0.13, w * 0.65], branch % 2 ? 0x659176 : 0x3d715d, [0, a, 0]);
    }
  }
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    b.beam([0, 0.18, 0], [Math.cos(a) * 0.23, 0.02, Math.sin(a) * 0.23], 0.07, 0x65534e);
  }
  return b.finish();
}

export function blockBlossom(color: number) {
  const b = new Blocks();
  const rand = random(color);
  const base = new THREE.Color(color);
  b.box([0, 0.47, 0], [0.15, 0.94, 0.14], 0x654955, [0, 0, -0.06]);
  for (let arm = 0; arm < 7; arm++) {
    const a = arm * 2.39996, radius = arm === 0 ? 0 : 0.35 + rand() * 0.25;
    const x = Math.cos(a) * radius, z = Math.sin(a) * radius * 0.8, y = 1.17 + rand() * 0.35;
    b.beam([0, 0.65, 0], [x, y - 0.12, z], 0.075, 0x795562);
    for (let i = 0; i < 20; i++) {
      const px = x + (rand() - 0.5) * 0.63, pz = z + (rand() - 0.5) * 0.5;
      const py = y + (rand() - 0.5) * 0.26;
      const tint = base.clone().multiplyScalar(0.75 + rand() * 0.5);
      b.box([px, py, pz], [0.15 + rand() * 0.18, 0.11 + rand() * 0.12, 0.15 + rand() * 0.17], tint.getHex());
    }
  }
  return b.finish();
}

export function courtyardDetails() {
  const b = new Blocks(), small = new Blocks();
  const rand = random(823);
  const stone = [0x8d9295, 0xa2a29f, 0x707f86, 0x8a8294];
  // A two-course, irregular stone walk respects the existing central flight lane.
  for (let row = 0; row < 26; row++) {
    const z = 4.35 - row * 0.275;
    for (let col = 0; col < 3; col++) {
      b.box([(col - 1) * 0.27 + Math.sin(row * 0.35) * 0.13, 0.485, z], [0.24, 0.065, 0.247], stone[(row + col) % 4], [0, (rand() - 0.5) * 0.13, 0]);
    }
    for (const side of [-1, 1]) small.box([side * 0.55, 0.48, z], [0.095, 0.05, 0.21], 0x526b63);
  }
  // Side path to the shrine; the steps terminate at its porch approach.
  for (let i = 0; i < 9; i++) b.box([-i * 0.2, 0.485, -0.55 - i * 0.115], [0.27, 0.07, 0.29], stone[i % 4], [0, -0.2, 0]);
  // Square flower beds and tiny fern clumps, placed away from landmarks.
  for (const [x, z] of [[-3.5, 2.1], [2.7, 3.7], [-4.8, -1.3], [1.2, -5], [4.7, 2.4], [-3.2, -4.4]]) {
    b.box([x, 0.485, z], [0.88, 0.09, 0.55], 0x405449);
    for (let i = 0; i < 30; i++) {
      const px = x + (rand() - 0.5) * 0.8, pz = z + (rand() - 0.5) * 0.5, h = 0.1 + rand() * 0.15;
      small.box([px, 0.5 + h / 2, pz], [0.025, h, 0.025], 0x477252);
      small.box([px, 0.5 + h, pz], [0.065, 0.05, 0.065], i % 3 ? 0xf2b78c : 0xe4acc6);
      small.box([px + 0.04, 0.55, pz], [0.12, 0.028, 0.055], 0x769369, [0, i, 0.3]);
    }
  }
  // Stepped pond bank, reeds, square lily pads and koi just below the surface.
  for (let i = 0; i < 32; i++) {
    const a = i / 32 * Math.PI * 2;
    b.box([3 + Math.cos(a) * 1.02, 0.49, 1.8 + Math.sin(a) * 1.02], [0.2, 0.13, 0.16], stone[i % 4], [0, -a, 0]);
    if (i % 3 === 0) for (let j = 0; j < 3; j++) small.box([3 + Math.cos(a) * 1.13 + j * 0.035, 0.65, 1.8 + Math.sin(a) * 1.13], [0.025, 0.36 + j * 0.055, 0.025], 0x7c9261, [0.1, a, 0.05]);
  }
  for (const [x, z] of [[2.5, 1.5], [3.2, 2.3], [3.55, 1.85]]) {
    small.box([x, 0.477, z], [0.22, 0.012, 0.18], 0x7b9d75, [0, x, 0]);
    small.box([x, 0.51, z], [0.06, 0.05, 0.06], 0xedb3cb);
  }
  for (const [x, z] of [[2.7, 2], [3.4, 1.4]]) {
    small.box([x, 0.473, z], [0.18, 0.012, 0.065], 0xe8ac79, [0, -0.4, 0]);
    small.box([x + 0.1, 0.473, z + 0.03], [0.06, 0.012, 0.1], 0xeee0ba, [0, -0.4, 0]);
  }
  // Rock garden border and small, deliberately square raked-sand strokes.
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * Math.PI * 2;
    b.box([3.4 + Math.cos(a) * 1.11, 0.49, -1.4 + Math.sin(a) * 1.11], [0.22, 0.085, 0.13], stone[i % 4], [0, -a, 0]);
  }
  // Bamboo grove behind the garden, out of the camera's fly-through corridor.
  for (let i = 0; i < 12; i++) {
    const x = 3 + rand() * 0.85, z = -4.1 - rand() * 0.7, h = 1.1 + rand() * 0.7;
    b.box([x, 0.45 + h / 2, z], [0.045, h, 0.045], 0x65836a);
    for (let j = 1; j < 5; j++) {
      small.box([x, 0.45 + h * j / 5, z], [0.062, 0.03, 0.062], 0xa6b58a);
      small.box([x + (j % 2 ? 0.11 : -0.11), 0.5 + h * j / 5, z], [0.24, 0.025, 0.075], 0x6e9474, [0, i, j % 2 ? 0.4 : -0.4]);
    }
  }
  const group = new THREE.Group();
  group.add(b.finish(), small.finish(true));
  return group;
}

export function pagodaDetails(width: number) {
  const b = new Blocks();
  for (const side of [-1, 1]) {
    for (const x of [-0.28, 0, 0.28]) {
      b.box([x * width, 0.32, side * width * 0.367], [width * 0.17, 0.28, 0.025], 0xd9a372);
      b.box([x * width, 0.32, side * width * 0.382], [0.025, 0.32, 0.025], 0x784b51);
    }
    for (let i = 0; i < 9; i++) b.box([(-0.49 + i * 0.12) * width, 0.24, side * width * 0.52], [0.025, 0.32, 0.035], 0x97534b);
    b.box([0, 0.43, side * width * 0.52], [width * 1.08, 0.055, 0.07], 0xc4795b);
  }
  return b.finish();
}

/** Consolidate all cuboids into spatial instance batches. A shared unit cube and
 * instance colours avoid uploading one geometry/material per tile or plant. */
export function compileBlockDetails(world: THREE.Group) {
  world.updateMatrixWorld(true);
  const source: THREE.InstancedMesh[] = [];
  world.traverse((object) => {
    if (object instanceof THREE.InstancedMesh && object.userData.blockDetail) source.push(object);
  });
  const buckets = new Map<string, { matrices: THREE.Matrix4[]; colors: THREE.Color[]; fine: boolean }>();
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), color = new THREE.Color();
  for (const mesh of source) {
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      matrix.premultiply(mesh.matrixWorld);
      position.setFromMatrixPosition(matrix);
      const key = `${Math.round(position.x / 16)},${Math.round(position.z / 16)},${Boolean(mesh.userData.fineDetail)}`;
      let bucket = buckets.get(key);
      if (!bucket) { bucket = { matrices: [], colors: [], fine: Boolean(mesh.userData.fineDetail) }; buckets.set(key, bucket); }
      mesh.getColorAt(i, color);
      bucket.matrices.push(matrix.clone());
      bucket.colors.push(color.clone());
    }
    mesh.removeFromParent();
    mesh.dispose();
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  }
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  let count = 0;
  for (const bucket of buckets.values()) {
    const mesh = new THREE.InstancedMesh(geometry, material, bucket.matrices.length);
    bucket.matrices.forEach((m, i) => { mesh.setMatrixAt(i, m); mesh.setColorAt(i, bucket.colors[i]); });
    mesh.computeBoundingSphere();
    mesh.userData.detailDistance = bucket.fine ? 55 : 0;
    mesh.name = bucket.fine ? "Fine vegetation" : "Block architecture and terrain";
    world.add(mesh);
    count += mesh.count;
  }
  return { blocks: count, batches: buckets.size };
}

/** Seventeen independently animated lanterns share one ribbed model and one
 * point-sprite halo draw, replacing dozens of separate meshes and sprites. */
export function lanternField(glow: THREE.Texture) {
  const model = new Blocks();
  model.box([0, 0, 0], [0.48, 0.66, 0.48], 0xffd398);
  for (const y of [-0.38, 0.38]) {
    model.box([0, y, 0], [0.34, 0.07, 0.34], 0x65464e);
    model.box([0, y * 0.9, 0], [0.52, 0.035, 0.52], 0xb68153);
  }
  for (let side = 0; side < 4; side++) {
    const a = side * Math.PI / 2;
    for (let rib = 0; rib < 5; rib++) {
      model.box([Math.sin(a) * 0.246, -0.26 + rib * 0.13, Math.cos(a) * 0.246], [0.48, 0.013, 0.016], 0xdba36d, [0, a, 0]);
    }
  }
  model.box([0, -0.5, 0], [0.035, 0.2, 0.035], 0xd18b54);
  const prototype = model.finish();
  const base = prototype.geometry.toNonIndexed();
  const basePositions = base.getAttribute("position");
  const positions: number[] = [], colors: number[] = [];
  const matrix = new THREE.Matrix4(), point = new THREE.Vector3(), color = new THREE.Color();
  for (let i = 0; i < prototype.count; i++) {
    prototype.getMatrixAt(i, matrix); prototype.getColorAt(i, color);
    for (let v = 0; v < basePositions.count; v++) {
      point.fromBufferAttribute(basePositions, v).applyMatrix4(matrix);
      positions.push(point.x, point.y, point.z); colors.push(color.r, color.g, color.b);
    }
  }
  base.dispose(); prototype.geometry.dispose(); (prototype.material as THREE.Material).dispose(); prototype.dispose();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const bodies = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true }), 17);
  bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const centers = Array.from({ length: 17 }, (_, i) => new THREE.Vector3(
    -14 + (((i * 29) % 23) / 22 - 0.5) * 11,
    4.2 + (((i * 41) % 19) / 18 - 0.5) * 6.5,
    -14 + (((i * 13) % 17) / 16 - 0.5) * 11,
  ));
  const haloGeometry = new THREE.BufferGeometry();
  const haloPositions = new THREE.Float32BufferAttribute(new Float32Array(17 * 3), 3).setUsage(THREE.DynamicDrawUsage);
  haloGeometry.setAttribute("position", haloPositions);
  const halos = new THREE.Points(haloGeometry, new THREE.PointsMaterial({ map: glow, color: 0xffb45e, size: 1.7, transparent: true, opacity: 0.48, depthWrite: false }));
  const dummy = new THREE.Object3D();
  const update = (time: number) => {
    centers.forEach((center, i) => {
      dummy.position.copy(center); dummy.position.y += Math.sin(time * 0.6 + i * 1.7) * 0.12;
      dummy.rotation.set(0, Math.sin(time * 0.3 + i) * 0.2, 0);
      dummy.scale.setScalar(0.5 + ((i * 7) % 10) / 20);
      dummy.updateMatrix(); bodies.setMatrixAt(i, dummy.matrix);
      haloPositions.setXYZ(i, dummy.position.x, dummy.position.y, dummy.position.z);
    });
    bodies.instanceMatrix.needsUpdate = true;
    haloPositions.needsUpdate = true;
  };
  update(0);
  bodies.computeBoundingSphere();
  // Bounds include the complete bob, so animation needs no per-frame bound rebuild.
  if (bodies.boundingSphere) bodies.boundingSphere.radius += 0.25;
  haloGeometry.computeBoundingSphere();
  if (haloGeometry.boundingSphere) haloGeometry.boundingSphere.radius += 1;
  return { bodies, halos, update };
}

export function stoneLanternDetails() {
  const b = new Blocks();
  for (const x of [-0.13, 0.13]) for (const z of [-0.12, 0.12]) b.box([x, 0.73, z], [0.04, 0.28, 0.04], 0x5a6275);
  for (const y of [0.59, 0.85]) b.box([0, y, 0], [0.32, 0.055, 0.3], 0x858395);
  b.box([0, 0.62, 0.128], [0.035, 0.16, 0.025], 0x5b6171);
  b.box([0, 0.72, 0.134], [0.28, 0.025, 0.025], 0x5b6171);
  b.box([0, 1.01, 0], [0.095, 0.13, 0.095], 0xa4a08e);
  b.box([0, 0.28, 0], [0.17, 0.05, 0.17], 0x7a768a);
  return b.finish();
}

export function signDetails() {
  const b = new Blocks();
  b.box([0, 1.19, 0], [0.94, 0.06, 0.16], 0x394253);
  for (const side of [-1, 1]) {
    b.box([side * 0.43, 0.86, 0], [0.035, 0.7, 0.1], 0xb78d6e);
    b.box([side * 0.28, 0.06, 0], [0.13, 0.12, 0.14], 0x75818d);
    for (const y of [0.61, 1.08]) b.box([side * 0.35, y, 0.043], [0.04, 0.04, 0.02], 0xcda673);
  }
  b.box([0, 0.52, 0], [0.9, 0.045, 0.1], 0x825f58);
  return b.finish();
}

export function festivalDetails() {
  const b = new Blocks();
  for (let i = 0; i < 19; i++) b.box([-0.99 + i * 0.11, 0.17, 0], [0.1, 0.045, 1.75], i % 3 ? 0x795d64 : 0x947478);
  for (const side of [-1, 1]) {
    b.box([side * 1.08, 0.51, 0], [0.065, 0.065, 1.9], 0xb76353);
    b.box([side * 1.08, 0.32, 0], [0.05, 0.04, 1.9], 0x854647);
    for (let i = 0; i < 9; i++) b.box([side * 1.08, 0.35, -0.86 + i * 0.215], [0.045, 0.41, 0.045], 0x964f4b);
    b.box([side * 0.67, 0.42, -0.6], [0.55, 0.05, 0.34], 0xae856b);
    for (const x of [-0.18, 0.18]) b.box([side * 0.67 + x, 0.28, -0.6], [0.06, 0.23, 0.25], 0x674c54);
  }
  b.box([0, 0.3, -0.7], [0.24, 0.2, 0.24], 0xadb99b);
  for (const x of [-0.065, 0, 0.065]) b.box([x, 0.49, -0.7], [0.015, 0.25, 0.015], 0xc8985d);
  const mesh = b.finish(); mesh.position.set(-13, 1, -10);
  return mesh;
}

export function streamDetails() {
  const b = new Blocks();
  for (let i = 0; i < 24; i++) {
    const x = 3.9 + i * 0.092, z = 1.9 + Math.sin(i * 0.15) * 0.09;
    b.box([x, 0.475, z], [0.11, 0.018, 0.25], i % 3 ? 0x659ca4 : 0x9bc7c5);
    for (const side of [-1, 1]) b.box([x, 0.49, z + side * 0.185], [0.12, 0.085, 0.12], i % 3 ? 0x838a8b : 0x6a827a);
    if (i % 3 === 0) b.box([x, 0.49, z], [0.06, 0.01, 0.035], 0xbde2d7);
  }
  return b.finish();
}

export function bridgeDetails(from: THREE.Vector3, to: THREE.Vector3, bow: number) {
  const b = new Blocks();
  const mid = from.clone().lerp(to, 0.5); mid.y = Math.max(from.y, to.y) + bow;
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  const across = new THREE.Vector3(to.z - from.z, 0, from.x - to.x).normalize();
  for (let i = 0; i < 21; i++) {
    const p = curve.getPoint(i / 20), tangent = curve.getTangent(i / 20);
    const angle = Math.atan2(tangent.x, tangent.z);
    for (const side of [-1, 1]) {
      const post = p.clone().addScaledVector(across, side * 0.33);
      b.box([post.x, post.y + 0.19, post.z], [0.028, 0.35, 0.028], 0xaa594f);
      b.box([post.x, post.y + 0.045, post.z], [0.065, 0.025, 0.065], 0xc4a773);
    }
    for (const side of [-1, 0, 1]) {
      const plank = p.clone().addScaledVector(across, side * 0.23);
      b.box([plank.x, plank.y + 0.034, plank.z], [0.215, 0.02, 0.145], i % 3 ? 0x967875 : 0xb6907d, [0, angle, 0]);
    }
  }
  return b.finish();
}
