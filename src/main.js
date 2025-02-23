import './style.css';

// Initialize Leaflet map
var map = L.map('map').setView([43.6532, -79.3832], 13);

// Add OpenStreetMap tiles
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// Marker storage
let markers = [];
let selectedMarkerIcon = null;
let selectedMarkerName = "";

/**
 * Helper function: returns HTML string for the popup,
 * using the marker's name, coords, and like/dislike counts.
 */
function generatePopupHTML(marker) {
  const { markerName, likes, dislikes } = marker;
  const lat = marker.getLatLng().lat;
  const lng = marker.getLatLng().lng;

  return `
    <div style="text-align: center; font-family: Arial, sans-serif;">
      <p style="margin: 5px 0;"><strong>📍 ${markerName}</strong></p>
      <p style="margin: 5px 0;">Latitude: ${lat.toFixed(4)}<br>Longitude: ${lng.toFixed(4)}</p>
      <div style="display: flex; justify-content: center; align-items: center; gap: 10px;">
        <button class="like-btn" style="border: none; background: none; cursor: pointer; font-size: 16px;">
          👍 <span class="like-count">${likes}</span>
        </button>
        <button class="dislike-btn" style="border: none; background: none; cursor: pointer; font-size: 16px;">
          👎 <span class="dislike-count">${dislikes}</span>
        </button>
      </div>
    </div>
  `;
}

/**
 * Helper function: checks if a marker already exists within a certain
 * threshold distance of the lat/lng. Prevents stacking markers.
 */
function markerAlreadyExists(lat, lng, threshold = 0.0001) {
  return markers.some(m => {
    const mPos = m.getLatLng();
    const distance = Math.sqrt(
      Math.pow(mPos.lat - lat, 2) + Math.pow(mPos.lng - lng, 2)
    );
    return distance < threshold;
  });
}

// Function to handle map clicks: create a new marker if an icon is selected
function onMapClick(e) {
  if (!selectedMarkerIcon) return;

  // Prevent placing a new marker too close to an existing one
  if (markerAlreadyExists(e.latlng.lat, e.latlng.lng)) {
    alert("A marker already exists too close to that spot!");
    return;
  }

  // Create the marker
  let marker = L.marker([e.latlng.lat, e.latlng.lng], {
    icon: selectedMarkerIcon,
    draggable: true
  }).addTo(map);

  // Store relevant data on the marker itself
  marker.markerName = selectedMarkerName;
  marker.likes = 0;
  marker.dislikes = 0;
  marker.userVoted = false; // whether user has clicked either button

  // Initially bind the popup (content will be updated on open)
  marker.bindPopup("Loading..."); // Temporary content

  // On popup open, refresh with current like/dislike counts
  marker.on("popupopen", () => {
    // Update the popup content each time it's opened
    marker.setPopupContent(generatePopupHTML(marker));

    // Once content is set, attach event listeners to the new DOM elements
    const popupEl = marker.getPopup().getElement();
    if (!popupEl) return; // Safety check in case the popup element isn't rendered yet

    const likeBtn = popupEl.querySelector(".like-btn");
    const dislikeBtn = popupEl.querySelector(".dislike-btn");
    const likeCountEl = popupEl.querySelector(".like-count");
    const dislikeCountEl = popupEl.querySelector(".dislike-count");

    // Handlers for clicking like/dislike
    const handleLike = () => {
      if (!marker.userVoted) {
        marker.likes++;
        marker.userVoted = true;
        likeCountEl.textContent = marker.likes;
      }
    };

    const handleDislike = () => {
      if (!marker.userVoted) {
        marker.dislikes++;
        marker.userVoted = true;
        dislikeCountEl.textContent = marker.dislikes;
      }
    };

    // Attach the event listeners
    likeBtn.addEventListener("click", handleLike);
    dislikeBtn.addEventListener("click", handleDislike);

    // Remove the event listeners on popup close to avoid duplicates
    marker.on(
      "popupclose",
      () => {
        likeBtn.removeEventListener("click", handleLike);
        dislikeBtn.removeEventListener("click", handleDislike);
      },
      { once: true }
    );
  });

  // Store this marker in our array
  markers.push(marker);

  // Right-click (contextmenu) to remove the marker
  marker.on("contextmenu", function () {
    map.removeLayer(marker);
    markers = markers.filter(m => m !== marker);
  });
}

// Listen for map clicks to add markers
map.on('click', onMapClick);

// Function to select marker type (icon)
function selectMarker(iconUrl, markerName) {
  selectedMarkerIcon = L.icon({
    iconUrl: iconUrl,
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48]
  });
  selectedMarkerName = markerName;
}

// Add event listeners for the round-button elements
const markerButtons = document.querySelectorAll(".round-button");
markerButtons.forEach(button => {
  button.addEventListener("click", function () {
    const img = button.querySelector("img");
    const markerName = button.getAttribute("title");
    if (img) {
      selectMarker(img.src, markerName);
    }
  });
});

// Add a logout button to the map page
const logoutButton = document.createElement('button');
logoutButton.textContent = 'Logout';
logoutButton.style.position = 'absolute';
logoutButton.style.top = '10px';
logoutButton.style.right = '10px';
logoutButton.style.zIndex = 1000;
document.body.appendChild(logoutButton);

logoutButton.addEventListener('click', () => {
  localStorage.removeItem('token');
  window.location.href = '/index.html';
});
