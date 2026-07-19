import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Color,
  Vector3,
  CatmullRomCurve3,
  TubeGeometry,
  SphereGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Mesh,
  AmbientLight,
  PointLight,
  DirectionalLight
} from "three";

// The hero visual: the brand "N" mark, built as a single continuous 3D cable
// rather than flat vector strokes — literally "our brand is a network cable".
// A thin, unlit, brighter inner tube simulates the glowing fibre core inside
// the cable sheath; a larger, very transparent duplicate of each glowing part
// fakes a bloom halo cheaply, without pulling in postprocessing passes.
// Points trace a classic single-stroke N (left stem down, diagonal up to the
// right stem's top, right stem down), with gentle z waviness so it reads as
// a real cable draped in space rather than a flat rigid shape.
const CABLE_POINTS = [
  [-1.4, 1.6, 0.2],
  [-1.4, 0.9, 0.35],
  [-1.4, -0.2, 0.0],
  [-1.4, -1.6, -0.35],
  [-0.7, -1.0, -0.15],
  [0.0, 0.0, 0.25],
  [0.7, 1.0, -0.15],
  [1.4, 1.6, 0.35],
  [1.4, 0.6, 0.0],
  [1.4, -1.6, -0.2]
];

const NODE_INDICES = [0, 3, 7, 9];

export function setupHeroCable({ reducedMotion, isCoarsePointer }) {
  const canvas = document.getElementById("heroCable");
  const hero = document.querySelector(".hero-visual");
  if (!canvas || !hero) return false;

  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch {
    return false;
  }
  if (!renderer) return false;

  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 100);
  const RADIUS = 6.4;

  const curve = new CatmullRomCurve3(CABLE_POINTS.map(([x, y, z]) => new Vector3(x, y, z)), false, "catmullrom", 0.4);

  const sheath = new Mesh(
    new TubeGeometry(curve, 220, 0.16, 12, false),
    new MeshStandardMaterial({ color: new Color("#0c1a16"), roughness: 0.45, metalness: 0.35 })
  );
  scene.add(sheath);

  const core = new Mesh(
    new TubeGeometry(curve, 220, 0.05, 8, false),
    new MeshBasicMaterial({ color: new Color("#9dffcf") })
  );
  scene.add(core);

  const glow = new Mesh(
    new TubeGeometry(curve, 220, 0.11, 8, false),
    new MeshBasicMaterial({ color: new Color("#74eeb9"), transparent: true, opacity: 0.22 })
  );
  scene.add(glow);

  NODE_INDICES.forEach((i) => {
    const [x, y, z] = CABLE_POINTS[i];
    const dot = new Mesh(new SphereGeometry(0.15, 20, 20), new MeshBasicMaterial({ color: new Color("#dbff8e") }));
    dot.position.set(x, y, z);
    scene.add(dot);
    const halo = new Mesh(
      new SphereGeometry(0.3, 16, 16),
      new MeshBasicMaterial({ color: new Color("#dbff8e"), transparent: true, opacity: 0.18 })
    );
    halo.position.set(x, y, z);
    scene.add(halo);
  });

  scene.add(new AmbientLight(new Color("#1c3a30"), 1.4));
  const key = new DirectionalLight(new Color("#bff5da"), 1.1);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new PointLight(new Color("#74eeb9"), 18, 20);
  rim.position.set(-4, -2, 3);
  scene.add(rim);

  function resize() {
    const rect = hero.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, isCoarsePointer ? 1.5 : 2);
    renderer.setPixelRatio(ratio);
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / Math.max(1, rect.height);
    camera.updateProjectionMatrix();
  }

  function setCameraAngle(theta, tilt) {
    camera.position.x = RADIUS * Math.sin(theta);
    camera.position.z = RADIUS * Math.cos(theta);
    camera.position.y = 0.3 + tilt * 0.7;
    camera.lookAt(0, 0, 0);
  }

  const state = { scrollT: 0 };
  setCameraAngle(0, 0);
  resize();
  renderer.render(scene, camera);

  if (reducedMotion.matches) {
    window.addEventListener("resize", () => {
      resize();
      renderer.render(scene, camera);
    });
    return true;
  }

  let raf = 0;
  let running = true;

  function frame(time) {
    if (!running) return;
    const idle = Math.sin(time * 0.00025) * 0.05;
    const baseAngle = -0.55 + state.scrollT * 1.1;
    setCameraAngle(baseAngle + idle, state.scrollT);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);

  window.addEventListener("resize", resize);

  const observer = new IntersectionObserver(
    (entries) => {
      const isIntersecting = entries[0]?.isIntersecting;
      if (isIntersecting && !running) {
        running = true;
        raf = requestAnimationFrame(frame);
      } else if (!isIntersecting && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    },
    { threshold: 0 }
  );
  observer.observe(hero);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running) {
      running = false;
      cancelAnimationFrame(raf);
    } else if (!document.hidden && !running) {
      running = true;
      raf = requestAnimationFrame(frame);
    }
  });

  return { setScrollT: (t) => { state.scrollT = t; } };
}
