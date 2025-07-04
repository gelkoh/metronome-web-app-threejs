import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js"

const ROTATE_SENSITIVITY = 0.01;
const ZOOM_SENSITIVITY = 0.2;
const MIN_CAMERA_DISTANCE = 1.5;
const DEFAULT_CAMERA_DISTANCE = 3;
const MAX_CAMERA_DISTANCE = 4.5;
const MIN_BPM = 40;
const DEFAULT_BPM = 120;
const MAX_BPM = 208;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.minDistance = MIN_CAMERA_DISTANCE;
controls.maxDistance = MAX_CAMERA_DISTANCE;

const light = new THREE.AmbientLight(0xFFFFFF, 1);
scene.add(light);

const loader = new GLTFLoader();
loader.load("./public/models/metronome.glb", function(gltf) {
    scene.add(gltf.scene);
}, undefined, function(error) {
    console.error(error);
});

camera.position.z = DEFAULT_CAMERA_DISTANCE;

const animate = () => {
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

const roundTo = (value, decimals) => {
    return Math.round(value * 10 ** decimals) / 10 ** decimals;
}

let lastMouseX, lastMouseY;

// const rotateMetronome = (e) => {
//     if (lastMouseX == null || lastMouseY == null) {
//         lastMouseX = e.x;
//         lastMouseY = e.y;
//         return;
//     }
//
//     const diffX = (e.x - lastMouseX) * ROTATE_SENSITIVITY;
//     cube.rotation.y += diffX;
//
//     const diffY = (e.y - lastMouseY) * ROTATE_SENSITIVITY;
//     cube.rotation.x += diffY;
//
//     lastMouseX = e.x;
//     lastMouseY = e.y;
// }

const handleZoom = (e) => {
    if (e.deltaY < 0) {
        if (camera.position.z >= MAX_ZOOM && 
            camera.position.z - ZOOM_SENSITIVITY >= MAX_ZOOM
        ) {
            camera.position.z = roundTo(camera.position.z - ZOOM_SENSITIVITY, 2);
            return;
        }
    }

    if (e.deltaY > 0) {
        if (
            camera.position.z <= MIN_ZOOM &&
            camera.position.z + ZOOM_SENSITIVITY <= MIN_ZOOM
        ) {
            camera.position.z = roundTo(camera.position.z + ZOOM_SENSITIVITY, 2);
        }
    }
}

const metronomeAudio = document.getElementById("metronomeAudio");
const metronomeToggleButton = document.getElementById("metronomeToggleButton");
const bpmInput = document.getElementById("bpmInput");

bpmInput.setAttribute("min", MIN_BPM);
bpmInput.setAttribute("max", MAX_BPM);
bpmInput.setAttribute("value", DEFAULT_BPM);

const getBpmInMs = (bpm) => {
    return 60 * 1000 / bpm;
}

let intervalId;
let isMetronomeActive = false;
let bpmInMs = getBpmInMs(bpmInput.value);

const startMetronome = () => {
    if (isMetronomeActive) return;

    metronomeToggleButton.textContent = "Stop";
    isMetronomeActive = true;

    intervalId ??= setInterval(() => {
        metronomeAudio.play();
    }, bpmInMs);
}

const stopMetronome = () => {
    if (!isMetronomeActive) return;

    metronomeToggleButton.textContent = "Start";
    isMetronomeActive = false;
    clearInterval(intervalId);
    intervalId = null;
}

const toggleMetronome = () => {
    if (intervalId == null) {
        startMetronome();
        metronomeToggleButton.classList.add("metronome-active");
    } else {
        stopMetronome();
        metronomeToggleButton.classList.remove("metronome-active");
    }
}

const updateBpm = () => {
    if (bpmInput.value > MAX_BPM) {
        bpmInput.value = MAX_BPM;
    } else if (bpmInput.value < MIN_BPM) {
        bpmInput.value = MIN_BPM;
    }

    bpmInMs = getBpmInMs(bpmInput.value);

    if (isMetronomeActive) {
        stopMetronome();
        startMetronome();
    }
}

metronomeToggleButton.addEventListener("click", toggleMetronome)
bpmInput.addEventListener("change", updateBpm);
