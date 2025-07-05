import * as Constants from "./constants.js";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DragControls } from "three/addons/controls/DragControls.js";

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

const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.minDistance = Constants.MIN_CAMERA_DISTANCE;
orbitControls.maxDistance = Constants.MAX_CAMERA_DISTANCE;

const light = new THREE.AmbientLight(0xFFFFFF, 1);
scene.add(light);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let metronome;
let pendulumBar;
let pendulumWeight;

let intersected = null;
let originalColor = null;

const audioContext = new AudioContext();
const osc = audioContext.createOscillator();
const gain = audioContext.createGain();
osc.connect(gain);
osc.type = "square";
gain.connect(audioContext.destination);
osc.frequency.value = 500;
gain.gain.setValueAtTime(0, audioContext.currentTime);
let oscStartedBefore = false;

const onMouseDown = (e) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
        if (intersected == intersects[0].object) return;

        if (intersected != null) {
            intersected.material.color.setHex(originalColor);
        }

        intersected = intersects[0].object;
        originalColor = intersected.material.color.getHex();
        intersected.material.color.set(255, 255, 255);
    } else {
        if (intersected == null) return;

        intersected.material.color.set(originalColor);
        intersected = null;
    }
}

let oldMouseX, mouseXDifference;

const getMouseXDifference = (e) => {
    mouseXDifference = oldMouseX - e.clientX;
    oldMouseX = e.clientX;
}

const getBpmInMs = (bpm) => {
    return 60 * 1000 / bpm;
}

const playClick = () => {
    gain.gain.setValueAtTime(1, audioContext.currentTime);
    gain.gain.setValueAtTime(0, audioContext.currentTime + 0.05);
}

const addMetronomeInteractions = () => {
    const pendulumWeight = metronome.getObjectByName("PendulumWeight");
    const pendulumBar = metronome.getObjectByName("PendulumBar");

    const dragControls = new DragControls([pendulumWeight, pendulumBar], camera, renderer.domElement);
    let pendulumWeightOldX, pendulumWeightOldZ, pendulumBarOldX, pendulumBarOldY, pendulumBarOldZ;

    dragControls.addEventListener("dragstart", (event) => {
        orbitControls.enabled = false;

        if (event.object.name == "PendulumWeight") {
            console.log(event.object.name)
            pendulumWeightOldX = event.object.position.x;
            pendulumWeightOldZ = event.object.position.z;
        }

        if (event.object.name == "PendulumBar") {
            pendulumBarOldX = event.object.position.x;
            pendulumBarOldY = event.object.position.y;
            pendulumBarOldZ = event.object.position.z;

            window.addEventListener("mousemove", getMouseXDifference);
        }
    });

    dragControls.addEventListener("drag", (event) => {
        if (event.object.name == "PendulumWeight") {
            event.object.position.x = pendulumWeightOldX;
            event.object.position.z = pendulumWeightOldZ;
        }

        if (event.object.name == "PendulumBar") {
            let rotateLeft = null;

            if (mouseXDifference < 0) {
                rotateLeft = true;
            } else if (mouseXDifference > 0) {
                rotateLeft = false;
            }

            if (rotateLeft && event.object.rotation.z >= -Constants.PENDULUM_BAR_MAX_EULER_ROTATION_Z) {
                event.object.rotation.z -= Constants.PENDULUM_BAR_ROTATION_SENSITIVTY;
            } else if (rotateLeft == false && event.object.rotation.z <= Constants.PENDULUM_BAR_MAX_EULER_ROTATION_Z) {
                event.object.rotation.z += Constants.PENDULUM_BAR_ROTATION_SENSITIVTY;
            }

            event.object.position.x = pendulumBarOldX;
            event.object.position.y = pendulumBarOldY;
            event.object.position.z = pendulumBarOldZ;

            pendulumBarOldX = event.object.position.x;
        }
    });

    dragControls.addEventListener("dragend", (event) => {
        window.removeEventListener("mousemove", getMouseXDifference);
        orbitControls.enabled = true;
    });
}

const loader = new GLTFLoader();
loader.load("./public/models/metronome.glb", function(gltf) {
    scene.add(gltf.scene);
    metronome = scene.children[1];
    pendulumBar = metronome.getObjectByName("PendulumBar");
    pendulumWeight = metronome.getObjectByName("PendulumWeight");
    addMetronomeInteractions();
}, undefined, function(error) {
    console.error(error);
});

camera.position.z = Constants.DEFAULT_CAMERA_DISTANCE;

const metronomeToggleButton = document.getElementById("metronomeToggleButton");
const bpmInput = document.getElementById("bpmInput");

bpmInput.setAttribute("min", Constants.MIN_BPM);
bpmInput.setAttribute("max", Constants.MAX_BPM);
bpmInput.setAttribute("value", Constants.DEFAULT_BPM);

let intervalId;
let isMetronomeActive = false;
let bpmInMs = getBpmInMs(bpmInput.value);
let isPendulumBarGoingRight = true;

let updatesPerBeat = 60 * bpmInMs / 1000;
let rotationAmount = Constants.PENDULUM_BAR_MAX_EULER_ROTATION_Z * 2 / updatesPerBeat;

const animate = () => {
    if (pendulumBar == null) return;

    if (isMetronomeActive) {
        if (pendulumBar.rotation.z >= Constants.PENDULUM_BAR_MAX_EULER_ROTATION_Z) {
            isPendulumBarGoingRight = false;
        } else if (pendulumBar.rotation.z <= -Constants.PENDULUM_BAR_MAX_EULER_ROTATION_Z) {
            isPendulumBarGoingRight = true;
        }

        if (isMetronomeActive && isPendulumBarGoingRight) {
            pendulumBar.rotation.z += rotationAmount;
        } else if (isMetronomeActive) {
            pendulumBar.rotation.z -= rotationAmount;
        }
    }

    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

const roundTo = (value, decimals) => {
    return Math.round(value * 10 ** decimals) / 10 ** decimals;
}

const startMetronome = () => {
    if (isMetronomeActive) return;

    metronomeToggleButton.textContent = "Stop";
    pendulumBar.rotation.z = 1.2;
    isMetronomeActive = true;

    if (!oscStartedBefore) {
        oscStartedBefore = true;
        osc.start();
    }

    audioContext.resume();

    setTimeout(() => {
        playClick()

        intervalId ??= setInterval(() => {
            playClick()
        }, bpmInMs);
    }, bpmInMs / 2);
}

const stopMetronome = () => {
    if (!isMetronomeActive) return;

    metronomeToggleButton.textContent = "Start";
    pendulumBar.rotation.z = 0;
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
    if (bpmInput.value > Constants.MAX_BPM) {
        bpmInput.value = Constants.MAX_BPM;
    } else if (bpmInput.value < Constants.MIN_BPM) {
        bpmInput.value = Constants.MIN_BPM;
    }

    bpmInMs = getBpmInMs(bpmInput.value);
    updatesPerBeat = 60 * bpmInMs / 1000;
    rotationAmount = Constants.PENDULUM_BAR_MAX_EULER_ROTATION_Z * 2 / updatesPerBeat;

    if (isMetronomeActive) {
        stopMetronome();
        startMetronome();
    }
}

metronomeToggleButton.addEventListener("click", toggleMetronome)
bpmInput.addEventListener("change", updateBpm);

window.addEventListener("mousedown", onMouseDown);
