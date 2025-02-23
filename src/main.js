import './style.css';

// Initialize Leaflet map
var map = L.map('map').setView([43.6532, -79.3832], 13);

// Add OpenStreetMap tiles
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// We still keep a local array of Leaflet markers so we can track them on the map.
let leafletMarkers = [];
let selectedMarkerIcon = null;
let selectedMarkerName = "";

/**
 * Helper: fetch all markers from the server, then create Leaflet markers for each.
 */
async function loadMarkersFromServer() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch('http://localhost:3000/markers', {
      headers: {
        Authorization: 'Bearer ' + token,
      },
    });
    if (!response.ok) {
      console.error('Failed to fetch markers:', response.statusText);
      return;
    }

    const markersData = await response.json(); // array of marker objects from DB

    // Create a Leaflet marker for each DB record
    markersData.forEach(m => {
      const marker = addMarkerToMap(m);
      leafletMarkers.push(marker);
    });
  } catch (error) {
    console.error('Error loading markers:', error);
  }
}

/**
 * Helper: adds a Leaflet marker for an existing DB record
 * and sets up the popup logic.
 */
function addMarkerToMap(markerData) {
  // Example: "Slippery Road" => "SlipperyRoad.png"
  const icon = L.icon({
    iconUrl: `icons/${markerData.markerName.replace(/\s+/g, '')}.png`,
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48]
  });

  let marker = L.marker([markerData.lat, markerData.lng], {
    icon,
    draggable: true
  }).addTo(map);

  // Store DB fields in the Leaflet marker so we can reference them later
  marker.dbId = markerData.id;           // ID in DB
  marker.markerName = markerData.markerName;
  marker.likes = markerData.likes;
  marker.dislikes = markerData.dislikes;
  marker.userVoted = false;              // or track user votes differently if needed

  // Store the username (or "Unknown" if not provided)
  marker.ownerUsername = markerData.User?.username || "Unknown";

  // Bind the popup with dynamic content
  marker.bindPopup("Loading...");

  // On popup open, update content & attach event listeners
  marker.on("popupopen", () => {
    marker.setPopupContent(generatePopupHTML(marker));
    attachPopupListeners(marker);
  });

  // Right-click => remove marker from server & map
  marker.on("contextmenu", async function () {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:3000/markers/${marker.dbId}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token },
      });
      if (response.ok) {
        // remove from map & local array
        map.removeLayer(marker);
        leafletMarkers = leafletMarkers.filter(m => m !== marker);
      } else {
        console.error('Failed to delete marker:', response.statusText);
      }
    } catch (error) {
      console.error('Error deleting marker:', error);
    }
  });

  return marker;
}


/**
 * Helper: returns HTML for the popup
 */
function generatePopupHTML(marker) {
  const lat = marker.getLatLng().lat.toFixed(4);
  const lng = marker.getLatLng().lng.toFixed(4);

  // If you stored marker.ownerUsername in addMarkerToMap:
  const userText = marker.ownerUsername ? `Created by: ${marker.ownerUsername}` : '';

  return `
    <div style="text-align: center; font-family: Arial, sans-serif;">
      <p style="margin: 5px 0;"><strong>📍 ${marker.markerName}</strong></p>
      <p style="margin: 5px 0;">${userText}</p>
      <p style="margin: 5px 0;">Latitude: ${lat}<br>Longitude: ${lng}</p>
      <div style="display: flex; justify-content: center; align-items: center; gap: 10px;">
        <button class="like-btn" style="border: none; background: none; cursor: pointer; font-size: 16px;">
          👍 <span class="like-count">${marker.likes}</span>
        </button>
        <button class="dislike-btn" style="border: none; background: none; cursor: pointer; font-size: 16px;">
          👎 <span class="dislike-count">${marker.dislikes}</span>
        </button>
      </div>
    </div>
  `;
}

/**
 * Helper: attach click listeners for "like" / "dislike"
 */
function attachPopupListeners(marker) {
  const popupEl = marker.getPopup().getElement();
  if (!popupEl) return;

  const likeBtn = popupEl.querySelector(".like-btn");
  const dislikeBtn = popupEl.querySelector(".dislike-btn");
  const likeCountEl = popupEl.querySelector(".like-count");
  const dislikeCountEl = popupEl.querySelector(".dislike-count");

  // Handler to like a marker
  async function handleLike() {
    if (marker.userVoted) return;
    const updated = await likeMarkerOnServer(marker.dbId);
    if (updated) {
      marker.likes = updated.likes;
      marker.dislikes = updated.dislikes;
      marker.userVoted = true;
      likeCountEl.textContent = marker.likes;
      dislikeCountEl.textContent = marker.dislikes;
    }
  }

  // Handler to dislike a marker
  async function handleDislike() {
    if (marker.userVoted) return;
    const updated = await dislikeMarkerOnServer(marker.dbId);
    if (updated) {
      marker.likes = updated.likes;
      marker.dislikes = updated.dislikes;
      marker.userVoted = true;
      likeCountEl.textContent = marker.likes;
      dislikeCountEl.textContent = marker.dislikes;
    }
  }

  likeBtn.addEventListener("click", handleLike);
  dislikeBtn.addEventListener("click", handleDislike);

  // Cleanup to prevent stacking listeners if the popup closes/reopens
  marker.on(
    "popupclose",
    () => {
      likeBtn.removeEventListener("click", handleLike);
      dislikeBtn.removeEventListener("click", handleDislike);
    },
    { once: true }
  );
}

/**
 * Helper: call server's PATCH /markers/:id/like
 */
async function likeMarkerOnServer(markerId) {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const response = await fetch(`http://localhost:3000/markers/${markerId}/like`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer ' + token,
      },
    });
    if (!response.ok) {
      console.error('Failed to like marker:', response.statusText);
      return null;
    }
    return await response.json(); // the updated marker from server
  } catch (error) {
    console.error('Error liking marker:', error);
    return null;
  }
}

/**
 * Helper: call server's PATCH /markers/:id/dislike
 */
async function dislikeMarkerOnServer(markerId) {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const response = await fetch(`http://localhost:3000/markers/${markerId}/dislike`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer ' + token,
      },
    });
    if (!response.ok) {
      console.error('Failed to dislike marker:', response.statusText);
      return null;
    }
    return await response.json(); // the updated marker from server
  } catch (error) {
    console.error('Error disliking marker:', error);
    return null;
  }
}

/**
 * Helper: create a new marker in the DB
 */
async function createMarkerOnServer(markerName, lat, lng) {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const response = await fetch('http://localhost:3000/markers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({ markerName, lat, lng }),
    });
    if (!response.ok) {
      console.error('Failed to create marker:', response.statusText);
      return null;
    }
    return await response.json(); // the newly created marker
  } catch (error) {
    console.error('Error creating marker:', error);
    return null;
  }
}

// Listen for map clicks to add markers (and store in DB)
map.on('click', async (e) => {
  if (!selectedMarkerIcon) return;

  const lat = e.latlng.lat;
  const lng = e.latlng.lng;

  // Optionally check if there's an existing marker close by
  // (similar to your local threshold logic)
  // If so => alert user and return

  // Create marker in DB
  const serverMarker = await createMarkerOnServer(selectedMarkerName, lat, lng);
  if (!serverMarker) return; // if creation failed

  // Add the new marker to the map
  const newLeafletMarker = addMarkerToMap(serverMarker);
  leafletMarkers.push(newLeafletMarker);
});

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

// Finally, load existing markers from server once the map is ready
loadMarkersFromServer();
