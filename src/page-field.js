import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Color,
  Group,
  BufferGeometry,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  SphereGeometry,
  MeshBasicMaterial,
  InstancedMesh,
  Object3D,
  AdditiveBlending
} from "three";

// A persistent, whole-page background: a sparse 3D field of network nodes the
// camera flies through over the course of scrolling the entire site, not just
// the hero. Deliberately distinct from the hero cable (that's the literal
// brand-mark moment; this is ambient scene-setting behind everything else).
// The field is a rigid body — node positions and their connecting lines are
// computed once at setup, then the whole group is only translated/rotated per
// frame, so there's no per-frame distance/proximity recomputation for what
// would otherwise be an O(n^2) link graph.
const NODE_COLORS = ["#74eeb9", "#dbff8e", "#8bbcff"];

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

function buildField(count, depth) {
  const rand = mulberry32(1337);
  const nodes = [];
  for (let i = 0; i < count; i += 1) {
    nodes.push({
      x: (rand() - 0.5) * 34,
      y: (rand() - 0.5) * 22,
      z: rand() * -depth + 12,
      color: NODE_COLORS[i % NODE_COLORS.length]
    });
  }

  const linkThreshold = depth < 50 ? 6.5 : 7.5;
  const linePositions = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = a.z - b.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < linkThreshold) {
        linePositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
  }

  return { nodes, linePositions };
}

export function setupPageField({ reducedMotion, isCoarsePointer }) {
  const canvas = document.getElementById("pageField");
  // Matches the CSS breakpoint that hides #pageField outright below 640px --
  // no point spinning up a WebGL context and RAF loop for a display:none
  // canvas on small phones, where it would mostly sit behind opaque content
  // anyway.
  if (!canvas || window.innerWidth < 640) return false;

  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (error) {
    console.error("Page field WebGL init failed:", error);
    return false;
  }
  if (!renderer) return false;

  const compact = isCoarsePointer || window.innerWidth < 760;
  const NODE_COUNT = compact ? 70 : 140;
  const DEPTH = compact ? 46 : 68;
  const { nodes, linePositions } = buildField(NODE_COUNT, DEPTH);

  const scene = new Scene();
  const camera = new PerspectiveCamera(55, 1, 0.1, 200);
  const field = new Group();
  scene.add(field);

  const lineGeometry = new BufferGeometry();
  lineGeometry.setAttribute("position", new Float32BufferAttribute(linePositions, 3));
  const lines = new LineSegments(
    lineGeometry,
    new LineBasicMaterial({ color: new Color("#74eeb9"), transparent: true, opacity: 0.07, blending: AdditiveBlending, depthWrite: false })
  );
  field.add(lines);

  const dot = new Object3D();
  const nodeMesh = new InstancedMesh(
    new SphereGeometry(0.16, 8, 8),
    new MeshBasicMaterial({ color: new Color("#dbff8e"), transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false }),
    nodes.length
  );
  nodes.forEach((node, i) => {
    dot.position.set(node.x, node.y, node.z);
    dot.updateMatrix();
    nodeMesh.setMatrixAt(i, dot.matrix);
  });
  field.add(nodeMesh);

  let raf = 0;
  let running = true;

  // Combines both pause conditions (tab hidden, viewport narrower than the
  // CSS breakpoint that sets #pageField to display:none) so the resize and
  // visibilitychange handlers below can't fight each other into resuming
  // the RAF loop while the other condition still says it should stay off.
  function shouldRun() {
    return !document.hidden && window.innerWidth >= 640;
  }

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 1.75);
    renderer.setPixelRatio(ratio);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
    camera.updateProjectionMatrix();

    if (!shouldRun() && running) {
      running = false;
      cancelAnimationFrame(raf);
    } else if (shouldRun() && !running && !reducedMotion.matches) {
      running = true;
      raf = requestAnimationFrame(frame);
    }
  }

  const state = { scrollT: 0 };
  camera.position.set(0, 0, 16);
  resize();
  renderer.render(scene, camera);

  if (reducedMotion.matches) {
    window.addEventListener("resize", () => {
      resize();
      renderer.render(scene, camera);
    });
    return true;
  }

  function frame(time) {
    if (!running) return;
    // Camera dollies from just in front of the field to deep behind it over
    // the full scroll range -- nodes drift past as the page is read, rather
    // than a fixed backdrop that merely fades.
    camera.position.z = 16 - state.scrollT * (DEPTH + 20);
    field.rotation.y = time * 0.00004;
    field.rotation.x = Math.sin(time * 0.00003) * 0.05;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);
  window.addEventListener("resize", resize);

  document.addEventListener("visibilitychange", () => {
    if (!shouldRun() && running) {
      running = false;
      cancelAnimationFrame(raf);
    } else if (shouldRun() && !running) {
      running = true;
      raf = requestAnimationFrame(frame);
    }
  });

  return { setScrollT: (t) => { state.scrollT = t; } };
}
