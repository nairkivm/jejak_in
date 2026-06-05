import { appState } from './state.js';
import { renderThreads } from './thread.js';
import { handleMapClickForClue } from './clue.js';
import { customAlert } from './modal.js';

let mapInstance = null;
let clueMarkers = {}; // clueId -> marker

export const initMap = () => {
  // Check if Leaflet is available
  if (!window.L) {
    console.error("Leaflet not loaded");
    return;
  }

  // Initialize map with a dark, mystery-appropriate theme
  mapInstance = L.map('map', {
    zoomControl: false,
    attributionControl: false
  }).setView([-4.0, 115.0], 5); // default center Indonesia

  // Add custom zoom control position
  L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

  // Use base map
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    crossOrigin: true // Important for html2canvas
  }).addTo(mapInstance);

  // Move thread layer inside map's overlayPane to sit below markers
  const threadLayer = document.getElementById('thread-layer');
  if (mapInstance && threadLayer) {
    const pane = mapInstance.getPane('overlayPane');
    if (pane) {
      pane.appendChild(threadLayer);
    }
  }

  mapInstance.on('click', (e) => {
    if (appState.ui.activeTool === 'clue') {
      handleMapClickForClue(e.latlng);
    }
  });

  mapInstance.on('move', renderThreads);
  mapInstance.on('zoom', renderThreads);
  mapInstance.on('zoomend', renderThreads);

  setupLocationSearch();
};

export const getMapInstance = () => mapInstance;

export const updateMapSize = () => {
  if (mapInstance) {
    setTimeout(() => { mapInstance.invalidateSize(); }, 50);
  }
};

export const addClueMarker = (clue, onClick, isSelectingThread) => {
  if (!mapInstance) return;

  const latlng = [clue.latitude || -4.0, clue.longitude || 115.0];
  
  // Build sticky note HTML
  let thumbHtml = '';
  if (clue.image) {
    thumbHtml = `<img src="${clue.image}" class="clue-thumb" alt="thumb"/>`;
  } else {
    thumbHtml = `<div class="clue-thumb-placeholder"></div>`;
  }
  
  const dateStr = clue.date ? clue.date : '';
  const timeStr = clue.time ? clue.time : '';
  const dtStr = [dateStr, timeStr].filter(Boolean).join(' ');

  const html = `
    <div class="clue-note" data-id="${clue.id}">
      ${thumbHtml}
      <div class="clue-title-text">${clue.title}</div>
      ${dtStr ? `<div class="clue-date-text">${dtStr}</div>` : ''}
    </div>
  `;

  const icon = L.divIcon({
    className: 'clue-marker-icon',
    html: html,
    iconSize: [100, 120],
    iconAnchor: [50, 20] // top-center anchor
  });

  const marker = L.marker(latlng, { icon, draggable: false }).addTo(mapInstance);
  
  marker.on('click', (e) => {
    L.DomEvent.stopPropagation(e);
    onClick(clue.id);
  });

  clueMarkers[clue.id] = marker;
};

export const removeClueMarker = (id) => {
  if (clueMarkers[id]) {
    mapInstance.removeLayer(clueMarkers[id]);
    delete clueMarkers[id];
  }
};

export const clearAllMarkers = () => {
  Object.values(clueMarkers).forEach(marker => mapInstance.removeLayer(marker));
  clueMarkers = {};
};

export const refreshMapMarkers = (clues, onClueClick, isSelectingThread) => {
  clearAllMarkers();
  clues.forEach(clue => addClueMarker(clue, onClueClick, isSelectingThread));
};

export const centerMapOnMarker = (id) => {
  if (clueMarkers[id] && mapInstance) {
    mapInstance.setView(clueMarkers[id].getLatLng(), 14);
  }
};

export const toggleLocationSearch = (show) => {
  const panel = document.querySelector('.search-content');
  if (show) {
    panel.classList.remove('hidden');
  } else {
    panel.classList.add('hidden');
  }
};

const setupLocationSearch = () => {
  document.getElementById('toggle-search-btn').addEventListener('click', () => {
    const isHidden = document.querySelector('.search-content').classList.contains('hidden');
    appState.ui.isLocationSearchVisible = isHidden;
    toggleLocationSearch(isHidden);
  });

  document.getElementById('loc-search-btn').addEventListener('click', async () => {
    const query = document.getElementById('loc-search-input').value;
    if (!query) return;
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await resp.json();
      if (data && data.length > 0) {
        const item = data[0];
        mapInstance.setView([parseFloat(item.lat), parseFloat(item.lon)], 13);
      } else {
        customAlert("Lokasi tidak ditemukan.");
      }
    } catch(err) {
      customAlert("Gagal mencari lokasi.");
    }
  });

  document.getElementById('loc-me-btn').addEventListener('click', () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          mapInstance.setView([pos.coords.latitude, pos.coords.longitude], 14);
        },
        (err) => {
          customAlert("Gagal mendapatkan lokasi Anda.");
        }
      );
    } else {
      customAlert("Geolocation tidak didukung di browser ini.");
    }
  });
};
