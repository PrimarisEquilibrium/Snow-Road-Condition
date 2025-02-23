import './style.css'; // If bundling with a tool like Vite/Webpack
// (You can remove this import if you're not using a bundler)

// Initialize Leaflet map
var map = L.map('map').setView([43.6532, -79.3832], 13);

// Add OpenStreetMap tiles
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

// Marker storage & selected marker data
let leafletMarkers = [];
let selectedMarkerIcon = null;
let selectedMarkerName = "";

/** 
 * Called on page load: fetch markers from server
 * and add them to the map.
 */
async function loadMarkersFromServer() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch('http://localhost:3000/markers', {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!response.ok) {
      console.error('Failed to fetch markers:', response.statusText);
      return;
    }
    const markersData = await response.json(); // array of marker objects
    markersData.forEach(m => {
      const marker = addMarkerToMap(m);
      leafletMarkers.push(marker);
    });
  } catch (error) {
    console.error('Error loading markers:', error);
  }
}

/**
 * Create and add a Leaflet marker for a given markerData object.
 */
function addMarkerToMap(markerData) {
  // e.g. "Slippery Road" => "SlipperyRoad.png"
  const icon = L.icon({
    iconUrl: `icons/${markerData.markerName.replace(/\s+/g, '')}.png`,
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48]
  });

  let marker = L.marker([markerData.lat, markerData.lng], {
    icon,
    draggable: true // you can remove "draggable" if you don't want markers moved
  }).addTo(map);

  // Attach data
  marker.dbId = markerData.id;
  marker.markerName = markerData.markerName;
  marker.likes = markerData.likes;
  marker.dislikes = markerData.dislikes;
  marker.userVoted = false;
  marker.ownerUsername = markerData.User?.username || "Unknown";

  // Bind a popup
  marker.bindPopup("Loading...");

  // On popup open => generate HTML & add listeners
  marker.on("popupopen", () => {
    marker.setPopupContent(generatePopupHTML(marker));
    attachPopupListeners(marker);
  });

  // Right-click => delete
  marker.on("contextmenu", async function () {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:3000/markers/${marker.dbId}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token },
      });
      if (response.ok) {
        // remove from map & memory
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
 * Generate popup HTML 
 */
function generatePopupHTML(marker) {
  const lat = marker.getLatLng().lat.toFixed(4);
  const lng = marker.getLatLng().lng.toFixed(4);
  const userText = marker.ownerUsername ? `Created by: ${marker.ownerUsername}` : '';

  return `
    <div style="text-align: center; font-family: Arial, sans-serif;">
      <p style="margin: 5px 0;"><strong>📍 ${marker.markerName}</strong></p>
      <p style="margin: 5px 0;">${userText}</p>
      <p style="margin: 5px 0;">
        Latitude: ${lat}<br>
        Longitude: ${lng}
      </p>
      <div style="display: flex; justify-content: center; align-items: center; gap: 10px;">
        <button class="like-btn" 
                style="border: none; background: none; cursor: pointer; font-size: 16px;">
          👍 <span class="like-count">${marker.likes}</span>
        </button>
        <button class="dislike-btn"
                style="border: none; background: none; cursor: pointer; font-size: 16px;">
          👎 <span class="dislike-count">${marker.dislikes}</span>
        </button>
      </div>
    </div>
  `;
}

/**
 * Attach like/dislike logic for the popup
 */
function attachPopupListeners(marker) {
  const popupEl = marker.getPopup().getElement();
  if (!popupEl) return;

  const likeBtn = popupEl.querySelector(".like-btn");
  const dislikeBtn = popupEl.querySelector(".dislike-btn");
  const likeCountEl = popupEl.querySelector(".like-count");
  const dislikeCountEl = popupEl.querySelector(".dislike-count");

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

  // Cleanup listeners on close
  marker.on("popupclose", () => {
    likeBtn.removeEventListener("click", handleLike);
    dislikeBtn.removeEventListener("click", handleDislike);
  }, { once: true });
}

/** 
 * Helpers for calling the server's like/dislike endpoints 
 */
async function likeMarkerOnServer(markerId) {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const response = await fetch(`http://localhost:3000/markers/${markerId}/like`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!response.ok) {
      console.error('Failed to like marker:', response.statusText);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Error liking marker:', error);
    return null;
  }
}
async function dislikeMarkerOnServer(markerId) {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const response = await fetch(`http://localhost:3000/markers/${markerId}/dislike`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!response.ok) {
      console.error('Failed to dislike marker:', response.statusText);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Error disliking marker:', error);
    return null;
  }
}

/** 
 * POST a new marker to the server 
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
    return await response.json(); 
  } catch (error) {
    console.error('Error creating marker:', error);
    return null;
  }
}

// When map is clicked => create a new marker
map.on('click', async (e) => {
  if (!selectedMarkerIcon) return;

  const lat = e.latlng.lat;
  const lng = e.latlng.lng;
  const serverMarker = await createMarkerOnServer(selectedMarkerName, lat, lng);
  if (!serverMarker) return; // creation failed

  const newLeafletMarker = addMarkerToMap(serverMarker);
  leafletMarkers.push(newLeafletMarker);
});

/** 
 * Instead of listening on .round-button, 
 * we handle the entire row .button-item 
 * => This also allows a persistent "selected" highlight
 */
document.querySelectorAll('.button-item').forEach(item => {
  item.addEventListener('click', () => {
    // 1) Unselect all
    document.querySelectorAll('.button-item').forEach(i => i.classList.remove('selected'));
    // 2) Select this row
    item.classList.add('selected');

    // 3) Extract info from data attributes
    const iconSrc = item.getAttribute('data-icon');
    const markerName = item.getAttribute('data-marker');

    // 4) Call our marker selection function
    selectMarker(iconSrc, markerName);
  });
});

// The function that sets the "active" marker
function selectMarker(iconUrl, markerName) {
  selectedMarkerIcon = L.icon({
    iconUrl: iconUrl,
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48]
  });
  selectedMarkerName = markerName;
}

// Finally, add a logout button
const logoutButton = document.createElement('button');
logoutButton.textContent = 'Logout';

// Positioning & layering
logoutButton.style.position = 'absolute';
logoutButton.style.top = '10px';
logoutButton.style.right = '10px';
logoutButton.style.zIndex = 1000;

// Basic styles
logoutButton.style.background = '#ffffff';
logoutButton.style.color = '#2b2b4e';
logoutButton.style.fontSize = '14px';
logoutButton.style.border = 'none';
logoutButton.style.borderRadius = '8px';
logoutButton.style.padding = '8px 14px';
logoutButton.style.cursor = 'pointer';
logoutButton.style.fontWeight = '600';
logoutButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
logoutButton.style.transition = 'background 0.2s, transform 0.2s';

// Hover effects
logoutButton.addEventListener('mouseover', () => {
  logoutButton.style.background = '#d3ecfa';
  logoutButton.style.transform = 'translateY(-2px)';
});
logoutButton.addEventListener('mouseout', () => {
  logoutButton.style.background = '#ffffff';
  logoutButton.style.transform = 'none';
});

// On click => remove token & redirect
logoutButton.addEventListener('click', () => {
  localStorage.removeItem('token');
  window.location.href = '/index.html';
});

// Finally, add it to the page
document.body.appendChild(logoutButton);

// Load existing markers once map is ready
loadMarkersFromServer();
