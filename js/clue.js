import { appState, updateState } from './state.js';
import { generateId, parseTags, fileToBase64 } from './utils.js';
import { refreshMapMarkers, getMapInstance } from './map.js';
import { renderTimeline } from './timeline.js';
import { renderThreads } from './thread.js';
import { closeAllModals, openModal, customAlert, customConfirm } from './modal.js';

let formLatLng = null;

export const handleMapClickForClue = (latlng) => {
  formLatLng = latlng;
  
  // reset form
  document.getElementById('clue-form').reset();
  updateHighlight();
  document.getElementById('clue-id').value = '';
  document.getElementById('clue-lat').value = latlng.lat;
  document.getElementById('clue-lng').value = latlng.lng;
  document.getElementById('clue-image-preview').innerHTML = '';
  document.getElementById('clue-delete-btn').classList.add('hidden');
  
  // Custom form toggles based on mode
  if (appState.mode === 'fun') {
    document.querySelectorAll('#clue-form .mystery-only').forEach(el => el.classList.add('hidden'));
  } else {
    document.querySelectorAll('#clue-form .mystery-only').forEach(el => el.classList.remove('hidden'));
  }

  // Populate locations dropdown if mystery
  if (appState.mode === 'mystery') {
    const locSelect = document.getElementById('clue-location');
    locSelect.innerHTML = '<option value="">-- Pilih Lokasi --</option>';
    appState.locations.forEach(loc => {
      locSelect.innerHTML += `<option value="${loc.id}">${loc.name}</option>`;
    });
  }

  document.getElementById('clue-modal-title').innerText = 'Tambah Jejak';
  openModal('clue-modal');
  appState.ui.activeTool = null; // deactivate creation tool
  document.querySelectorAll('.tool-item').forEach(el => el.classList.remove('active'));
};

const handleImageChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const base64 = await fileToBase64(file);
  document.getElementById('clue-image-preview').innerHTML = `<img src="${base64}" style="max-width:100%; height:auto; margin-top:10px; border-radius:4px; max-height:200px; object-fit:contain;" data-base64="${base64}"/>`;
};

document.getElementById('clue-image').addEventListener('change', handleImageChange);

const updateHighlight = () => {
  const textarea = document.getElementById('clue-desc');
  const highlight = document.getElementById('clue-desc-highlight');
  let text = textarea.value;
  
  // Escape HTML to prevent XSS
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Replace tags with spans
  // Match @word and #word
  text = text.replace(/(@\w+)/g, '<span class="tag-person">$1</span>');
  text = text.replace(/(#\w+)/g, '<span class="tag-location">$1</span>');
  
  // Handle newlines correctly in pre-wrap
  // If the text ends with a newline, it might not render the extra space correctly in div, so append a space
  if (text.endsWith('\n')) text += ' ';
  
  highlight.innerHTML = text;
};

// Sync scroll
document.getElementById('clue-desc').addEventListener('scroll', (e) => {
  document.getElementById('clue-desc-highlight').scrollTop = e.target.scrollTop;
});

let autocompleteState = {
  active: false,
  type: null,
  startIdx: -1,
  currentQuery: ''
};

document.getElementById('clue-desc').addEventListener('input', (e) => {
  updateHighlight();
  const textarea = e.target;
  const val = textarea.value;
  const cursor = textarea.selectionStart;
  
  // Find the word under cursor
  const textBeforeCursor = val.substring(0, cursor);
  const words = textBeforeCursor.split(/\s/);
  const currentWord = words[words.length - 1];
  
  const popup = document.getElementById('tag-autocomplete');
  
  if (currentWord.startsWith('@')) {
    autocompleteState.active = true;
    autocompleteState.type = 'person';
    autocompleteState.startIdx = cursor - currentWord.length;
    autocompleteState.currentQuery = currentWord.substring(1).toLowerCase();
  } else if (currentWord.startsWith('#')) {
    autocompleteState.active = true;
    autocompleteState.type = 'location';
    autocompleteState.startIdx = cursor - currentWord.length;
    autocompleteState.currentQuery = currentWord.substring(1).toLowerCase();
  } else {
    autocompleteState.active = false;
  }
  
  if (autocompleteState.active) {
    let items = [];
    if (autocompleteState.type === 'person') {
      items = appState.characters.filter(c => c.name.toLowerCase().includes(autocompleteState.currentQuery) || c.id.toLowerCase().includes(autocompleteState.currentQuery));
    } else {
      items = appState.locations.filter(l => l.name.toLowerCase().includes(autocompleteState.currentQuery) || l.id.toLowerCase().includes(autocompleteState.currentQuery));
    }
    
    // Add clues as well if we want? Actually user just said @tokoh #lokasi
    if (items.length > 0) {
      popup.innerHTML = items.map(item => `
        <div class="autocomplete-item" data-val="${item.name.replace(/\s+/g, '')}">
          <strong>${autocompleteState.type==='person' ? '@' : '#'}${item.name.replace(/\s+/g, '')}</strong> <span style="color:#888; font-size:0.8em">(${item.id})</span>
        </div>
      `).join('');
      popup.classList.remove('hidden');
      
      popup.querySelectorAll('.autocomplete-item').forEach(el => {
        el.addEventListener('mousedown', (evt) => {
          evt.preventDefault(); // prevent blur
          const valToInsert = (autocompleteState.type === 'person' ? '@' : '#') + el.dataset.val + ' ';
          const before = val.substring(0, autocompleteState.startIdx);
          const after = val.substring(cursor);
          textarea.value = before + valToInsert + after;
          textarea.focus();
          textarea.selectionStart = textarea.selectionEnd = before.length + valToInsert.length;
          popup.classList.add('hidden');
          autocompleteState.active = false;
          updateHighlight();
        });
      });
    } else {
      popup.classList.add('hidden');
    }
  } else {
    popup.classList.add('hidden');
  }
});

document.getElementById('clue-desc').addEventListener('blur', () => {
  document.getElementById('tag-autocomplete').classList.add('hidden');
});

document.getElementById('clue-form').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const id = document.getElementById('clue-id').value || generateId('C');
  const title = document.getElementById('clue-title').value;
  const desc = document.getElementById('clue-desc').value;
  const date = document.getElementById('clue-date').value;
  const time = document.getElementById('clue-time').value;
  const lat = parseFloat(document.getElementById('clue-lat').value);
  const lng = parseFloat(document.getElementById('clue-lng').value);
  const locationId = document.getElementById('clue-location')?.value || null;
  
  const imgData = document.querySelector('#clue-image-preview img')?.dataset.base64 || null;

  const { characters: mentionedChars, locations: mentionedLocs } = parseTags(desc);

  const newClue = {
    id, title, description: desc, date, time,
    latitude: lat, longitude: lng, image: imgData,
    locationId,
    mentionedCharacters: mentionedChars,
    mentionedLocations: mentionedLocs,
    mode: appState.mode,
    createdAt: new Date().toISOString()
  };

  const existingIdx = appState.clues.findIndex(c => c.id === id);
  const updatedClues = [...appState.clues];
  if (existingIdx > -1) {
    updatedClues[existingIdx] = { ...updatedClues[existingIdx], ...newClue };
  } else {
    updatedClues.push(newClue);
  }

  updateState({ clues: updatedClues });
  document.getElementById('empty-state').classList.toggle('hidden', appState.clues.length > 0);
  closeAllModals();

  if (appState.viewMode === 'map') {
    // re-render map
    refreshMapMarkers(appState.clues, onClueClickEvent, false);
    renderThreads();
  } else {
    renderTimeline(onClueClickEvent);
  }
});

export const onClueClickEvent = (clueId) => {
  // Check if thread mode is active
  if (appState.ui.activeTool === 'thread') {
    handleThreadSelection(clueId);
    return;
  }

  const clue = appState.clues.find(c => c.id === clueId);
  if (!clue) return;

  document.getElementById('clue-id').value = clue.id;
  document.getElementById('clue-title').value = clue.title;
  document.getElementById('clue-desc').value = clue.description;
  updateHighlight();
  document.getElementById('clue-date').value = clue.date || '';
  document.getElementById('clue-time').value = clue.time || '';
  document.getElementById('clue-lat').value = clue.latitude;
  document.getElementById('clue-lng').value = clue.longitude;
  
  if (appState.mode === 'mystery') {
    const locSelect = document.getElementById('clue-location');
    locSelect.innerHTML = '<option value="">-- Pilih Lokasi --</option>';
    appState.locations.forEach(loc => {
      locSelect.innerHTML += `<option value="${loc.id}" ${loc.id === clue.locationId ? 'selected' : ''}>${loc.name}</option>`;
    });
  }

  if (clue.image) {
    document.getElementById('clue-image-preview').innerHTML = `<img src="${clue.image}" style="max-width:100%; height:auto; margin-top:10px; border-radius:4px; max-height:200px; object-fit:contain;" data-base64="${clue.image}"/>`;
  } else {
    document.getElementById('clue-image-preview').innerHTML = '';
  }

  document.getElementById('clue-delete-btn').classList.remove('hidden');
  document.getElementById('clue-modal-title').innerText = 'Edit Jejak';
  openModal('clue-modal');
};

document.getElementById('clue-delete-btn').addEventListener('click', async () => {
  const id = document.getElementById('clue-id').value;
  if (!id) return;
  if (!(await customConfirm("Hapus clue ini?"))) return;

  const newClues = appState.clues.filter(c => c.id !== id);
  const newThreads = appState.redThreads.filter(t => t.fromClueId !== id && t.toClueId !== id);
  
  updateState({ clues: newClues, redThreads: newThreads });
  document.getElementById('empty-state').classList.toggle('hidden', appState.clues.length > 0);
  closeAllModals();

  if (appState.viewMode === 'map') {
    refreshMapMarkers(appState.clues, onClueClickEvent, false);
    renderThreads();
  } else {
    renderTimeline(onClueClickEvent);
  }
});

// THREAD LOGIC
let threadSelection = [];
const handleThreadSelection = (clueId) => {
  if (appState.mode === 'fun') {
    if (threadSelection.length === 0) {
      threadSelection.push(clueId);
      customAlert("Pilih clue kedua.");
    } else {
      const clueA = threadSelection[0];
      const clueB = clueId;
      if (clueA === clueB) {
        threadSelection = [];
        return;
      }
      // Create fun thread automatically
      const newThread = {
        id: generateId('R'),
        fromClueId: clueA,
        toClueId: clueB,
        description: 'fun_connection',
        relationshipType: 'possible_connection',
        createdAt: new Date().toISOString()
      };
      updateState({ redThreads: [...appState.redThreads, newThread] });
      threadSelection = [];
      appState.ui.activeTool = null;
      document.querySelectorAll('.tool-item').forEach(el => el.classList.remove('active'));
      renderThreads();
    }
  } else {
    if (threadSelection.length === 0) {
      threadSelection.push(clueId);
    } else {
      const clueA = threadSelection[0];
      const clueB = clueId;
      if (clueA === clueB) {
        threadSelection = [];
        return;
      }
      
      // Open Thread Info Modal
      document.getElementById('thread-form').reset();
      document.getElementById('thread-id').value = '';
      
      const cA = appState.clues.find(c => c.id === clueA);
      const cB = appState.clues.find(c => c.id === clueB);
      document.getElementById('thread-clues-info').innerText = `Menghubungkan: "${cA.title}" ↔ "${cB.title}"`;
      
      // Store globally for form submit
      window._pendingThreadCreation = { fromClueId: clueA, toClueId: clueB };
      
      document.getElementById('thread-delete-btn').classList.add('hidden');
      openModal('thread-modal');
      
      threadSelection = [];
      appState.ui.activeTool = null;
      document.querySelectorAll('.tool-item').forEach(el => el.classList.remove('active'));
    }
  }
};

document.getElementById('thread-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('thread-id').value || generateId('R');
  let desc = document.getElementById('thread-desc').value;
  if (!desc) desc = 'kemungkinan ada hubungan';
  const type = document.getElementById('thread-type').value;
  
  if (window._pendingThreadCreation) {
    // New
    const newThread = {
      id,
      fromClueId: window._pendingThreadCreation.fromClueId,
      toClueId: window._pendingThreadCreation.toClueId,
      description: desc,
      relationshipType: type,
      createdAt: new Date().toISOString()
    };
    updateState({ redThreads: [...appState.redThreads, newThread] });
    window._pendingThreadCreation = null;
  } else {
    // Update
    const idx = appState.redThreads.findIndex(t => t.id === id);
    if (idx > -1) {
      const threads = [...appState.redThreads];
      threads[idx].description = desc;
      threads[idx].relationshipType = type;
      updateState({ redThreads: threads });
    }
  }
  
  closeAllModals();
  renderThreads();
});

// Edit Thread
window.addEventListener('threadClick', async (e) => {
  if (appState.mode === 'fun') {
    if(await customConfirm("Hapus hubungan ini?")) {
      const threads = appState.redThreads.filter(t => t.id !== e.detail);
      updateState({ redThreads: threads });
      renderThreads();
    }
    return;
  }
  
  const thread = appState.redThreads.find(t => t.id === e.detail);
  if (!thread) return;
  
  document.getElementById('thread-id').value = thread.id;
  document.getElementById('thread-desc').value = thread.description;
  document.getElementById('thread-type').value = thread.relationshipType;
  
  const cA = appState.clues.find(c => c.id === thread.fromClueId);
  const cB = appState.clues.find(c => c.id === thread.toClueId);
  document.getElementById('thread-clues-info').innerText = cA && cB ? `Hubungan: "${cA.title}" ↔ "${cB.title}"` : 'Hubungan clue';
  
  document.getElementById('thread-delete-btn').classList.remove('hidden');
  window._pendingThreadCreation = null; // Important flag
  openModal('thread-modal');
});

document.getElementById('thread-delete-btn').addEventListener('click', () => {
  const id = document.getElementById('thread-id').value;
  if (id) {
    const threads = appState.redThreads.filter(t => t.id !== id);
    updateState({ redThreads: threads });
    closeAllModals();
    renderThreads();
  }
});
