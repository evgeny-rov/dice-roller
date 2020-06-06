import * as THREE from 'three';
import * as CANNON from 'cannon';
import './app.css'

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import CannonDebugRenderer from './debugger';
import icosahedronTemplate from './icosahedron'

const D6_MODEL_URL = './public/nd6/scene.gltf';
const D20_MODEL_URL = './public/3d20/scene.gltf';

const translateVerticies = icosahedronTemplate.vertices.map(({ x, y, z }) => new CANNON.Vec3(x * 2, y * 2, z * 2));
const icosahedron = { vertices: translateVerticies, faces: icosahedronTemplate.faces };

interface Dice {
  physicsBody: CANNON.Body;
  renderBody: THREE.Object3D;
}

interface Models {
  [type: string]: THREE.Object3D;
}

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
  numOfModels: number;
  constructor() {
    this.scene = new THREE.Scene();
    this.world = new CANNON.World();
    this.world.gravity.set(0, 0, -50);
    this.world.broadphase = new CANNON.NaiveBroadphase();

    this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);

    this.cannonDebugger = new CannonDebugRenderer( this.scene, this.world );
    
    this.fixedTimeStep = 1.0 / 60.0;
    this.modelLoader = new GLTFLoader();
    this.customModels = {};
    this.objectsList = [];
    this.numOfModels = 2;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    //this.renderer.setClearColor(0x000000)
    this.renderer.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1);
    console.log(this.renderer.getPixelRatio())
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    
    const containerElement: HTMLElement = document.getElementById('container');
    containerElement && containerElement.appendChild(this.renderer.domElement);
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    
    const planeGeometry = new THREE.PlaneBufferGeometry( 100, 100 );
    const planeMaterial = new THREE.MeshPhysicalMaterial( {color: 0xFF0000, dithering: true} );
    const plane = new THREE.Mesh( planeGeometry, planeMaterial );
    plane.receiveShadow = true;
    this.scene.add(plane);

    //this.scene.add( new THREE.AxesHelper( 10 ) );
    this.loader();
    this.initLights();
    this.initBounds();
    this.resize();
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;
    this.renderer.setSize(width, height);
    this.camera.aspect = aspect;
    this.camera.fov = aspect > 1 ? 80 : 100;
    this.camera.position.z = aspect > 1 ? 30 : 40;
    this.camera.updateProjectionMatrix();
  }

  loader(): void {
    const loadModel = (url: string, modelType: string, scale: number[]) => {
      const [x, y, z] = scale;
      this.modelLoader.load(url, (model): void => {
        model.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        })
        model.scene.scale.set(x, y, z);
        model.scene.position.set(0, 0, 100);
        model.scene.userData.type = modelType;
        this.customModels = { ...this.customModels, [modelType]: model.scene };
      });
    }

    loadModel(D6_MODEL_URL, 'd6', [0.16, 0.16, 0.16])
    loadModel(D20_MODEL_URL, 'd20', [0.035, 0.035, 0.035])
  }

  init() {
    const loadedModelsLength = Object.keys(this.customModels).length;
    const isLoaded = loadedModelsLength === this.numOfModels;
    if (isLoaded) {
      initListeners();
      this.roll(3, this.customModels.d6);
    } else {
      setTimeout(() => this.init(), 100);
    }
  }

  initBounds() {
    const createPhysicsPlaneBody = (mass: number, pos?: number[], qt?: number[]) => {
      const [px, py, pz] = pos || [0, 0, 0];
      const [qx, qy, qz, qw] = qt || [0, 0, 0 ,0];
      const body = new CANNON.Body({
        mass,
        shape: new CANNON.Plane(),
        position: pos && new CANNON.Vec3(px, py, pz),
        quaternion: qt && new CANNON.Quaternion(qx, qy, qz, qw),
      })
      this.world.addBody(body);
    }
    createPhysicsPlaneBody(0)
    createPhysicsPlaneBody(0, [0, 20, 0], [0.4999, 0, 0, 0.8660])
    createPhysicsPlaneBody(0, [20, 0, 0], [0, -0.4999, 0, 0.8660])
    createPhysicsPlaneBody(0, [-20, 0, 0], [0, 0.4999, 0, 0.8660])
  }

  initLights() {
    const createLight = (color: number, position: Array<number>) => {
      const light = new THREE.SpotLight(color, 1);
      const [x, y, z] = position;
      light.position.set(x, y, z);
      light.angle = Math.PI / 12;
      light.penumbra = 1;
      light.decay = 2;
      light.distance = 150;
      light.castShadow = true;
      light.shadow.bias = -0.00001;
      //const helper = new THREE.SpotLightHelper(light)
      //this.scene.add(light, helper);
      this.scene.add(light)
    }
    createLight(0x7ff2ff, [0, -50, 60]);
    createLight(0xFFFFFF, [70, 0, 60]);
    createLight(0xFFFFFF, [-70, 0, 60]);
    //const color = i === 0 ? 0x7ff2ff: 0x00FFFF;
  }

  clear() {
    this.objectsList.forEach((dice) => {
      this.scene.remove(dice.renderBody);
      this.scene.dispose();
      this.world.remove(dice.physicsBody);
    })
    this.objectsList = [];
  }

  roll(amount: number, model: THREE.Object3D) {
    this.clear();
    for (let i = 0; i < amount; i++) {
      const shapeToUse = model.userData.type === 'd6'
        ? new CANNON.Box(new CANNON.Vec3(1.5, 1.5, 1.5))
        : new CANNON.ConvexPolyhedron(icosahedron.vertices, icosahedron.faces);
      const diceModel = model.clone();
      const diceBody = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(Math.random() * 10 , Math.random() * 10 - 50, 35 + Math.random() * 10),
        velocity: new CANNON.Vec3(0, 25 + Math.random() * 10, 0),
        angularVelocity: new CANNON.Vec3(-10, -10, -10),
        shape: shapeToUse,
      });
      this.world.addBody(diceBody);
      this.scene.add(diceModel);
      this.objectsList.push({ physicsBody: diceBody, renderBody: diceModel });
    }
  }

  render(): void {
    this.world.step(this.fixedTimeStep);
    requestAnimationFrame(() => this.render());
    this.renderer.render(this.scene, this.camera);
    this.cannonDebugger.update();

    this.objectsList.forEach(({ physicsBody, renderBody }) => {
      const { x, y, z } = physicsBody.position;
      const qt = physicsBody.quaternion;
      renderBody.quaternion.set(qt.x, qt.y, qt.z, qt.w);
      renderBody.position.set(x, y, z);
    })
  }
}

const initListeners = () => {
  const diceAmountElement = document.getElementById('roll-amount');
  const sliderElement = document.getElementById('slider') as HTMLInputElement;
  const incButtonElement: HTMLElement = document.querySelector('.btn-set-inc');
  const decButtonElement: HTMLElement = document.querySelector('.btn-set-dec');
  const rollButtonElement: HTMLElement = document.querySelector('.btn-main');

  const RollAmountHandler = (toInc: boolean) => {
    const MaxValue = 5;
    const minValue = 1;
    const targetElementValue = parseInt(diceAmountElement.textContent);
    const newValue = toInc ? targetElementValue + 1 : targetElementValue - 1; 
    if (newValue >= minValue && newValue <= MaxValue) diceAmountElement.textContent = newValue.toString();
  }

  sliderElement.onclick = (e: Event) => {
    const selectElements = document.querySelectorAll('span.select');
    selectElements.forEach((el) => el.classList.toggle('active'));
  }

  incButtonElement.onclick = () => RollAmountHandler(true);
  decButtonElement.onclick = () => RollAmountHandler(false);

  rollButtonElement.onclick = () => {
    const dieType = sliderElement.checked ? scene.customModels.d20 : scene.customModels.d6;
    const amountToRoll = parseInt(diceAmountElement.textContent);
    scene.roll(amountToRoll, dieType);
  }

  window.addEventListener('resize', () => scene.resize());
}

const scene = new Main();
scene.render();
scene.init();
