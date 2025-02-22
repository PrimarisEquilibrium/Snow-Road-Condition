import './style.css';

// Ensure the script only runs on map.html
if (document.getElementById("map")) {
    // Initialize Leaflet map
    var map = L.map('map').setView([43.6532, -79.3832], 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Marker storage
    let markers = [];

    // Function to add a marker on map click
    function onMapClick(e) {
        let marker = L.marker([e.latlng.lat, e.latlng.lng], { draggable: true }).addTo(map);
        marker.bindPopup(`📍 Icy Spot<br>Latitude: ${e.latlng.lat.toFixed(4)}<br>Longitude: ${e.latlng.lng.toFixed(4)}`).openPopup();

        // Store the marker reference
        markers.push(marker);

        // Add a remove option when clicking on a marker (right-click to remove)
        marker.on("contextmenu", function () {
            map.removeLayer(marker);
            markers = markers.filter(m => m !== marker);
        });
    }

    // Listen for map clicks to add markers
    map.on('click', onMapClick);

    // Button to clear all markers
    const clearMarkersBtn = document.getElementById("clearMarkers");

    if (clearMarkersBtn) {
        clearMarkersBtn.addEventListener("click", function () {
            if (markers.length === 0) {
                console.log("No markers to clear.");
                return;
            }

            markers.forEach(marker => map.removeLayer(marker));
            markers = []; // Reset the marker array
            console.log("All markers have been removed.");
        });
    } else {
        console.error("Button with ID 'clearMarkers' not found.");
    }
}
