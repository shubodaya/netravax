import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Color,
  Vector3,
  Group,
  IcosahedronGeometry,
  SphereGeometry,
  RingGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  MeshLambertMaterial,
  MeshBasicMaterial,
  LineBasicMaterial,
  Mesh,
  LineSegments,
  InstancedMesh,
  Object3D,
  AmbientLight,
  DirectionalLight,
  AdditiveBlending,
  DoubleSide
} from "three";

// The hero visual: a small live network topology -- Core routing to Edge,
// Cloud and Ops, with data pulses travelling each link -- rather than a
// static glossy mark. The four labelled cards already in the markup
// (.topology-node--*) are literally these four nodes: every frame their
// real 3D position is projected onto the DOM so the cards stay visually
// attached to the moving nodes, instead of floating independently over an
// unrelated shape the way the old cable mark's overlay did. A handful of
// small, dim satellite nodes further out reuse the same sparse-field
// language as the whole-page background (page-field.js), so the hero reads
// as a close-up of the same network rather than a disconnected piece.
// Spread is deliberately taller than wide to match .hero-visual's portrait
// aspect ratio (roughly 0.73 on desktop) -- a symmetric spread would clip
// Cloud/Ops out of the horizontal frustum before Edge ever hit the top.
const NODE_DEFS = [
  { key: "core", position: [0, 0, 0], color: "#74eeb9", radius: 0.26, isHub: true },
  { key: "edge", position: [0, 2.3, 0.3], color: "#dbff8e", radius: 0.16 },
  { key: "cloud", position: [-1.35, -1.75, -0.4], color: "#8bbcff", radius: 0.16 },
  { key: "ops", position: [1.35, -1.75, 0.5], color: "#74eeb9", radius: 0.16 }
];

const LINKS = [
  ["core", "edge"],
  ["core", "cloud"],
  ["core", "ops"]
];

const CALLOUT_OFFSET_PX = 56;
const HUB_CALLOUT_OFFSET_PX = 96;
const HUB_CALLOUT_DIR = { x: -0.55, y: -0.84 };

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSatellites(count) {
  const rand = mulberry32(4242);
  const positions = [];
  for (let i = 0; i < count; i += 1) {
    const angle = rand() * Math.PI * 2;
    const radius = 1.8 + rand() * 1.8;
    positions.push([Math.cos(angle) * radius, (rand() - 0.5) * 4.4, Math.sin(angle) * radius * 0.6 - 0.8]);
  }
  return positions;
}

export function setupHeroNetwork({ reducedMotion, isCoarsePointer }) {
  const canvas = document.getElementById("heroNetwork");
  const hero = document.querySelector(".hero-visual");
  if (!canvas || !hero) return false;

  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch (error) {
    console.error("Hero network WebGL init failed:", error);
    return false;
  }
  if (!renderer) return false;

  const scene = new Scene();
  const camera = new PerspectiveCamera(42, 1, 0.1, 100);
  const RADIUS = 8.4;
  const nodeByKey = new Map(NODE_DEFS.map((def) => [def.key, def]));

  NODE_DEFS.forEach((def) => {
    const color = new Color(def.color);
    const core = new Mesh(
      new IcosahedronGeometry(def.radius, 0),
      new MeshLambertMaterial({ color, emissive: color, emissiveIntensity: def.isHub ? 1 : 0.85 })
    );
    core.position.set(...def.position);
    scene.add(core);

    const halo = new Mesh(
      new SphereGeometry(def.radius * 2.2, 16, 16),
      new MeshBasicMaterial({ color, transparent: true, opacity: def.isHub ? 0.16 : 0.1, blending: AdditiveBlending, depthWrite: false })
    );
    halo.position.set(...def.position);
    scene.add(halo);
  });

  const hub = nodeByKey.get("core");
  const ring = new Mesh(
    new RingGeometry(hub.radius * 1.7, hub.radius * 1.9, 40),
    new MeshBasicMaterial({ color: new Color(hub.color), transparent: true, opacity: 0.35, side: DoubleSide, blending: AdditiveBlending, depthWrite: false })
  );
  ring.position.set(...hub.position);
  scene.add(ring);

  const linePositions = [];
  LINKS.forEach(([fromKey, toKey]) => {
    linePositions.push(...nodeByKey.get(fromKey).position, ...nodeByKey.get(toKey).position);
  });
  const lineGeometry = new BufferGeometry();
  lineGeometry.setAttribute("position", new Float32BufferAttribute(linePositions, 3));
  scene.add(
    new LineSegments(
      lineGeometry,
      new LineBasicMaterial({ color: new Color("#b8f3d8"), transparent: true, opacity: 0.4, blending: AdditiveBlending, depthWrite: false })
    )
  );

  // Two pulses per link travelling opposite directions, phase-offset so they
  // never move in lockstep. Each fades in/out via a sine envelope timed so
  // the loop point (t wraps 1 -> 0) lands while the pulse is at its dimmest,
  // hiding the reset.
  const pulses = LINKS.flatMap(([fromKey, toKey], index) => {
    const from = nodeByKey.get(fromKey);
    const to = nodeByKey.get(toKey);
    const makePulse = (start, end, phase) => {
      const mesh = new Mesh(
        new SphereGeometry(0.055, 10, 10),
        new MeshBasicMaterial({ color: new Color(to.color), transparent: true, blending: AdditiveBlending, depthWrite: false })
      );
      scene.add(mesh);
      return { mesh, from: start.position, to: end.position, phase };
    };
    const base = index / LINKS.length;
    return [makePulse(from, to, base), makePulse(to, from, base + 0.5)];
  });

  const satelliteGroup = new Group();
  const satellitePositions = buildSatellites(isCoarsePointer ? 5 : 9);
  const dummy = new Object3D();
  const satelliteMesh = new InstancedMesh(
    new SphereGeometry(0.05, 8, 8),
    new MeshBasicMaterial({ color: new Color("#8bbcff"), transparent: true, opacity: 0.4, blending: AdditiveBlending, depthWrite: false }),
    satellitePositions.length
  );
  satellitePositions.forEach(([x, y, z], i) => {
    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    satelliteMesh.setMatrixAt(i, dummy.matrix);
  });
  satelliteGroup.add(satelliteMesh);
  scene.add(satelliteGroup);

  scene.add(new AmbientLight(new Color("#1c3a30"), 1.6));
  const key = new DirectionalLight(new Color("#bff5da"), 1.1);
  key.position.set(3, 4, 5);
  scene.add(key);

  // Labels start at their CSS fallback position (a static percentage-based
  // spread, in case WebGL init fails before this point ever runs). Once the
  // scene is live, left/top are reset once so per-frame updates can move
  // the label with a transform alone rather than fighting the CSS position.
  const labelEls = NODE_DEFS.map((def) => {
    const el = hero.querySelector(`.topology-node--${def.key}`);
    if (!el) return null;
    // The CSS fallback rules use a left/top/right/bottom mix (see
    // .topology-node--cloud etc.) -- all four must be cleared, not just
    // left/top, or a leftover "bottom" with auto height stretches the box.
    el.style.left = "0";
    el.style.top = "0";
    el.style.right = "auto";
    el.style.bottom = "auto";
    return { def, el, halfW: 0, halfH: 0 };
  }).filter(Boolean);

  // A card's rendered size depends on the CSS width percentage and how its
  // text wraps, both of which change with viewport width -- re-measuring
  // only at setup would leave clamp/separation math stale after a resize
  // (e.g. text wrapping to an extra line on a narrower phone).
  function measureLabels() {
    labelEls.forEach((entry) => {
      const box = entry.el.getBoundingClientRect();
      entry.halfW = box.width / 2;
      entry.halfH = box.height / 2;
    });
  }

  function resize() {
    const rect = hero.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, isCoarsePointer ? 1.5 : 2);
    renderer.setPixelRatio(ratio);
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / Math.max(1, rect.height);
    camera.updateProjectionMatrix();
    measureLabels();
  }

  function setCameraAngle(theta, tilt) {
    camera.position.x = RADIUS * Math.sin(theta);
    camera.position.z = RADIUS * Math.cos(theta);
    camera.position.y = 0.4 + tilt * 0.8;
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
  }

  const projected = new Vector3();
  const hubScreen = { x: 0, y: 0 };
  const EDGE_MARGIN = 8;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  // NODE_DEFS lists "core" first -- the loop below relies on that order so
  // hubScreen is populated before the spoke nodes read it to compute their
  // outward callout direction.
  function projectLabels() {
    const rect = hero.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const targets = labelEls.map((entry) => {
      const { def } = entry;
      projected.set(...def.position).project(camera);
      const x = (projected.x * 0.5 + 0.5) * rect.width;
      const y = (-projected.y * 0.5 + 0.5) * rect.height;

      if (def.isHub) {
        hubScreen.x = x;
        hubScreen.y = y;
        return { ...entry, cx: x + HUB_CALLOUT_DIR.x * HUB_CALLOUT_OFFSET_PX, cy: y + HUB_CALLOUT_DIR.y * HUB_CALLOUT_OFFSET_PX };
      }

      const dx = x - hubScreen.x;
      const dy = y - hubScreen.y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      return { ...entry, cx: x + (dx / dist) * CALLOUT_OFFSET_PX, cy: y + (dy / dist) * CALLOUT_OFFSET_PX };
    });

    // A narrow viewport can project two spokes close enough that their
    // callout cards would overlap (e.g. Cloud/Ops both landing near the
    // bottom edge) -- one corrective pass nudges any overlapping pair
    // apart before the edge clamp below. The hub is excluded so it stays
    // visually tethered near screen-centre rather than getting shoved.
    const spokes = targets.filter((t) => !t.def.isHub);
    for (let i = 0; i < spokes.length; i += 1) {
      for (let j = i + 1; j < spokes.length; j += 1) {
        const a = spokes[i];
        const b = spokes[j];
        const overlapX = a.halfW + b.halfW - Math.abs(a.cx - b.cx);
        const overlapY = a.halfH + b.halfH - Math.abs(a.cy - b.cy);
        if (overlapX > 0 && overlapY > 0) {
          const push = overlapX / 2 + 4;
          const dir = a.cx <= b.cx ? -1 : 1;
          a.cx += dir * push;
          b.cx -= dir * push;
        }
      }
    }

    targets.forEach(({ el, halfW, halfH, cx, cy }) => {
      const x = clamp(cx, halfW + EDGE_MARGIN, rect.width - halfW - EDGE_MARGIN);
      const y = clamp(cy, halfH + EDGE_MARGIN, rect.height - halfH - EDGE_MARGIN);
      el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    });
  }

  const state = { scrollT: 0, pointerX: 0, pointerY: 0 };
  setCameraAngle(-0.5, 0);
  resize();
  projectLabels();
  renderer.render(scene, camera);

  if (reducedMotion.matches) {
    window.addEventListener("resize", () => {
      resize();
      projectLabels();
      renderer.render(scene, camera);
    });
    return true;
  }

  if (!isCoarsePointer) {
    hero.addEventListener("pointermove", (event) => {
      const rect = hero.getBoundingClientRect();
      state.pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      state.pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    });
    hero.addEventListener("pointerleave", () => {
      state.pointerX = 0;
      state.pointerY = 0;
    });
  }

  let raf = 0;
  let running = true;
  let smoothPX = 0;
  let smoothPY = 0;

  function frame(time) {
    if (!running) return;
    smoothPX += (state.pointerX - smoothPX) * 0.06;
    smoothPY += (state.pointerY - smoothPY) * 0.06;
    const idle = Math.sin(time * 0.00025) * 0.05;
    const baseAngle = -0.5 + state.scrollT * 1.0;
    setCameraAngle(baseAngle + idle + smoothPX * 0.12, state.scrollT + smoothPY * 0.15);

    pulses.forEach((p) => {
      const t = (((time * 0.00034 + p.phase) % 1) + 1) % 1;
      p.mesh.position.set(
        p.from[0] + (p.to[0] - p.from[0]) * t,
        p.from[1] + (p.to[1] - p.from[1]) * t,
        p.from[2] + (p.to[2] - p.from[2]) * t
      );
      p.mesh.material.opacity = 0.15 + Math.sin(t * Math.PI) * 0.85;
    });

    ring.rotation.z = time * 0.00018;
    satelliteGroup.rotation.y = time * 0.00006;

    projectLabels();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);
  window.addEventListener("resize", resize);

  // Both the hero's scroll-visibility and the tab's visibility can pause
  // the loop independently -- tracked separately so neither listener
  // resumes rendering while the other condition still says it should stay
  // off (e.g. tab re-foregrounded while the hero is still scrolled out of
  // view).
  let heroVisible = true;

  function syncRunning() {
    const should = heroVisible && !document.hidden;
    if (should && !running) {
      running = true;
      raf = requestAnimationFrame(frame);
    } else if (!should && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
  }

  const observer = new IntersectionObserver(
    (entries) => {
      heroVisible = Boolean(entries[0]?.isIntersecting);
      syncRunning();
    },
    { threshold: 0 }
  );
  observer.observe(hero);

  document.addEventListener("visibilitychange", syncRunning);

  return { setScrollT: (t) => { state.scrollT = t; } };
}
