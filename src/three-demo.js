import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as d3 from "d3";

import {
  linear,
  curve,
  badRepartition,
  outlier,
  diagonal,
  arc,
} from "./data.js";

// All datasets you want to use:
const datasets = [
  { name: "Linear", data: linear },
  { name: "Curve", data: curve },
  { name: "Bad Repartition", data: badRepartition },
  { name: "Outlier", data: outlier },
  { name: "Diagonal", data: diagonal },
  { name: "Arc", data: arc },
];

const pointClouds = [];

// Okabe–Ito palette
const okabeIto = [
  "#E69F00",
  "#56B4E9",
  "#009E73",
  "#F0E442",
  "#0072B2",
  "#D55E00",
  "#CC79A7",
];

// Cube face Z positions (6 faces)
const cubeFaces = [-5, 5, -5, 5, -5, 5];

// D3 scales
const xScale = d3.scaleLinear().domain([0, 10]).range([-5, 5]);
const yScale = d3.scaleLinear().domain([0, 10]).range([-5, 5]);

// THREE.js setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(15, 15, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// IMPORTANT: attach to isolated container so React cannot delete it
document.getElementById("three-container").appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.005;

// Add cube edges
const box = new THREE.BoxHelper(
  new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10)),
  0x4444ff,
);
scene.add(box);

const faceTransforms = [
  // FRONT (+Z)
  (x, y) => ({ x, y, z: 5 }),

  // BACK (–Z)
  (x, y) => ({ x, y, z: -5 }),

  // RIGHT (+X)
  (x, y) => ({ x: 5, y, z: x }),

  // LEFT (–X)
  (x, y) => ({ x: -5, y, z: x }),

  // TOP (+Y)
  (x, y) => ({ x, y: 5, z: y }),

  // BOTTOM (–Y)
  (x, y) => ({ x, y: -5, z: y }),
];

// Build point clouds — one per dataset
datasets.forEach((ds, i) => {
  const color = okabeIto[i % okabeIto.length];
  const transform = faceTransforms[i % faceTransforms.length];

  const positions = [];

  ds.data.forEach((d) => {
    const x = xScale(d.x);
    const y = yScale(d.y);
    const p = transform(x, y);
    positions.push(p.x, p.y, p.z);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );

  const material = new THREE.PointsMaterial({
    color,
    size: 0.25,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  pointClouds.push(points); // store it
});

function animateOpacity(selectedIndex, duration = 0.002) {
  let t = 0;

  const startOpacities = pointClouds.map((pc) => pc.material.opacity);
  const endOpacities = pointClouds.map((pc, i) =>
    i === selectedIndex ? 1 : 0.3,
  );

  function step() {
    t += duration;

    pointClouds.forEach((pc, i) => {
      const start = startOpacities[i];
      const end = endOpacities[i];
      pc.material.opacity = start + (end - start) * t;
      pc.material.transparent = true;
      pc.material.needsUpdate = true;
    });

    if (t < 1) requestAnimationFrame(step);
  }

  step();
}

// Camera targets for each dataset
const cameraTargets = [
  { x: 0, y: 0, z: 20 }, // front
  { x: 0, y: 0, z: -20 }, // back
  { x: 20, y: 0, z: 0 }, // right
  { x: -20, y: 0, z: 0 }, // left
  { x: 0, y: 20, z: 0 }, // top
  { x: 0, y: -20, z: 0 }, // bottom
];

// Animate camera transitions
function animateCameraTo(target) {
  const start = camera.position.clone();
  const end = new THREE.Vector3(target.x, target.y, target.z);

  let t = 0;
  const duration = 0.002; // smooth speed

  function step() {
    t += duration;
    camera.position.lerpVectors(start, end, t);
    controls.target.lerp(new THREE.Vector3(0, 0, 0), t);

    if (t < 1) requestAnimationFrame(step);
  }
  step();
}

// Create buttons dynamically
const btnContainer = document.getElementById("three-buttons");
btnContainer.innerHTML = ""; // clear existing

datasets.forEach((ds, i) => {
  const btn = document.createElement("button");
  btn.textContent = ds.name;

  btn.addEventListener("click", () => {
    animateCameraTo(cameraTargets[i]); // camera animation
    animateOpacity(i); // opacity animation
  });

  btnContainer.appendChild(btn);
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
