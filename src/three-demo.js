import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as d3 from "d3";

import {
  linear,
  curve,
  badRepartition,
  outlier,
  exponentialLike,
  random,
} from "./data.js";

const axisHtmlLabels = [];

// ---------------- Regression Helpers ----------------

// Slope + intercept
export const linearRegression = (data) => {
  const xMean = d3.mean(data, (d) => d.x);
  const yMean = d3.mean(data, (d) => d.y);
  const slope =
    d3.sum(data, (d) => (d.x - xMean) * (d.y - yMean)) /
    d3.sum(data, (d) => (d.x - xMean) ** 2);
  const intercept = yMean - slope * xMean;
  return { slope, intercept };
};

// R²
export const computeR2 = (data, slope, intercept) => {
  const yMean = d3.mean(data, (d) => d.y);
  const ssTotal = d3.sum(data, (d) => (d.y - yMean) ** 2);
  const ssResidual = d3.sum(
    data,
    (d) => (d.y - (slope * d.x + intercept)) ** 2,
  );
  return 1 - ssResidual / ssTotal;
};

// Correlation
export const computeCorrelation = (data) => {
  const xMean = d3.mean(data, (d) => d.x);
  const yMean = d3.mean(data, (d) => d.y);

  const num = d3.sum(data, (d) => (d.x - xMean) * (d.y - yMean));
  const den = Math.sqrt(
    d3.sum(data, (d) => (d.x - xMean) ** 2) *
      d3.sum(data, (d) => (d.y - yMean) ** 2),
  );

  return num / den;
};

// All datasets you want to use:
const datasets = [
  { name: "Linear", data: linear },
  { name: "Curve", data: curve },
  { name: "Bad Repartition", data: badRepartition },
  { name: "Outlier", data: outlier },
  { name: "ExponentialLike", data: exponentialLike },
  { name: "random", data: random },
];

const pointClouds = [];

const axisGroups = [];

let regressionLine = null;
let regressionLabel = null;

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

// Entrance animation state
let introStart = performance.now();
let introDuration = 3000; // 10 seconds
let introActive = true;

// Camera starting far away
const introCameraStart = new THREE.Vector3(0, 0, 80);
const introCameraEnd = camera.position.clone();

// Set initial camera position
camera.position.copy(introCameraStart);

// Add cube edges
const box = new THREE.BoxHelper(
  new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10)),
  0x4444ff,
);
scene.add(box);

const cubeGroup = new THREE.Group();
cubeGroup.add(box);
scene.add(cubeGroup);

// Remove previous regression line + label
function clearRegression() {
  if (regressionLine) {
    cubeGroup.remove(regressionLine);
    regressionLine.geometry.dispose();
    regressionLine.material.dispose();
    regressionLine = null;
  }

  // Clear HTML label
  document.getElementById("regression-stats").textContent = "";
}

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

const axisFaceTransforms = [
  (x, y) => ({ x, y, z: 5 }),
  (x, y) => ({ x: -x, y, z: -5 }),
  (x, y) => ({ x: 5, y, z: -x }),
  (x, y) => ({ x: -5, y, z: x }),
  (x, y) => ({ x, y: 5, z: -y }),
  (x, y) => ({ x, y: -5, z: y }),
];

function buildAxes() {
  const tickValues = d3.range(0, 11, 1);
  const labelContainer = document.getElementById("axis-labels");

  for (let face = 0; face < 6; face++) {
    const group = new THREE.Group();
    const transform = axisFaceTransforms[face];

    const axisMat = new THREE.LineBasicMaterial({
      color: 0x666666,
      transparent: true,
      opacity: 0.15,
    });

    // X-axis
    {
      const p1 = transform(xScale(0), yScale(0));
      const p2 = transform(xScale(10), yScale(0));

      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(p1.x, p1.y, p1.z),
        new THREE.Vector3(p2.x, p2.y, p2.z),
      ]);

      group.add(new THREE.Line(geo, axisMat.clone()));
    }

    // Y-axis
    {
      const p1 = transform(xScale(0), yScale(0));
      const p2 = transform(xScale(0), yScale(10));

      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(p1.x, p1.y, p1.z),
        new THREE.Vector3(p2.x, p2.y, p2.z),
      ]);

      group.add(new THREE.Line(geo, axisMat.clone()));
    }

    // Tick marks + HTML labels
    tickValues.forEach((t) => {
      // X ticks
      {
        const x = xScale(t);
        const y = yScale(0);

        const p1 = transform(x, y);
        const p2 = transform(x, yScale(-0.3));

        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(p1.x, p1.y, p1.z),
          new THREE.Vector3(p2.x, p2.y, p2.z),
        ]);

        group.add(new THREE.Line(geo, axisMat.clone()));

        // HTML label
        const div = document.createElement("div");
        div.className = "axis-label";
        div.textContent = t;
        labelContainer.appendChild(div);

        axisHtmlLabels.push({
          element: div,
          position: new THREE.Vector3(p2.x, p2.y, p2.z),
          face,
        });
      }

      // Y ticks
      {
        const x = xScale(0);
        const y = yScale(t);

        const p1 = transform(x, y);
        const p2 = transform(xScale(-0.3), y);

        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(p1.x, p1.y, p1.z),
          new THREE.Vector3(p2.x, p2.y, p2.z),
        ]);

        group.add(new THREE.Line(geo, axisMat.clone()));

        // HTML label
        const div = document.createElement("div");
        div.className = "axis-label";
        div.textContent = t;
        labelContainer.appendChild(div);

        axisHtmlLabels.push({
          element: div,
          position: new THREE.Vector3(p2.x, p2.y, p2.z),
          face,
        });
      }
    });

    axisGroups.push(group);
    cubeGroup.add(group);
  }
}

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

  // Sphere geometry for each point
  const sphereGeo = new THREE.SphereGeometry(0.15, 16, 16);
  const sphereMat = new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity: 1,
  });

  // Instanced mesh: one draw call per dataset
  const instanced = new THREE.InstancedMesh(
    sphereGeo,
    sphereMat,
    positions.length / 3,
  );

  const dummy = new THREE.Object3D();

  for (let j = 0; j < positions.length; j += 3) {
    dummy.position.set(positions[j], positions[j + 1], positions[j + 2]);
    dummy.updateMatrix();
    instanced.setMatrixAt(j / 3, dummy.matrix);
  }

  instanced.instanceMatrix.needsUpdate = true;

  cubeGroup.add(instanced);
  pointClouds.push(instanced);

  // Create flat geometry for sqaure sprites
  /*const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );

  const material = new THREE.PointsMaterial({
    color,
    size: 0.25,
  });

  const points = new THREE.Points(geometry, material);
  cubeGroup.add(points);

  pointClouds.push(points); // store it
  */
});

// Draw regression line + R² + correlation
function drawRegressionForDataset(index) {
  clearRegression();

  const ds = datasets[index].data;

  const { slope, intercept } = linearRegression(ds);
  const r2 = computeR2(ds, slope, intercept);
  const corr = computeCorrelation(ds);

  // Build smooth line
  const samples = d3.range(0, 10.01, 0.1);
  const linePoints = samples.map((x) => ({
    x: xScale(x),
    y: yScale(slope * x + intercept),
  }));

  const transform = faceTransforms[index];
  const positions = [];

  // Transform points first
  let transformed = linePoints.map((p) => {
    const t = transform(p.x, p.y);
    return new THREE.Vector3(t.x, t.y, t.z);
  });

  // Project to screen space to determine left→right order
  transformed.forEach((v) => {
    const projected = v.clone().project(camera);
    v._screenX = projected.x; // store screen X for sorting
  });

  // Sort by screen X (left → right)
  transformed.sort((a, b) => a._screenX - b._screenX);

  // Build final sorted positions array
  const sortedPositions = [];
  transformed.forEach((v) => {
    sortedPositions.push(v.x, v.y, v.z);
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(sortedPositions, 3),
  );

  const material = new THREE.LineBasicMaterial({
    color: "#999999",
    linewidth: 2,
  });

  regressionLine = new THREE.Line(geometry, material);
  cubeGroup.add(regressionLine);

  // --- Animate the regression line being drawn ---
  let progress = 0;
  const totalPoints = sortedPositions.length / 3;
  const speed = 0.1; // increase for faster drawing

  // Start with nothing drawn
  geometry.setDrawRange(0, 0);

  function animateLine() {
    progress += speed;
    geometry.setDrawRange(0, Math.min(progress, totalPoints));

    if (progress < totalPoints) {
      requestAnimationFrame(animateLine);
    }
  }

  animateLine();

  document.getElementById("regression-stats").textContent =
    `R² = ${r2.toFixed(3)}    Corr = ${corr.toFixed(3)}`;
}

// Add light source to the scene, required for spheres
const light = new THREE.DirectionalLight(0xffffff, 1.2);
light.position.set(10, 10, 10);
scene.add(light);

scene.add(new THREE.AmbientLight(0xffffff, 0.4));

buildAxes();

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

    axisGroups.forEach((ag, i) => {
      const targetOpacity = i === selectedIndex ? 1 : 0.15;

      ag.children.forEach((child) => {
        if (child.material) {
          child.material.opacity =
            child.material.opacity +
            (targetOpacity - child.material.opacity) * t;
          child.material.transparent = true;
        }
      });
    });

    axisHtmlLabels.forEach((label) => {
      label.element.style.opacity = label.face === selectedIndex ? 1 : 0.15;
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
function animateCameraTo(target, onComplete) {
  const start = camera.position.clone();
  const end = new THREE.Vector3(target.x, target.y, target.z);

  let t = 0;
  const duration = 0.002;

  function step() {
    t += duration;
    camera.position.lerpVectors(start, end, t);
    controls.target.lerp(new THREE.Vector3(0, 0, 0), t);

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      if (onComplete) onComplete();
    }
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
    animateCameraTo(cameraTargets[i], () => {
      animateOpacity(i);
      drawRegressionForDataset(i);
    });
  });

  btnContainer.appendChild(btn);
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const elapsed = now - introStart;

  if (introActive) {
    // 0 → 1 easing factor
    const t = Math.min(elapsed / introDuration, 1);

    // Rapid spin at start, slowing down
    const spinSpeed = (1 - t) * 0.05; // fast → slow
    cubeGroup.rotation.x += spinSpeed;
    cubeGroup.rotation.y += spinSpeed * 0.2;

    // Camera zoom-in animation
    camera.position.lerpVectors(introCameraStart, introCameraEnd, t);
    controls.target.lerp(new THREE.Vector3(0, 0, 0), t);

    if (t >= 1) {
      introActive = false;
      cubeGroup.rotation.set(0, 0, 0); // realign cube with camera targets
      clearRegression();
    }
  } else {
    // Normal interactive mode
    controls.update();
  }

  // Update HTML label positions
  axisHtmlLabels.forEach((label) => {
    const pos = label.position.clone();
    pos.project(camera);

    const x = (pos.x * 0.5 + 0.5) * window.innerWidth;

    const yOffset = 50; // You can adjust this value as needed
    const y = (-pos.y * 0.5 + 0.5) * window.innerHeight + yOffset;

    label.element.style.left = `${x}px`;
    label.element.style.top = `${y}px`;
  });

  renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
