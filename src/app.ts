import * as THREE from 'three';
import * as CANNON from 'cannon';
import './app.css';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import CannonDebugRenderer from './debugger';
import icosahedronTemplate from './icosahedron';

const D6_MODEL_URL = './public/nd6/scene.gltf';
const D20_MODEL_URL = './public/3d20/scene.gltf';

const translatedVerticies = icosahedronTemplate.vertices
  .map(({ x, y, z }) => new CANNON.Vec3(x * 2, y * 2, z * 2));
const icosahedron = { vertices: translatedVerticies, faces: icosahedronTemplate.faces };

interface Dice {
  physicsBody: CANNON.Body;
  renderBody: THREE.Object3D;
}

interface Models {
  [type: string]: THREE.Object3D;
}

const randNum = (multiplier: number, allowNegative: boolean = true): number => {
  const baseValue = allowNegative ? (Math.random() - 0.5) * 2 : Math.random();
  return baseValue * multiplier;
};

const createPhysicsPlaneBody = (mass: number, pos?: number[], qt?: number[]) => {
  const [px, py, pz] = pos || [0, 0, 0];
  const [qx, qy, qz, qw] = qt || [0, 0, 0, 0];
  const body = new CANNON.Body({
    mass,
    shape: new CANNON.Plane(),
    position: pos && new CANNON.Vec3(px, py, pz),
    quaternion: qt && new CANNON.Quaternion(qx, qy, qz, qw),
  });
  return body;
};

const createLight = (scene: THREE.Scene, color: number, position: Array<number>) => {
  const light = new THREE.SpotLight(color, 1);
  const [x, y, z] = position;
  light.position.set(x, y, z);
  light.angle = Math.PI / 9;
  light.penumbra = 1;
  light.decay = 2;
  light.distance = 150;
  light.castShadow = true;
  light.shadow.bias = -0.00001;
  // const helper = new THREE.SpotLightHelper(light)
  // scene.add(light, helper);
  scene.add(light);
};

class Main {
  scene: THREE.Scene;

  camera: THREE.PerspectiveCamera;

  modelLoader: GLTFLoader;

  renderer: THREE.WebGLRenderer;

  controls: OrbitControls;

  customModels: Models;

  world: CANNON.World;

  fixedTimeStep: number;

  objectsList: Array<Dice>;

  cannonDebugger: any;

  numOfUsedModels: number;

  constructor() {
    this.scene = new THREE.Scene();
    this.world = new CANNON.World();
    this.world.gravity.set(0, 0, -60);
    this.world.broadphase = new CANNON.NaiveBroadphase();

    const aspectRatio = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(90, aspectRatio, 0.1, 1000);
    this.camera.fov = 80;
    this.camera.position.z = 30;

    this.cannonDebugger = new CannonDebugRenderer(this.scene, this.world);

    this.fixedTimeStep = 1.0 / 60.0;
    this.modelLoader = new GLTFLoader();
    this.customModels = {};
    this.objectsList = [];
    this.numOfUsedModels = 2;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    const containerElement = document.getElementById('container') as HTMLElement;
    containerElement.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    const planeGeometry = new THREE.PlaneBufferGeometry(200, 200);
    const planeMaterial = new THREE.MeshPhysicalMaterial({ color: 0xF10003, dithering: true });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.receiveShadow = true;
    this.scene.add(plane);

    this.initLights();
    this.initBounds();

    this.loadModel(D6_MODEL_URL, 'd6', [0.16, 0.16, 0.16]);
    this.loadModel(D20_MODEL_URL, 'd20', [0.035, 0.035, 0.035]);
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;
    const zoomValue = width > 600 ? 1 : 0.6;
    this.renderer.setSize(width, height);
    this.camera.aspect = aspect;
    this.camera.zoom = zoomValue;
    this.camera.updateProjectionMatrix();
  }

  loadModel(url: string, modelType: string, scale: number[]) {
    const [x, y, z] = scale;
    this.modelLoader.load(url, (model): void => {
      model.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mesh = child;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });
      const { userData } = model.scene;
      model.scene.scale.set(x, y, z);
      model.scene.position.set(0, 0, -100);
      userData.type = modelType;
      this.customModels = { ...this.customModels, [modelType]: model.scene };
    });
  }

  init() {
    const loadedModelsLength = Object.keys(this.customModels).length;
    const isLoaded = loadedModelsLength === this.numOfUsedModels;
    if (isLoaded) {
      this.resize();
      this.roll(3, this.customModels.d6);
      document.getElementById('controls-wrapper').style.visibility = 'visible';
      return true;
    }
    setTimeout(() => this.init(), 100);
    return false;
  }

  initBounds() {
    this.world.addBody(createPhysicsPlaneBody(0));
    this.world.addBody(createPhysicsPlaneBody(0, [0, 20, 0], [0.7071, 0, 0, 0.7071]));
    this.world.addBody(createPhysicsPlaneBody(0, [0, -20, 0], [-0.3826, 0, 0, 0.9238]));
    this.world.addBody(createPhysicsPlaneBody(0, [20, 0, 0], [0, -0.7071, 0, 0.7071]));
    this.world.addBody(createPhysicsPlaneBody(0, [-20, 0, 0], [0, 0.7071, 0, 0.7071]));
  }

  initLights() {
    createLight(this.scene, 0xFFFFFF, [0, -40, 60]);
    createLight(this.scene, 0xFFF9F6, [60, 0, 70]);
    createLight(this.scene, 0xFFF9F6, [-60, 0, 70]);
  }

  clear() {
    this.objectsList.forEach((dice) => {
      this.scene.remove(dice.renderBody);
      this.scene.dispose();
      this.world.remove(dice.physicsBody);
    });
    this.objectsList = [];
  }

  roll(amount: number, model: THREE.Object3D) {
    this.clear();
    for (let i = 0; i < amount; i += 1) {
      const diceShape = model.userData.type === 'd6'
        ? new CANNON.Box(new CANNON.Vec3(1.5, 1.5, 1.5))
        : new CANNON.ConvexPolyhedron(icosahedron.vertices, icosahedron.faces);

      const diceModel = model.clone();
      const diceBody = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(randNum(15), -35, 40),
        velocity: new CANNON.Vec3(0, 25 + randNum(10, false), 0),
        angularVelocity: new CANNON.Vec3(randNum(20), randNum(20), randNum(20)),
        shape: diceShape,
      });

      // diceBody.addEventListener('collide', (body: CANNON.Body) => console.log('collision', body))
      this.world.addBody(diceBody);
      this.scene.add(diceModel);
      this.objectsList.push({ physicsBody: diceBody, renderBody: diceModel });
    }
  }

  render(): void {
    requestAnimationFrame(() => this.render());
    this.world.step(this.fixedTimeStep);
    this.renderer.render(this.scene, this.camera);
    // this.cannonDebugger.update();

    this.objectsList.forEach(({ physicsBody, renderBody }) => {
      const { x, y, z } = physicsBody.position;
      const qt = physicsBody.quaternion;
      renderBody.quaternion.set(qt.x, qt.y, qt.z, qt.w);
      renderBody.position.set(x, y, z);
    });
  }
}

const scene = new Main();
scene.render();
scene.init();

const diceAmountElement: HTMLElement = document.getElementById('roll-amount');
const sliderElement = document.getElementById('slider') as HTMLInputElement;
const incButtonElement: HTMLElement = document.querySelector('.btn-set-inc');
const decButtonElement: HTMLElement = document.querySelector('.btn-set-dec');
const rollButtonElement: HTMLElement = document.querySelector('.btn-main');

const RollAmountHandler = (toInc: boolean) => {
  const MaxValue = 5;
  const minValue = 1;
  const targetElementValue = Number(diceAmountElement.textContent);
  const newValue = toInc ? targetElementValue + 1 : targetElementValue - 1;
  if (newValue >= minValue && newValue <= MaxValue) {
    diceAmountElement.textContent = newValue.toString();
  }
};

sliderElement.onclick = () => {
  const selectElements = document.querySelectorAll('span.select');
  selectElements.forEach((el) => el.classList.toggle('active'));
};

incButtonElement.onclick = () => RollAmountHandler(true);
decButtonElement.onclick = () => RollAmountHandler(false);

rollButtonElement.onclick = () => {
  const dieType = sliderElement.checked ? scene.customModels.d20 : scene.customModels.d6;
  const amountToRoll = Number(diceAmountElement.textContent);
  scene.roll(amountToRoll, dieType);
};

window.addEventListener('resize', () => scene.resize());
