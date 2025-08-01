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

// TODO: Find out why this ambient light is needed for THREEJS to not throw errors
const light = new THREE.AmbientLight( 0x000000 );
scene.add(light);

const setUpLights = () => {
    const targetObject = new THREE.Object3D();

    const spotLight = new THREE.SpotLight(0xffffff);
    spotLight.position.set(0, 5, 5);
    spotLight.target = targetObject;
    spotLight.power = 100;
    spotLight.penumbra = 1;
    scene.add(spotLight);

    const spotLight2 = new THREE.SpotLight();
    spotLight2.copy(spotLight);
    spotLight2.position.set(5, 5, 0);
    scene.add(spotLight2);

    const spotLight3 = new THREE.SpotLight();
    spotLight3.copy(spotLight);
    spotLight3.position.set(0, 5, -5);
    scene.add(spotLight3);

    const spotLight4 = new THREE.SpotLight();
    spotLight4.copy(spotLight);
    spotLight4.position.set(-5, 5, 0);
    scene.add(spotLight4);
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let metronome;
let pendulumBar;
let pendulumWeight;
const inputToBpmFactor = (Constants.MIN_BPM - Constants.MAX_BPM) / (Constants.PENDULUM_WEIGHT_MAX_Y - Constants.PENDULUM_WEIGHT_MIN_Y);
let previousBpm = Constants.DEFAULT_BPM;

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

const loader = new GLTFLoader();
loader.load("./public/models/metronome.glb", function(gltf) {
    scene.add(gltf.scene);
    metronome = scene.children[1];
    pendulumBar = metronome.getObjectByName("PendulumBar");
    pendulumWeight = metronome.getObjectByName("PendulumWeight");
    addMetronomeInteractions();
    setUpLights();
}, undefined, function(error) {
    console.error(error);
});

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

const bpmToY = (bpm) => {
    return (bpm - Constants.MAX_BPM) / inputToBpmFactor + Constants.PENDULUM_WEIGHT_MIN_Y;
}

const updateBpm = () => {
    if (bpmInput.value > Constants.MAX_BPM) {
        bpmInput.value = Constants.MAX_BPM;
    } else if (bpmInput.value < Constants.MIN_BPM) {
        bpmInput.value = Constants.MIN_BPM;
    }

    if (bpmInput.value < previousBpm) {
        isPendulumWeightAdjusting = true;
        isPendulumWeightAdjustingUpwards = true;
    } else if (bpmInput.value > previousBpm) {
        isPendulumWeightAdjusting = true;
        isPendulumWeightAdjustingUpwards = false;
    }

    bpmInMs = getBpmInMs(bpmInput.value);
    updatesPerBeat = 60 * bpmInMs / 1000;
    rotationAmount = Constants.PENDULUM_BAR_MAX_EULER_ROTATION_Z * 2 / updatesPerBeat;

    if (isMetronomeActive) {
        stopMetronome();
        startMetronome();
    }

    previousBpm = parseInt(bpmInput.value);
}

const playClick = () => {
    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    gain.gain.setValueAtTime(0, audioContext.currentTime + 0.05);
}

const addMetronomeInteractions = () => {
    const pendulumWeight = metronome.getObjectByName("PendulumWeight");
    pendulumWeight.position.y = bpmToY(Constants.DEFAULT_BPM);

    const pendulumBar = metronome.getObjectByName("PendulumBar");

    const dragControls = new DragControls([pendulumWeight, pendulumBar], camera, renderer.domElement);
    let pendulumWeightOldX, pendulumWeightOldZ, pendulumBarOldX, pendulumBarOldY, pendulumBarOldZ;

    dragControls.addEventListener("dragstart", (event) => {
        orbitControls.enabled = false;

        if (event.object.name == "PendulumWeight") {
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

            if (event.object.position.y > Constants.PENDULUM_WEIGHT_MAX_Y) {
                event.object.position.y = Constants.PENDULUM_WEIGHT_MAX_Y;
            } else if (event.object.position.y < Constants.PENDULUM_WEIGHT_MIN_Y) {
                event.object.position.y = Constants.PENDULUM_WEIGHT_MIN_Y;
            }

            bpmInput.value = Math.round((event.object.position.y - Constants.PENDULUM_WEIGHT_MIN_Y) * inputToBpmFactor + Constants.MAX_BPM);

            // TODO: Updating bpm here should not also set isPendulumWeightAdjusting true
            updateBpm();
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

camera.position.z = Constants.DEFAULT_CAMERA_DISTANCE;

const metronomeToggleButton = document.getElementById("metronomeToggleButton");
const bpmInput = document.getElementById("bpmInput");

bpmInput.setAttribute("min", Constants.MIN_BPM);
bpmInput.setAttribute("max", Constants.MAX_BPM);
bpmInput.setAttribute("value", Constants.DEFAULT_BPM);

let metronomeClickIntervalId;
let isMetronomeActive = false;
let isMetronomePreparing = false;
let isPendulumWeightAdjusting = false;
let isPendulumWeightAdjustingUpwards = null;
let bpmInMs = getBpmInMs(bpmInput.value);
let isPendulumBarGoingRight = true;

let updatesPerBeat = 60 * bpmInMs / 1000;
let rotationAmount = Constants.PENDULUM_BAR_MAX_EULER_ROTATION_Z * 2 / updatesPerBeat;

const animate = () => {
    if (pendulumBar == null) return;

    if (isPendulumWeightAdjusting) {
        const newPendulumWeightY = bpmToY(bpmInput.value);

        if (isPendulumWeightAdjustingUpwards) {
            if (pendulumWeight.position.y + 0.05 > newPendulumWeightY) {
                pendulumWeight.position.y = newPendulumWeightY;
                isPendulumWeightAdjusting = false;
            } else {
                pendulumWeight.position.y += 0.05;
            }
        } else if (!isPendulumWeightAdjustingUpwards) {
            if (pendulumWeight.position.y - 0.05 < newPendulumWeightY) {
                pendulumWeight.position.y = newPendulumWeightY;
                isPendulumWeightAdjusting = false;
            } else {
                pendulumWeight.position.y -= 0.05;
            }
        }
    }

    if (isMetronomePreparing && pendulumBar.rotation.z < 1.2) {
        pendulumBar.rotation.z += 0.02;
    } else if (isMetronomeActive) {
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
    isMetronomePreparing = true;

    let metronomePreparingCheckIntervalId;

    metronomePreparingCheckIntervalId ??= setInterval(() => {
        if (pendulumBar.rotation.z >= 1.2) {
            clearInterval(metronomePreparingCheckIntervalId);
            isMetronomePreparing = false;

            isMetronomeActive = true;

            if (!oscStartedBefore) {
                oscStartedBefore = true;
                osc.start();
            }

            audioContext.resume();

            setTimeout(() => {
                playClick()

                metronomeClickIntervalId ??= setInterval(() => {
                    playClick()
                }, bpmInMs);
            }, bpmInMs / 2);
        }
    }, 100);
}

const stopMetronome = () => {
    if (!isMetronomeActive) return;

    metronomeToggleButton.textContent = "Start";
    pendulumBar.rotation.z = 0;
    isMetronomeActive = false;
    clearInterval(metronomeClickIntervalId);
    metronomeClickIntervalId = null;
}

const toggleMetronome = () => {
    if (metronomeClickIntervalId == null) {
        startMetronome();
        metronomeToggleButton.classList.add("metronome-active");
    } else {
        stopMetronome();
        metronomeToggleButton.classList.remove("metronome-active");
    }
}

metronomeToggleButton.addEventListener("click", toggleMetronome)
bpmInput.addEventListener("change", updateBpm);

window.addEventListener("mousedown", onMouseDown);

const onWindowResize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
}

window.addEventListener("resize", onWindowResize);
