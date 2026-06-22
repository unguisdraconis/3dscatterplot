import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as d3 from "d3";
import { linear, curve, badRepartition, outlier } from "./data.js";

// Pick which dataset to visualize:
const data = linear; // change to curve, badRepartition, outlier

// D3 scales for x and y
const xScale = d3.scaleLinear().domain([0, 10]).range([-5, 5]);
const yScale = d3.scaleLinear().domain([0, 10]).range([-5, 5]);

// Z positions on cube faces
const cubeFaces = [-5, 5]; // front and back faces
let faceIndex = 0;

// Convert dataset into 3D points
const points3D = data.map((d) => {
  const z = cubeFaces[faceIndex];
  faceIndex = (faceIndex + 1) % cubeFaces.length; // alternate faces
  return {
    x: xScale(d.x),
    y: yScale(d.y),
    z,
  };
});

// Three.js setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(10, 10, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Build geometry
const geometry = new THREE.BufferGeometry();
const positions = [];

points3D.forEach((p) => {
  positions.push(p.x, p.y, p.z);
});

geometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(positions, 3),
);

const material = new THREE.PointsMaterial({
  color: 0xff4444,
  size: 0.25,
});

const points = new THREE.Points(geometry, material);
scene.add(points);

// Cube edges for reference
const box = new THREE.BoxHelper(
  new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10)),
  0x4444ff,
);
scene.add(box);

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Resize handler
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
