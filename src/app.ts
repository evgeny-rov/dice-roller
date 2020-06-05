import * as THREE from 'three';

//test

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor(0xe5e5e5)
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry()
const material = new THREE.MeshLambertMaterial({ color: 0xFFCCFF });
const cube = new THREE.Mesh(geometry, material);

const light = new THREE.PointLight(0xFFFFFF, 1, 500);
light.position.set(10, 0, 25);

scene.add(cube, light);

camera.position.z = 5;

const animate = (): void => {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
}

animate();
