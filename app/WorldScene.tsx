"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/* A twilight floating-shrine world. The camera flies a spline between
   waypoints as the page scrolls; DOM sections float above the canvas.
   The flight passes through the torii gate, and the fixed CSS sky
   shifts with camera altitude so climbing reads as real height. */

const CAMERA_POSITIONS: Array<[number, number, number]> = [
  [0, 2.4, 22],      // the gate — wide, torii framed
  [0, 2.05, 4.4],    // threshold — passing through the torii
  [12, 3, 1],        // the route — facing the island chain
  [-5, 3.6, -2],     // lanterns — toward the lantern field
  [-11, 5.5, -7],    // memory — inside the lanterns, tilted to clouds
  [-2.5, 2.6, 2.5],  // tutor — shrine close-up
  [0, 8, 7],         // stars — rising toward the sky
  [0, 3.2, 26],      // landing — pulled back wide
];

const CAMERA_TARGETS: Array<[number, number, number]> = [
  [0, 1.8, 0],
  [-1.4, 1.2, -2.4],
  [22, -1, -22],
  [-12, 3.4, -14],
  [-15, 9, -20],
  [-1.6, 1.4, -2.6],
  [-6, 20, -40],
  [0, 2, 0],
];

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

function makeRockIsland(radius: number, rockColor: number, topColor: number) {
  const island = new THREE.Group();
  const rockGeometry = new THREE.IcosahedronGeometry(radius, 1);
  rockGeometry.scale(1, 1.15, 1);
  const positions = rockGeometry.getAttribute("position") as THREE.BufferAttribute;
  const vertex = new THREE.Vector3();
  for (let index = 0; index < positions.count; index += 1) {
    vertex.fromBufferAttribute(positions, index);
    if (vertex.y > 0) vertex.y *= 0.22; // flatten the top
    const jitter = 1 + (Math.sin(vertex.x * 7.3 + vertex.z * 5.1) * 0.5 + Math.sin(vertex.y * 9.7) * 0.5) * 0.08;
    vertex.multiplyScalar(jitter);
    positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }
  rockGeometry.computeVertexNormals();
  const rock = new THREE.Mesh(rockGeometry, new THREE.MeshLambertMaterial({ color: rockColor, flatShading: true }));
  rock.position.y = -radius * 0.24;
  island.add(rock);

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.94, radius * 1.0, radius * 0.14, 9),
    new THREE.MeshLambertMaterial({ color: topColor, flatShading: true }),
  );
  island.add(top);
  return island;
}

function makeTorii(scale = 1) {
  const torii = new THREE.Group();
  const red = new THREE.MeshLambertMaterial({ color: 0xd9503f, emissive: 0x521309 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x30224a });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.6, 8), red);
  const postB = post.clone();
  post.position.set(-0.95, 1.3, 0);
  postB.position.set(0.95, 1.3, 0);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.14, 0.18), red);
  lintel.position.y = 2.18;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.16, 0.24), red);
  cap.position.y = 2.62;
  const capTop = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.08, 0.28), dark);
  capTop.position.y = 2.74;
  const strut = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.12), red);
  strut.position.y = 2.4;
  torii.add(post, postB, lintel, cap, capTop, strut);
  torii.scale.setScalar(scale);
  return torii;
}

function makeShrine() {
  const shrine = new THREE.Group();
  const wall = new THREE.MeshLambertMaterial({ color: 0x4a3866, flatShading: true });
  const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x2b2150, flatShading: true });
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.3, 2), wall);
  base.position.y = 0.15;
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.1, 1.5), wall);
  body.position.y = 0.95;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.85, 0.9, 4), roofMaterial);
  roof.position.y = 1.98;
  roof.rotation.y = Math.PI / 4;
  const roofTop = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.55, 4), roofMaterial);
  roofTop.position.y = 2.62;
  roofTop.rotation.y = Math.PI / 4;
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshBasicMaterial({ color: 0xffb45e }));
  door.position.set(0, 0.85, 0.755);
  shrine.add(base, body, roof, roofTop, door);
  return shrine;
}

function makePine(scale = 1) {
  const pine = new THREE.Group();
  const foliage = new THREE.MeshLambertMaterial({ color: 0x265752, flatShading: true });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.8, 6), new THREE.MeshLambertMaterial({ color: 0x3d2f4a }));
  trunk.position.y = 0.4;
  const lower = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.05, 7), foliage);
  lower.position.y = 1.05;
  const upper = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.85, 7), foliage);
  upper.position.y = 1.75;
  pine.add(trunk, lower, upper);
  pine.scale.setScalar(scale);
  return pine;
}

function makeStoneLantern(glow: THREE.Texture) {
  const lantern = new THREE.Group();
  const stone = new THREE.MeshLambertMaterial({ color: 0x54487a, flatShading: true });
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
  return lantern;
}

function makePaperLantern(glow: THREE.Texture) {
  const lantern = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd9a0 }),
  );
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

function makeCloud(scale: number) {
  const cloud = new THREE.Group();
  const material = new THREE.MeshLambertMaterial({ color: 0x6a5a9e, transparent: true, opacity: 0.5, flatShading: true });
  const blobs = 4 + Math.floor(scale);
  for (let index = 0; index < blobs; index += 1) {
    const blob = new THREE.Mesh(new THREE.SphereGeometry(0.8 + (index % 3) * 0.4, 7, 6), material);
    blob.position.set(index * 1.1 - blobs * 0.5, (index % 2) * 0.3, (index % 3) * 0.5 - 0.5);
    blob.scale.y = 0.42;
    cloud.add(blob);
  }
  cloud.scale.setScalar(scale);
  return cloud;
}

function makePoints(count: number, spread: [number, number, number], center: [number, number, number], color: number, size: number, texture: THREE.Texture, opacity = 0.9) {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = center[0] + (((index * 37) % 101) / 100 - 0.5) * spread[0];
    positions[index * 3 + 1] = center[1] + (((index * 61) % 97) / 96 - 0.5) * spread[1];
    positions[index * 3 + 2] = center[2] + (((index * 17) % 89) / 88 - 0.5) * spread[2];
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color, size, map: texture, transparent: true, opacity,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  return new THREE.Points(geometry, material);
}

function makeMist(soft: THREE.Texture, color: number, scaleX: number, scaleY: number, opacity: number) {
  const mist = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color, transparent: true, opacity, depthWrite: false }));
  mist.scale.set(scaleX, scaleY, 1);
  return mist;
}

function buildWorld(glow: THREE.Texture, soft: THREE.Texture) {
  const world = new THREE.Group();

  // main island
  const island = makeRockIsland(6, 0x352a52, 0x35635c);
  world.add(island);

  const torii = makeTorii(1.15);
  torii.position.set(0, 0.4, 4.4);
  world.add(torii);

  const shrine = makeShrine();
  shrine.position.set(-1.6, 0.4, -2.6);
  shrine.rotation.y = 0.35;
  world.add(shrine);

  const pinePositions: Array<[number, number, number, number]> = [
    [3.4, 0.4, -2.6, 1.15], [4.2, 0.4, -0.8, 0.85], [-3.9, 0.4, 0.6, 1.0], [-2.6, 0.4, 3.1, 0.7],
  ];
  pinePositions.forEach(([x, y, z, s]) => {
    const pine = makePine(s);
    pine.position.set(x, y, z);
    world.add(pine);
  });

  // stone path through the torii
  const stoneMaterial = new THREE.MeshLambertMaterial({ color: 0x6e6194, flatShading: true });
  for (let index = 0; index < 7; index += 1) {
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.08, 6), stoneMaterial);
    stone.position.set(Math.sin(index * 1.4) * 0.5, 0.45, 3.6 - index * 1.05);
    world.add(stone);
  }

  const stoneLanternA = makeStoneLantern(glow);
  stoneLanternA.position.set(1.1, 0.4, 2.6);
  const stoneLanternB = makeStoneLantern(glow);
  stoneLanternB.position.set(-1.2, 0.4, 0.9);
  world.add(stoneLanternA, stoneLanternB);

  // island chain (the curriculum, receding into the dusk)
  const chain: Array<[number, number, number, number]> = [
    [11, -1.2, -8, 2.2], [17, 0.2, -16, 1.8], [24, -0.8, -26, 2.4], [31, 0.8, -38, 1.9], [39, -0.4, -52, 2.6],
  ];
  chain.forEach(([x, y, z, radius], index) => {
    const rock = makeRockIsland(radius, 0x302650, 0x315a54);
    rock.position.set(x, y, z);
    const pine = makePine(0.8);
    pine.position.set(x + 0.4, y + 0.3, z);
    const gate = makeTorii(0.55 + (index % 2) * 0.2);
    gate.position.set(x - radius * 0.4, y + 0.3, z + radius * 0.5);
    gate.rotation.y = -0.6;
    world.add(rock, pine, gate);
  });

  // paper lantern field
  const lanterns: THREE.Group[] = [];
  for (let index = 0; index < 22; index += 1) {
    const lantern = makePaperLantern(glow);
    lantern.position.set(
      -12 + (((index * 29) % 23) / 22 - 0.5) * 12,
      3 + (((index * 41) % 19) / 18 - 0.5) * 7,
      -14 + (((index * 13) % 17) / 16 - 0.5) * 12,
    );
    const scale = 0.55 + ((index * 7) % 10) / 18;
    lantern.scale.setScalar(scale);
    world.add(lantern);
    lanterns.push(lantern);
  }

  // clouds
  const cloudSpecs: Array<[number, number, number, number]> = [
    [-18, 11, -26, 2.6], [-6, 13, -34, 3.2], [10, 12, -30, 2.2], [22, 14, -44, 3.4], [-28, 12, -40, 2.4],
  ];
  cloudSpecs.forEach(([x, y, z, s]) => {
    const cloud = makeCloud(s);
    cloud.position.set(x, y, z);
    world.add(cloud);
  });

  // low mist hugging the islands
  const mistA = makeMist(soft, 0x8a7bd8, 26, 7, 0.14);
  mistA.position.set(0, -3.6, -2);
  const mistB = makeMist(soft, 0x9a6ba8, 18, 5, 0.1);
  mistB.position.set(-12, -0.8, -14);
  world.add(mistA, mistB);

  // moon + halo
  const moon = new THREE.Mesh(new THREE.CircleGeometry(7, 40), new THREE.MeshBasicMaterial({ color: 0xf6e7c8 }));
  moon.position.set(-34, 30, -80);
  const moonHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xf6e7c8, transparent: true, opacity: 0.4, depthWrite: false }));
  moonHalo.scale.setScalar(30);
  moonHalo.position.copy(moon.position);
  world.add(moon, moonHalo);

  // particles
  const stars = makePoints(320, [200, 90, 120], [0, 42, -60], 0xffffff, 0.5, soft, 0.8);
  const fireflies = makePoints(60, [26, 10, 24], [-6, 4, -6], 0xffd27e, 0.45, glow, 0.85);
  const petals = makePoints(80, [30, 15, 26], [4, 5, 0], 0xf2a7c3, 0.32, soft, 0.65);
  world.add(stars, fireflies, petals);

  // shooting stars (reused sprites, launched on a timer)
  const streaks = [0, 1].map(() => {
    const streak = new THREE.Sprite(new THREE.SpriteMaterial({
      map: soft, color: 0xffffff, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    streak.scale.set(7, 0.09, 1);
    world.add(streak);
    return streak;
  });

  return { world, lanterns, stars, fireflies, petals, streaks };
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
    scene.fog = new THREE.FogExp2(0x241d4e, 0.012);
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 300);

    const hemisphere = new THREE.HemisphereLight(0x8d7fd8, 0xd4694a, 0.9);
    const warm = new THREE.DirectionalLight(0xffb45e, 1.1);
    warm.position.set(-14, 6, 10);
    const cool = new THREE.DirectionalLight(0x7f9fe8, 0.35);
    cool.position.set(10, 14, -8);
    scene.add(hemisphere, warm, cool);

    const glow = glowTexture("rgba(255,220,170,1)", "rgba(255,160,80,0.35)");
    const soft = glowTexture("rgba(255,255,255,1)", "rgba(255,255,255,0.3)");
    const { world, lanterns, stars, fireflies, petals, streaks } = buildWorld(glow, soft);
    scene.add(world);

    const sky = document.querySelector<HTMLElement>(".w-sky");

    const positionCurve = new THREE.CatmullRomCurve3(CAMERA_POSITIONS.map((p) => new THREE.Vector3(...p)), false, "centripetal", 0.6);
    const targetCurve = new THREE.CatmullRomCurve3(CAMERA_TARGETS.map((p) => new THREE.Vector3(...p)), false, "centripetal", 0.6);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desiredPosition = new THREE.Vector3(...CAMERA_POSITIONS[0]);
    const desiredTarget = new THREE.Vector3(...CAMERA_TARGETS[0]);
    const currentTarget = desiredTarget.clone();
    camera.position.copy(desiredPosition);
    camera.lookAt(currentTarget);

    // per-petal fall speeds and phases for the sakura drift
    const petalPositions = petals.geometry.getAttribute("position") as THREE.BufferAttribute;
    const petalSpeeds = Float32Array.from({ length: petalPositions.count }, (_, index) => 0.28 + ((index * 31) % 17) / 17 * 0.5);

    const streakStates: StreakState[] = streaks.map((_, index) => ({
      active: false, life: 0, nextAt: 3 + index * 5, velocity: new THREE.Vector3(),
    }));

    let scrollProgress = 0;
    let pointerX = 0;
    let pointerY = 0;
    let frame = 0;
    let lastTime = 0;

    const readScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
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

    const render = (timestamp: number) => {
      frame = window.requestAnimationFrame(render);
      const time = timestamp * 0.001;
      const delta = Math.min(0.05, lastTime ? time - lastTime : 0.016);
      lastTime = time;

      if (!reducedMotion.matches) {
        positionCurve.getPoint(scrollProgress, desiredPosition);
        targetCurve.getPoint(scrollProgress, desiredTarget);

        lanterns.forEach((lantern, index) => {
          lantern.position.y += Math.sin(time * 0.6 + index * 1.7) * 0.0035;
          lantern.rotation.y = Math.sin(time * 0.3 + index) * 0.2;
          const halo = lantern.userData.halo as THREE.Sprite | undefined;
          if (halo) halo.material.opacity = 0.42 + Math.sin(time * 2.1 + index * 2.4) * 0.13;
        });

        world.position.y = Math.sin(time * 0.4) * 0.12;
        fireflies.rotation.y = time * 0.02;
        (fireflies.material as THREE.PointsMaterial).opacity = 0.62 + Math.sin(time * 1.3) * 0.22;
        (stars.material as THREE.PointsMaterial).opacity = 0.72 + Math.sin(time * 0.6) * 0.1;

        for (let index = 0; index < petalPositions.count; index += 1) {
          let y = petalPositions.getY(index) - petalSpeeds[index] * delta;
          if (y < -3) y += 16;
          petalPositions.setY(index, y);
          petalPositions.setX(index, petalPositions.getX(index) + Math.sin(time * 0.8 + index) * 0.004);
        }
        petalPositions.needsUpdate = true;

        updateStreaks(time, delta);

        if (sky) {
          const altitude = Math.min(30, Math.max(0, (camera.position.y - 2.4) * 5));
          sky.style.transform = `translate3d(0, ${altitude.toFixed(2)}vh, 0)`;
        }
      }

      camera.position.x += (desiredPosition.x + pointerX * 1.1 - camera.position.x) * 0.055;
      camera.position.y += (desiredPosition.y - pointerY * 0.8 - camera.position.y) * 0.055;
      camera.position.z += (desiredPosition.z - camera.position.z) * 0.055;
      currentTarget.lerp(desiredTarget, 0.055);
      camera.lookAt(currentTarget);

      renderer.render(scene, camera);
      canvas.classList.add("is-on"); // fade in once the first frame exists
    };

    const onScroll = () => readScroll();
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
    resize();
    readScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    frame = window.requestAnimationFrame(render);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
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
