/* Import external libraries */
import "leaflet";
import "./main.css";
import * as THREE from 'three';
import * as LocAR from "locar";
import { GLTFLoader } from "three/examples/jsm/Addons.js";

/* Import internal libraries */
/* --- END --- */

/* Declaration of variables */
const app = document.getElementById("app");

let leafletMap = null;
let locations = [];
let mapCenter = null;
let mapZoom = null;
/* --- END --- */


/* CUSTOM FUNCTIONS */
// Fetch model data from JSON file
async function fetchModelData() {
  const res = await fetch("models.json");
  if (!res.ok) throw new Error("Failed to load model data");
  return res.json();
}

// Custom building icon
const buildingIcon = new L.Icon({
  iconUrl: "bim.png",
  iconSize: [48, 48], // Increased size
  iconAnchor: [24, 48], // Adjust anchor to match new size
});

// Function to locate the user and center the map
function locateUser(controlBtn) {
  // Try to locate the user using Geolocation API. Will fire either "locationfound" or "locationerror".
  leafletMap.locate({
    setView: true,
    maxZoom: 14,
    enableHighAccuracy: true,
  });

  // If location was found, then applies the location point.
  leafletMap.once("locationfound", (e) => {
    const radius = e.accuracy;

    L.marker(e.latlng).addTo(leafletMap).bindPopup("You are here").openPopup();

    L.circle(e.latlng, radius).addTo(leafletMap);

    if (controlBtn) {
      controlBtn.disabled = false;
      controlBtn.title = "Center on Me";
    }
  });

  // If there was an error, location defaults to map center.
  leafletMap.once("locationerror", (e) => {
    console.warn("Location failed:", e.message);
    leafletMap.setView([51.505, -0.09], 13);

    if (controlBtn) {
      controlBtn.disabled = true;
      controlBtn.title = "Location unavailable";
    }
  });
}

// Function to add the markers for each location
function addLocationMarkers() {
  locations.forEach((loc) => {
    // Use buildingIcon for a custom building image
    const marker = L.marker(loc.coords, { icon: buildingIcon }).addTo(leafletMap);
    marker.on("click", () => goToAR(loc.id));
  });
}

// This function allows the specific model to be added as AR element in the map.
function goToAR(id) {
  if (leafletMap) {
    mapCenter = leafletMap.getCenter();
    mapZoom = leafletMap.getZoom();
  }
  location.hash = `#/ar/${id}`;
}

// Function to show or hide the disclaimer banner and instructions
function showDisclaimer(show) {
  const banner = document.getElementById("disclaimer-banner");
  const instructions = document.getElementById("map-instruction");
  if (banner) banner.style.display = show ? "block" : "none";
  if (instructions) instructions.style.display = show ? "block" : "none";
}

// This function allows rendering the AR view for a specific model

function renderARView(id) {
  showDisclaimer(false);
  const loc = locations.find((l) => l.id === id);
  if (!loc) return renderNotFound();

  app.innerHTML = `
  <button class="btn" onclick="location.hash = '#'" style="margin-bottom: 1rem;">← Back to Map</button>
  <canvas id="ar-canvas" style="background-color: grey; width: 100vw height: 100vh"></canvas>
  `;

  /* Logic behind ARjs Location Based */
  const fov = 80;
  const nearClipPlane = 0.001;
  const farClipPlane = 1000;
  const aspectRatio = window.innerWidth / window.innerHeight;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, aspectRatio, nearClipPlane, farClipPlane);
  const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("ar-canvas") });

  // Add ambient light for base illumination
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // Add sunlight (directional light) that follows the camera
  const sunlight = new THREE.DirectionalLight(0xffffff, 2.0);
  sunlight.position.set(0, 10, -10); // Initial position
  scene.add(sunlight);

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  /* Initiate the LocAR */
  const locar = new LocAR.LocationBased(scene, camera);

  const cam = new LocAR.Webcam({
    video: {
      facingMode: "environment"
    }
  }, null);

  cam.on("webcamstarted", ev => {
    scene.background = ev.texture;
  });

  cam.on("webcamerror", ev => {
    alert("Webcam error: code ${error.code} message ${error.message}");
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let firstLocation = true;

  const deviceOrientationControls = new LocAR.DeviceOrientationControls(camera);

  deviceOrientationControls.on("deviceorientationerror", error => {
    alert("Device orientation error: code ${error.code} message ${error.message}");
  });

  deviceOrientationControls.on("deviceorientationgranted", ev => {
    ev.target.connect();
  });

  deviceOrientationControls.init();

  locar.on("gpsupdate", async ev => {
    if (firstLocation) {
      firstLocation = false; // Prevent repeated execution immediately
      alert("GPS location acquired. You can now see the AR content.");

      // Load the GLB model from the location's URL and place it at the location's coordinates
      const loader = new GLTFLoader();
      try {
        const gltf = await loader.loadAsync(loc.modelUrl);
        const model = gltf.scene;
        // Adjust model height so it appears at ground level
        model.position.y = -2.8; // Phone held at 1.8m
        // Adjust orientation (rotate as needed)
        model.rotation.y = -Math.PI/3; // Set to Math.PI/2, -Math.PI/2, etc. if needed
        // Optionally scale the model if needed
        // model.scale.set(1, 1, 1);
        locar.add(
          model,
          loc.coords[1], // Longitude of the model
          loc.coords[0] // Latitude of the model
        );
      } catch (err) {
        alert("Failed to load GLB model: " + err.message);
      }
    }
  });

  locar.startGps();

  renderer.setAnimationLoop(animate);

  function animate() {
    deviceOrientationControls.update();
    // Position sunlight behind the camera each frame
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    // Place sunlight 10 units behind and 5 units above the camera
    sunlight.position.copy(camera.position).add(camDir.multiplyScalar(-10)).add(new THREE.Vector3(0, 5, 0));
    renderer.render(scene, camera);
  }

  // Optionally, you can add more ARjs/aframe event handling here if needed
}

// This function allows rendering the map view
function renderMapView() {
  showDisclaimer(true);
  app.innerHTML = `<div id="map" style="height: 100%"></div>`;

  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
  }

  // Initialize the map
  leafletMap = L.map("map");

  // Add OpenStreetMap tile layer

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(leafletMap);

  // Define the map start origin and zoom level
  const defaultCenter = [41.453149, -8.288615];
  const center = defaultCenter; // You can adjust these coordinates for a more precise center
  const zoom = mapZoom || 18; // Increased zoom for a closer view
  leafletMap.setView(center, zoom);

  // Add the location markers
  addLocationMarkers();
}

/* HTML to diaplay if the map render fails */
function renderNotFound() {
  app.innerHTML = `
    <div style="padding: 2rem; text-align: center;">
      <h2>404 - Page Not Found</h2>
      <a href="#">Back to Home</a>
    </div>
  `;
}

/* Function to route the page to map or AR or default */
function router() {
  const hash = location.hash || "#";
  const match = hash.match(/^#\/ar\/(\d+)$/);
  const isQRScanner = hash === '#/qr-scanner';

  if (hash === "#") {
    renderMapView();
  } else if (match) {
    renderARView(match[1]);
  } else {
    renderNotFound();
  }
}

async function init() {
  try {
    locations = await fetchModelData();
    router();
    window.addEventListener("hashchange", router);
  } catch (err) {
    console.error(err);
    renderNotFound();
  }
}
/* --- END --- */


/* MAIN ACTIONS */
/* 1. Initiate the init function. */
init();

/* 2. Start a geolocation watch and update the HTML geo element data with new data. */
const geoDiv = document.getElementById("geo-position");
geoDiv.textContent = "Waiting for geolocation data...";

async function updateGeolocation() {
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition((position) => {
      geoDiv.textContent = "Latitude: " +
        position.coords.latitude.toFixed(5) + "° N, Longitude: " +
        position.coords.longitude.toFixed(5) + "° E";
    }, (error) => { console.error("Geolocation Error: ", error) });
  } else {
    console.error("Geolocation is not supported by this browser.");
    geoDiv.textContent = "Geolocation is not supported by this browser.";
  }
}

updateGeolocation();

/* 3.  */

/* --- END --- */

// ---------------------------------------------- WIP ----------------------------------------------

// ---------------------------------------------- WIP ----------------------------------------------