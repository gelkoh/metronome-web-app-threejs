import * as THREE from "three";

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

camera.position.z = 5;

const animate = () => {
    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

let lastMouseX, lastMouseY;

const rotateMetronome = (e) => {
    if (lastMouseX == null || lastMouseY == null) {
        lastMouseX = e.x;
        lastMouseY = e.y;
        return;
    }

    const diffX = (e.x - lastMouseX) * 0.01;
    cube.rotation.y += diffX;

    const diffY = (e.y - lastMouseY) * 0.01;
    cube.rotation.x += diffY;

    lastMouseX = e.x;
    lastMouseY = e.y;
}

renderer.domElement.addEventListener("mousedown", () => {
    renderer.domElement.addEventListener("mousemove", rotateMetronome);
});

renderer.domElement.addEventListener("mouseup", () => {
    renderer.domElement.removeEventListener("mousemove", rotateMetronome)
    lastMouseX = null, lastMouseY = null;
});
