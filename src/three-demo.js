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

// ── Regression helpers ───────────────────────────────────────────────────────

export const linearRegression = (data) => {
  const xMean = d3.mean(data, (d) => d.x);
  const yMean = d3.mean(data, (d) => d.y);
  const slope =
    d3.sum(data, (d) => (d.x - xMean) * (d.y - yMean)) /
    d3.sum(data, (d) => (d.x - xMean) ** 2);
  return { slope, intercept: yMean - slope * xMean };
};

export const computeR2 = (data, slope, intercept) => {
  const yMean = d3.mean(data, (d) => d.y);
  const ssTot = d3.sum(data, (d) => (d.y - yMean) ** 2);
  const ssRes = d3.sum(data, (d) => (d.y - (slope * d.x + intercept)) ** 2);
  return 1 - ssRes / ssTot;
};

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

// ── Public constants ─────────────────────────────────────────────────────────

export const okabeIto = [
  "#E69F00",
  "#56B4E9",
  "#009E73",
  "#F0E442",
  "#0072B2",
  "#D55E00",
  "#CC79A7",
];

export const datasets = [
  { name: "Linear", data: linear },
  { name: "Curve", data: curve },
  { name: "Bad Repartition", data: badRepartition },
  { name: "Outlier", data: outlier },
  { name: "Exponential", data: exponentialLike },
  { name: "Random", data: random },
];

// ── Main init function ───────────────────────────────────────────────────────
//
// @param {{ container: HTMLElement, labelsContainer: HTMLElement, onStats: (s:string)=>void }} opts
// @returns {{ selectDataset: (i:number)=>void, cleanup: ()=>void }}

export function initScene({ container, labelsContainer, onStats }) {
  const axisHtmlLabels = [];
  const pointClouds = [];
  const axisGroups = [];
  let regressionLine = null;
  let animFrameId = null;

  const W = () => container.clientWidth;
  const H = () => container.clientHeight;

  // ── Scene ──────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  const camera = new THREE.PerspectiveCamera(75, W() / H(), 0.1, 1000);
  camera.position.set(15, 15, 15);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W(), H());
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.005;

  // ── Intro animation ────────────────────────────────────────────────────────
  const introStart = performance.now();
  const introDuration = 3000;
  let introActive = true;
  const introCameraStart = new THREE.Vector3(0, 0, 80);
  const introCameraEnd = camera.position.clone();
  camera.position.copy(introCameraStart);

  // ── Cube ───────────────────────────────────────────────────────────────────
  const box = new THREE.BoxHelper(
    new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10)),
    0x4444ff,
  );
  const cubeGroup = new THREE.Group();
  cubeGroup.add(box);
  scene.add(cubeGroup);

  // ── D3 scales ──────────────────────────────────────────────────────────────
  const xScale = d3.scaleLinear().domain([0, 10]).range([-5, 5]);
  const yScale = d3.scaleLinear().domain([0, 10]).range([-5, 5]);

  // ── Face transforms ────────────────────────────────────────────────────────
  const faceTransforms = [
    (x, y) => ({ x, y, z: 5 }), // FRONT  +Z
    (x, y) => ({ x, y, z: -5 }), // BACK   -Z
    (x, y) => ({ x: 5, y, z: x }), // RIGHT  +X
    (x, y) => ({ x: -5, y, z: x }), // LEFT   -X
    (x, y) => ({ x, y: 5, z: y }), // TOP    +Y
    (x, y) => ({ x, y: -5, z: y }), // BOTTOM -Y
  ];

  const axisFaceTransforms = [
    (x, y) => ({ x, y, z: 5 }),
    (x, y) => ({ x: -x, y, z: -5 }),
    (x, y) => ({ x: 5, y, z: -x }),
    (x, y) => ({ x: -5, y, z: x }),
    (x, y) => ({ x, y: 5, z: -y }),
    (x, y) => ({ x, y: -5, z: y }),
  ];

  // ── Camera targets (one per face) ──────────────────────────────────────────
  const cameraTargets = [
    { x: 0, y: 0, z: 20 },
    { x: 0, y: 0, z: -20 },
    { x: 20, y: 0, z: 0 },
    { x: -20, y: 0, z: 0 },
    { x: 0, y: 20, z: 0 },
    { x: 0, y: -20, z: 0 },
  ];

  // ── Regression ─────────────────────────────────────────────────────────────
  function clearRegression() {
    if (regressionLine) {
      cubeGroup.remove(regressionLine);
      regressionLine.geometry.dispose();
      regressionLine.material.dispose();
      regressionLine = null;
    }
    onStats?.("");
  }

  function drawRegressionForDataset(index) {
    clearRegression();
    const ds = datasets[index].data;
    const { slope, intercept } = linearRegression(ds);
    const r2 = computeR2(ds, slope, intercept);
    const corr = computeCorrelation(ds);

    const transform = faceTransforms[index];
    let transformed = d3.range(0, 10.01, 0.1).map((xv) => {
      const p = transform(xScale(xv), yScale(slope * xv + intercept));
      return new THREE.Vector3(p.x, p.y, p.z);
    });

    // Sort left→right in screen space for a clean draw animation
    transformed.forEach((v) => {
      v._sx = v.clone().project(camera).x;
    });
    transformed.sort((a, b) => a._sx - b._sx);

    const flat = [];
    transformed.forEach((v) => flat.push(v.x, v.y, v.z));

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(flat, 3));
    regressionLine = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({ color: 0x999999, linewidth: 2 }),
    );
    cubeGroup.add(regressionLine);

    // Animate the line being drawn
    let progress = 0;
    const total = flat.length / 3;
    geo.setDrawRange(0, 0);
    (function drawStep() {
      progress += 0.1;
      geo.setDrawRange(0, Math.min(progress, total));
      if (progress < total) requestAnimationFrame(drawStep);
    })();

    onStats?.(`R²:   ${r2.toFixed(3)}\nCorr: ${corr.toFixed(3)}`);
  }

  // ── Axes ───────────────────────────────────────────────────────────────────
  function buildAxes() {
    const ticks = d3.range(0, 11, 1);

    for (let face = 0; face < 6; face++) {
      const group = new THREE.Group();
      const tfm = axisFaceTransforms[face];
      const baseMat = new THREE.LineBasicMaterial({
        color: 0x666666,
        transparent: true,
        opacity: 0.15,
      });

      const addLine = (x0, y0, x1, y1) => {
        const p0 = tfm(x0, y0),
          p1 = tfm(x1, y1);
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(p0.x, p0.y, p0.z),
          new THREE.Vector3(p1.x, p1.y, p1.z),
        ]);
        group.add(new THREE.Line(geo, baseMat.clone()));
      };

      // Axis lines
      addLine(xScale(0), yScale(0), xScale(10), yScale(0));
      addLine(xScale(0), yScale(0), xScale(0), yScale(10));

      // Ticks + HTML labels
      ticks.forEach((t) => {
        // X tick
        addLine(xScale(t), yScale(0), xScale(t), yScale(-0.3));
        if (labelsContainer) {
          const p = tfm(xScale(t), yScale(-0.3));
          const el = Object.assign(document.createElement("div"), {
            className: "axis-label",
            textContent: t,
          });
          labelsContainer.appendChild(el);
          axisHtmlLabels.push({
            element: el,
            position: new THREE.Vector3(p.x, p.y, p.z),
            face,
          });
        }

        // Y tick
        addLine(xScale(0), yScale(t), xScale(-0.3), yScale(t));
        if (labelsContainer) {
          const p = tfm(xScale(-0.3), yScale(t));
          const el = Object.assign(document.createElement("div"), {
            className: "axis-label",
            textContent: t,
          });
          labelsContainer.appendChild(el);
          axisHtmlLabels.push({
            element: el,
            position: new THREE.Vector3(p.x, p.y, p.z),
            face,
          });
        }
      });

      axisGroups.push(group);
      cubeGroup.add(group);
    }
  }

  // ── Point clouds (instanced meshes) ───────────────────────────────────────
  datasets.forEach((ds, i) => {
    const color = okabeIto[i % okabeIto.length];
    const transform = faceTransforms[i % faceTransforms.length];
    const flat = [];

    ds.data.forEach((d) => {
      const p = transform(xScale(d.x), yScale(d.y));
      flat.push(p.x, p.y, p.z);
    });

    const geo = new THREE.SphereGeometry(0.15, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 1,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, flat.length / 3);
    const dummy = new THREE.Object3D();

    for (let j = 0; j < flat.length; j += 3) {
      dummy.position.set(flat[j], flat[j + 1], flat[j + 2]);
      dummy.updateMatrix();
      mesh.setMatrixAt(j / 3, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    cubeGroup.add(mesh);
    pointClouds.push(mesh);
  });

  // Lights
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(10, 10, 10);
  scene.add(dirLight);
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));

  buildAxes();

  // ── Opacity animation ──────────────────────────────────────────────────────
  function animateOpacity(selectedIndex) {
    let t = 0;
    const from = pointClouds.map((pc) => pc.material.opacity);
    const to = pointClouds.map((_, i) => (i === selectedIndex ? 1 : 0.3));

    (function step() {
      t += 0.002;
      pointClouds.forEach((pc, i) => {
        pc.material.opacity = from[i] + (to[i] - from[i]) * t;
        pc.material.transparent = true;
        pc.material.needsUpdate = true;
      });
      axisGroups.forEach((ag, i) => {
        const target = i === selectedIndex ? 1 : 0.15;
        ag.children.forEach((child) => {
          if (child.material)
            child.material.opacity += (target - child.material.opacity) * t;
        });
      });
      axisHtmlLabels.forEach((lbl) => {
        lbl.element.style.opacity = lbl.face === selectedIndex ? 1 : 0.15;
      });
      if (t < 1) requestAnimationFrame(step);
    })();
  }

  // ── Camera animation ───────────────────────────────────────────────────────
  function animateCameraTo(target, onComplete) {
    const start = camera.position.clone();
    const end = new THREE.Vector3(target.x, target.y, target.z);
    let t = 0;
    (function step() {
      t += 0.002;
      camera.position.lerpVectors(start, end, t);
      controls.target.lerp(new THREE.Vector3(0, 0, 0), t);
      t < 1 ? requestAnimationFrame(step) : onComplete?.();
    })();
  }

  // ── Render loop ────────────────────────────────────────────────────────────
  function animate() {
    animFrameId = requestAnimationFrame(animate);

    const t = Math.min((performance.now() - introStart) / introDuration, 1);

    if (introActive) {
      const spin = (1 - t) * 0.05;
      cubeGroup.rotation.x += spin;
      cubeGroup.rotation.y += spin * 0.2;
      camera.position.lerpVectors(introCameraStart, introCameraEnd, t);
      controls.target.lerp(new THREE.Vector3(0, 0, 0), t);
      if (t >= 1) {
        introActive = false;
        cubeGroup.rotation.set(0, 0, 0);
        clearRegression();
      }
    } else {
      controls.update();
    }

    // Update HTML axis label positions relative to the container
    axisHtmlLabels.forEach((lbl) => {
      const p = lbl.position.clone().project(camera);
      lbl.element.style.left = `${(p.x * 0.5 + 0.5) * W()}px`;
      lbl.element.style.top = `${(-p.y * 0.5 + 0.5) * H()}px`;
    });

    renderer.render(scene, camera);
  }
  animate();

  // ── ResizeObserver (replaces window resize listener) ──────────────────────
  const ro = new ResizeObserver(() => {
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
    renderer.setSize(W(), H());
  });
  ro.observe(container);

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    selectDataset(i) {
      animateCameraTo(cameraTargets[i], () => {
        animateOpacity(i);
        drawRegressionForDataset(i);
      });
    },
    cleanup() {
      cancelAnimationFrame(animFrameId);
      ro.disconnect();
      renderer.dispose();
      if (container.contains(renderer.domElement))
        container.removeChild(renderer.domElement);
      if (labelsContainer) labelsContainer.innerHTML = "";
    },
  };
}
