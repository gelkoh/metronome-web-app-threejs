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

let intersected = null;
let originalColor = null;

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

const addMetronomeInteractions = (metronome) => {
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
            // window.addEventListener("mousemove", );

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

            // const differenceX = pendulumBarOldX - event.object.position.x;
            // console.log(differenceX)

            // if (differenceX < 0 && event.object.rotation.z >= -PENDULUM_BAR_MAX_EULER_ROTATION_Z) {
            //     event.object.rotation.z -= PENDULUM_BAR_ROTATION_SENSITIVTY;
            // } else if (differenceX > 0 && event.object.rotation.z <= PENDULUM_BAR_MAX_EULER_ROTATION_Z) {
            //     event.object.rotation.z += PENDULUM_BAR_ROTATION_SENSITIVTY;
            // }

            // console.log(event.object.rotation)

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
    const metronome = scene.children[1];
    addMetronomeInteractions(metronome);
}, undefined, function(error) {
    console.error(error);
});

camera.position.z = Constants.DEFAULT_CAMERA_DISTANCE;

const animate = () => {
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

const roundTo = (value, decimals) => {
    return Math.round(value * 10 ** decimals) / 10 ** decimals;
}

const metronomeAudio = document.getElementById("metronomeAudio");
const metronomeToggleButton = document.getElementById("metronomeToggleButton");
const bpmInput = document.getElementById("bpmInput");

bpmInput.setAttribute("min", Constants.MIN_BPM);
bpmInput.setAttribute("max", Constants.MAX_BPM);
bpmInput.setAttribute("value", Constants.DEFAULT_BPM);

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
    if (bpmInput.value > Constants.MAX_BPM) {
        bpmInput.value = Constants.MAX_BPM;
    } else if (bpmInput.value < Constants.MIN_BPM) {
        bpmInput.value = Constants.MIN_BPM;
    }

    bpmInMs = getBpmInMs(bpmInput.value);

    if (isMetronomeActive) {
        stopMetronome();
        startMetronome();
    }
}

metronomeToggleButton.addEventListener("click", toggleMetronome)
bpmInput.addEventListener("change", updateBpm);

window.addEventListener("mousedown", onMouseDown);
