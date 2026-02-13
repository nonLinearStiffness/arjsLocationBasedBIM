/* Import external libraries */
import * as THREE from "three";
import * as LocAR from "locar";
import { GLTFLoader, ThreeMFLoader } from 'three/examples/jsm/Addons.js';
import { objectViewPosition } from 'three/tsl';
import { BufferGeometry } from 'three/webgpu';

/* Import internal libraries */
import { getLatestPosition, startGeolocationWatch } from './geolocation';
import { getGeoHTMLElements } from './geolocation';
import { gnssARApplication } from './gnssARApp';
import { gnssButtonLogic } from './gnssButtonLogic';
import { AmbientLightNode } from 'three/webgpu';
import { storageElement } from 'three/src/nodes/utils/StorageArrayElementNode.js';

//Start a watch to update the Geolocation API data and display it in the HTML respective elements.
startGeolocationWatch("geolocation-data", (position) => { }); // Starts watching the geolocation data

/* Create custom variables */
const modelPath = ".\models\ccg.glb"; // Path to the GLTF model to load.
const domCanvas = document.getElementById("ar-canvas"); // Get the canvas element from the HTML
/* const gnssButton = document.getElementById("gnss-data-button"); // Get the button element from the HTML */

let userPosition = { latitude: 0, longitude: 0, elevation: 0}; // Initialize position object

const fov = 80; // Defines the angle for the field of view (FOV) of the perspectiveCamera
const nearClipPlane = 0.05; // Defines the near plane of the perspectiveCamera
const farClipPlane = 200; // Defines the far plane of the perspectiveCamera
const aspectRatio = window.innerWidth / window.innerHeight; // Defines the aspect ratio of the perspectiveCamera
// const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
// scene.add(ambientLight);

/* ---------------------- LOCAR EXAMPLE ---------------------- */
const perspectiveCamera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, nearClipPlane, farClipPlane); // Creates a new perspective camera

const renderer = new THREE.WebGLRenderer({
  canvas: domCanvas, // Sets the canvas element for the renderer
  antialias: true, // Enables antialiasing for smoother edges
  alpha: true, // Enables transparency for the canvas
}); // Creates a new WebGL renderer

renderer.setSize(window.innerWidth, window.innerHeight); // Sets the size of the renderer to the window size

/* CREATE A THREE.JS SCENE AND REQUIRED COMPONENTS */
const scene = new THREE.Scene();

/* CUSTOM VARIABLES */
let setFirstLocation = true;

/* CREATE THE LOCAR APPLICATION */
const locarApp = new LocAR.LocationBased(scene, perspectiveCamera); // Creates a locAR object with the specified scene and camera

/* Window Resize event Listener */
window.addEventListener("resize", e => {
  renderer.setSize(window.innerWidth, window.innerHeight); // Sets the size of the renderer to the window size
  perspectiveCamera.aspect = aspectRatio; // Sets the aspect ratio of the perspectiveCamera
  perspectiveCamera.updateProjectionMatrix(); // Updates the projection matrix of the perspectiveCamera.
});

const locarRenderer = new LocAR.WebcamRenderer(renderer); // Creates a locAR renderer with the specified THREEJS renderer

/* Create the device orientation tracker: This allows the AR scene to be manipulated by the device's orientation */
const deviceOrientationControls = new LocAR.DeviceOrientationControls(perspectiveCamera);

/* GLTF Loader */
const loader = new GLTFLoader(); // Creates a new GLTF loader

// gnssButton.addEventListener("click", () => {
//   if (navigator.geolocation) {
//     navigator.geolocation.getCurrentPosition((position) => {

//       userPosition.latitude = position.coords.latitude;
//       userPosition.longitude = position.coords.longitude;
//       userPosition.elevation = position.coords.elevation;


//       alert("IFC position set.");

//       setFirstLocation = true;
//     })
//   }
// })




/* GPS Tracking EventHandler */
locarApp.on("gpsupdate", (pos, distMoved) => {
  
  if (setFirstLocation) {
    
    console.log(userPosition);
    console.log("GPS Position: ", pos); // Logs the GPS position
    const lonPos = -8.2333430;
    const latPos = 41.5399780;
    const elev = 221.0;
    
    
    /* Loade the GLTF resource */
    loader.load(
      modelPath, // URL of the GLTF model
      // Called when the resource is loaded
      function (gltf) {
        const model = gltf.scene; // Gets the loaded model
        // model.position.set(0, 0, 0); // Sets the position of the model
        model.scale.set(1, 1, 1); // Sets the scale of the model

        locarApp.add(model, lonPos, latPos, elev); // Adds the model to the scene
        locarApp.setElevation(elev+1.8);
        console.log(model);

      },
      // Called while loading is progressing
      function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded'); // Logs the loading progress
      },
      // Called when loading has errors
      function (error) {
        console.error('An error happened', error); // Logs the error
      }
    );

    setFirstLocation = false; // Set firstLocation to false after the first location is set
  }
});

/* Start the GPS on the device. */
locarApp.startGps();

/* Start the animation */
renderer.setAnimationLoop(animate); // Sets the animation loop for the renderer

/* Create a function to animate the scene */
function animate() {
  locarRenderer.update(); // Updates the locAR renderer
  deviceOrientationControls.update(); // Updates the device orientation controls
  renderer.render(scene, perspectiveCamera); // Renders the scene with the perspective camera
}