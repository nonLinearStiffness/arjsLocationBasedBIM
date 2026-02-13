/* --------------------- */
/* Geolocation API Watch */
/* --------------------- */

/* Variables */
let latestPosition;

/* Get the GeoHTML Elements */
export function getGeoHTMLElement(divId) {
    // Get the geolocation div element from the HTML
    const geoDiv = document.getElementById(divId);

    // Create an object to store the geolocation elements
    const geoHTMLElements = {
        latitudeElement: geoDiv.querySelector(".latitude"),
        longitudeElement: geoDiv.querySelector(".longitude"),
        altitudeElement: geoDiv.querySelector(".altitude"),
        accuracyElement: geoDiv.querySelector(".accuracy")
    };
    return geoHTMLElements; // Return the geolocation elements object
};

/* Function to update the geolocation data in the DOM */
function updateGeolocationData(position, divID) {
    /* Get the geoElements and update them */
    const geoHTMLElements = getGeoHTMLElements(divId);

    geoHTMLElements.latitudeElement.textContent = position.coords.latitude.toString();
    geoHTMLElements.longitudeElement.textContent = position.coords.longitude.toString();
    geoHTMLElements.altitudeElement.textContent = (position.coords.altitude ? position.coords.altitude.toFixed(2) + " m" : "N/A").toString();
    geoHTMLElements.accuracyElement.textContent = (position.coords.accuracy ? position.coords.accuracy.toFixed(2) + " m" : "N/A").toString();
}

/* Function to handle geolocation errors */
function handleGeolocationError(error) {
    console.error("Geolocation Error: ", error);
}

/* Start watching the geolocation data */
export function startGeolocationWatch(divId) {
    if (navigator.geolocation) {

        navigator.geolocation.watchPosition((position) => {
            // Update the geolocation data in the HTML elments
            latestPosition = position;
            updateGeolocationData(position, divId);
        },
            (error) => {
                // Handle geolocation errors
                handleGeolocationError(error);
            }, {
            enableHighAccuracy: true, // Enable high accuracy mode
            maximumAge: 0, // Do not use cached position
            timeout: 20000 // Timeout after 20 seconds
        });
    }
    else {
        console.error("Geolocation is not supported by this browser.");
        return null;
    }
};

/* A function that returns the last stored position */
export function getLatestPosition() {
    if (latestPosition == null) {
        console.error("No geolocation data available yet.");
    }else {
        return latestPosition;
    }
}