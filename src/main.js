import './style.css'

// Initialize leaflet map
var map = L.map('map').setView([43.6532, -79.3832], 13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

function onMapClick(e) {
  L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);
}

map.on('click', onMapClick);