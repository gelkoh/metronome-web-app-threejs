import * as THREE from "three";

const ROTATE_SENSITIVITY = 0.01;
const ZOOM_SENSITIVITY = 0.2;
const DEFAULT_ZOOM = 6;
const MAX_ZOOM = 2;
const MIN_ZOOM = 10;

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

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

camera.position.z = DEFAULT_ZOOM;

const animate = () => {
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

const roundTo = (value, decimals) => {
    return Math.round(value * 10 ** decimals) / 10 ** decimals;
}

let lastMouseX, lastMouseY;

const rotateMetronome = (e) => {
    if (lastMouseX == null || lastMouseY == null) {
        lastMouseX = e.x;
        lastMouseY = e.y;
        return;
    }

    const diffX = (e.x - lastMouseX) * ROTATE_SENSITIVITY;
    cube.rotation.y += diffX;

    const diffY = (e.y - lastMouseY) * ROTATE_SENSITIVITY;
    cube.rotation.x += diffY;

    lastMouseX = e.x;
    lastMouseY = e.y;
}

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

renderer.domElement.addEventListener("mousedown", () => {
    renderer.domElement.addEventListener("mousemove", rotateMetronome);
});

renderer.domElement.addEventListener("mouseup", () => {
    renderer.domElement.removeEventListener("mousemove", rotateMetronome);
    lastMouseX = null, lastMouseY = null;
});

renderer.domElement.addEventListener("wheel", handleZoom);
