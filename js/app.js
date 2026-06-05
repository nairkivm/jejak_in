import { appState, initAppState, updateState } from './state.js';
import { generateId } from './utils.js';
import { initMap, updateMapSize, refreshMapMarkers, clearAllMarkers } from './map.js';
import { renderTimeline } from './timeline.js';
import { renderThreads } from './thread.js';
import { onClueClickEvent } from './clue.js';
import { initDecorations, renderDecorations } from './decorations.js';
import { openModal, closeAllModals, customAlert, customConfirm } from './modal.js';
import { setupScreenshot } from './screenshot.js';
import { setupArchive } from './import-export.js';
import { analyzeCase } from '../ai/ai-service.js';
import { setupGuide } from './guide.js';

let listType = null; // 'location' or 'character'

const applyModeState = () => {
  // Apply Mystery vs Fun mode
  const mysteryEls = document.querySelectorAll('.mystery-only');
  if (appState.mode === 'fun') {
    mysteryEls.forEach(el => {
      // For tools, mark them disabled
      if (el.classList.contains('tool-item')) {
        el.classList.add('disabled');
        el.setAttribute('title', 'Hanya aktif di Mystery Mode');
        const container = el.closest('.tool-container');
        if (container) container.classList.add('disabled-container');
      } else {
        el.classList.add('hidden');
      }
    });
  } else {
    mysteryEls.forEach(el => {
      if (el.classList.contains('tool-item')) {
        el.classList.remove('disabled');
        const container = el.closest('.tool-container');
        if (container) container.classList.remove('disabled-container');
        // Restore title based on ID
        if (el.id === 'tool-location') el.setAttribute('title', 'Kelola daftar lokasi');
        if (el.id === 'tool-character') el.setAttribute('title', 'Kelola daftar tokoh');
        if (el.id === 'tool-ai') el.setAttribute('title', 'Minta analisis AI Detective');
      } else {
        el.classList.remove('hidden');
      }
    });
    
    // Toggle search panel visibility properly using state
    const searchPanel = document.querySelector('.search-content');
    if (searchPanel) {
        if(appState.ui.isLocationSearchVisible) {
            searchPanel.classList.remove('hidden');
        } else {
            searchPanel.classList.add('hidden');
        }
    }
  }

  // Update empty state
  if (appState.clues.length === 0) {
    document.getElementById('empty-state').classList.remove('hidden');
  } else {
    document.getElementById('empty-state').classList.add('hidden');
  }

  // Refresh Views
  if (appState.viewMode === 'map') {
    document.getElementById('toggle-map-btn').classList.add('active');
    document.getElementById('toggle-timeline-btn').classList.remove('active');
    document.getElementById('map-view').classList.add('active');
    document.getElementById('map-view').classList.remove('hidden');
    document.getElementById('timeline-view').classList.remove('active');
    document.getElementById('timeline-view').classList.add('hidden');
    
    refreshMapMarkers(appState.clues, onClueClickEvent, false);
    renderThreads();
    updateMapSize();
  } else {
    document.getElementById('toggle-timeline-btn').classList.add('active');
    document.getElementById('toggle-map-btn').classList.remove('active');
    document.getElementById('timeline-view').classList.add('active');
    document.getElementById('timeline-view').classList.remove('hidden');
    document.getElementById('map-view').classList.remove('active');
    document.getElementById('map-view').classList.add('hidden');
    
    clearAllMarkers(); // don't show map markers on timeline
    document.getElementById('thread-layer').innerHTML = ''; // hide threads
    
    renderTimeline(onClueClickEvent);
  }
  
  renderDecorations();
};

window.applyModeState = applyModeState;

document.addEventListener('DOMContentLoaded', () => {
  initAppState();
  initMap();
  initDecorations();
  setupScreenshot();
  setupArchive();
  setupGuide();

  // Mode Selection
  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const mode = e.currentTarget.dataset.mode;
      initAppState(mode);
      
      document.getElementById('landing-page').classList.add('hidden');
      document.getElementById('analysis-room').classList.remove('hidden');
      applyModeState();
    });
    card.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' || e.key === ' ') {
         e.preventDefault();
         card.click();
      }
    });
  });

  // View Toggles
  document.getElementById('toggle-map-btn').addEventListener('click', () => {
    updateState({ viewMode: 'map' });
    applyModeState();
  });
  document.getElementById('toggle-timeline-btn').addEventListener('click', () => {
    updateState({ viewMode: 'timeline' });
    applyModeState();
  });

  // Toolbox Tools Logic
  const tools = document.querySelectorAll('.tool-item');
  const deactivateAllTools = () => {
    tools.forEach(t => t.classList.remove('active'));
    appState.ui.activeTool = null;
    document.getElementById('decoration-panel').classList.add('hidden');
    document.getElementById('board-container').classList.remove('eraser-mode');
  };

  document.getElementById('tool-home').addEventListener('click', () => {
    document.getElementById('analysis-room').classList.add('hidden');
    document.getElementById('landing-page').classList.remove('hidden');
  });

  document.getElementById('tool-clue').addEventListener('click', () => {
    deactivateAllTools();
    if (appState.viewMode !== 'map') {
      customAlert("Pindah ke Mode Peta untuk menambahkan clue baru.");
      return;
    }
    appState.ui.activeTool = 'clue';
    document.getElementById('tool-clue').classList.add('active');
  });

  document.getElementById('tool-thread').addEventListener('click', () => {
    deactivateAllTools();
    if (appState.viewMode !== 'map') {
      customAlert("Pindah ke Mode Peta untuk menghubungkan clue.");
      return;
    }
    appState.ui.activeTool = 'thread';
    document.getElementById('tool-thread').classList.add('active');
  });

  // LOCATION & CHARACTER LISTS
  const renderList = (type) => {
    listType = type;
    const container = document.getElementById('list-container');
    container.innerHTML = '';
    const items = type === 'location' ? appState.locations : appState.characters;
    
    document.getElementById('list-modal-title').innerText = type === 'location' ? 'Daftar Lokasi' : 'Daftar Tokoh';

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'list-card';
      card.innerHTML = `
        <div class="list-card-content">
          <h4>${item.name}</h4>
          <p>${item.description || ''}</p>
        </div>
      `;
      card.addEventListener('click', () => editListItem(type, item.id));
      container.appendChild(card);
    });

    openModal('list-modal');
  };

  document.getElementById('tool-location').addEventListener('click', () => {
    if (appState.mode === 'fun') return;
    deactivateAllTools();
    renderList('location');
  });

  document.getElementById('tool-character').addEventListener('click', () => {
    if (appState.mode === 'fun') return;
    deactivateAllTools();
    renderList('character');
  });

  document.getElementById('add-list-item-btn').addEventListener('click', () => {
    closeAllModals();
    if (listType === 'location') {
      document.getElementById('location-form').reset();
      document.getElementById('loc-id').value = '';
      document.getElementById('location-modal-title').innerText = 'Tambah Lokasi';
      document.getElementById('loc-delete-btn').classList.add('hidden');
      openModal('location-modal');
    } else {
      document.getElementById('character-form').reset();
      document.getElementById('char-id').value = '';
      document.getElementById('character-modal-title').innerText = 'Tambah Tokoh';
      document.getElementById('char-delete-btn').classList.add('hidden');
      openModal('character-modal');
    }
  });

  const editListItem = (type, id) => {
    closeAllModals();
    if (type === 'location') {
      const loc = appState.locations.find(l => l.id === id);
      if (!loc) return;
      document.getElementById('loc-id').value = loc.id;
      document.getElementById('loc-name').value = loc.name;
      document.getElementById('loc-desc').value = loc.description;
      document.getElementById('loc-lat').value = loc.latitude || '';
      document.getElementById('loc-lng').value = loc.longitude || '';
      document.getElementById('location-modal-title').innerText = 'Edit Lokasi';
      document.getElementById('loc-delete-btn').classList.remove('hidden');
      openModal('location-modal');
    } else {
      const char = appState.characters.find(c => c.id === id);
      if (!char) return;
      document.getElementById('char-id').value = char.id;
      document.getElementById('char-name').value = char.name;
      document.getElementById('char-desc').value = char.description;
      document.getElementById('char-chars').value = char.characteristics || '';
      document.getElementById('character-modal-title').innerText = 'Edit Tokoh';
      document.getElementById('char-delete-btn').classList.remove('hidden');
      openModal('character-modal');
    }
  };

  document.getElementById('location-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('loc-id').value || generateId('L');
    const name = document.getElementById('loc-name').value;
    const isDup = appState.locations.some(l => l.name === name && l.id !== id);
    if(isDup) { customAlert("Nama lokasi sudah ada."); return; }

    const newLoc = {
      id, name,
      description: document.getElementById('loc-desc').value,
      latitude: parseFloat(document.getElementById('loc-lat').value),
      longitude: parseFloat(document.getElementById('loc-lng').value)
    };
    
    const existing = appState.locations.findIndex(l => l.id === id);
    const locs = [...appState.locations];
    if (existing > -1) locs[existing] = newLoc;
    else locs.push(newLoc);
    
    updateState({ locations: locs });
    renderList('location');
  });

  document.getElementById('loc-delete-btn').addEventListener('click', async () => {
    const id = document.getElementById('loc-id').value;
    if (await customConfirm('Hapus lokasi ini?')) {
      const locs = appState.locations.filter(l => l.id !== id);
      updateState({ locations: locs });
      renderList('location');
    }
  });

  document.getElementById('character-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('char-id').value || generateId('P');
    const name = document.getElementById('char-name').value;
    const isDup = appState.characters.some(c => c.name === name && c.id !== id);
    if(isDup) { customAlert("Nama tokoh sudah ada."); return; }

    const newChar = {
      id, name,
      description: document.getElementById('char-desc').value,
      characteristics: document.getElementById('char-chars').value
    };
    
    const existing = appState.characters.findIndex(c => c.id === id);
    const chars = [...appState.characters];
    if (existing > -1) chars[existing] = newChar;
    else chars.push(newChar);
    
    updateState({ characters: chars });
    renderList('character');
  });

  document.getElementById('char-delete-btn').addEventListener('click', async () => {
    const id = document.getElementById('char-id').value;
    if (await customConfirm('Hapus tokoh ini?')) {
      const chars = appState.characters.filter(c => c.id !== id);
      updateState({ characters: chars });
      renderList('character');
    }
  });

  // AI Logic
  document.getElementById('tool-ai').addEventListener('click', () => {
    if (appState.mode === 'fun') return;
    deactivateAllTools();
    if (appState.clues.length === 0) {
      customAlert("Anda membutuhkan setidaknya 1 clue untuk menjalankan analisis AI.");
      return;
    }
    
    document.getElementById('ai-req-form').reset();
    document.getElementById('ai-case-title').value = appState.caseInfo.title;
    document.getElementById('ai-case-q').value = appState.caseInfo.mainQuestion;
    
    openModal('ai-req-modal');
  });

  document.getElementById('ai-req-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('ai-submit-btn');
    btn.disabled = true;
    btn.innerText = "Menganalisis...";
    
    const title = document.getElementById('ai-case-title').value;
    const q = document.getElementById('ai-case-q').value;
    
    appState.caseInfo.title = title;
    appState.caseInfo.mainQuestion = q;
    updateState({ caseInfo: appState.caseInfo }, true);
    
    const reportText = await analyzeCase(title, q, appState);
    
    btn.disabled = false;
    btn.innerText = "Analisis Sekarang";
    
    closeAllModals();
    
    const htmlReport = window.marked && window.marked.parse ? window.marked.parse(reportText) : reportText.replace(/\n/g, '<br>');
    document.getElementById('ai-report-content').innerHTML = htmlReport;
    
    openModal('ai-report-modal');
  });
  
  document.getElementById('ai-copy-btn').addEventListener('click', () => {
    const text = document.getElementById('ai-report-content').innerText;
    navigator.clipboard.writeText(text);
    customAlert('Disalin ke clipboard!');
  });
  
  document.getElementById('ai-download-btn').addEventListener('click', () => {
    const text = document.getElementById('ai-report-content').innerText;
    const a = document.createElement('a');
    a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(text);
    a.download = `Detective_Report_${Date.now()}.txt`;
    a.click();
  });

  // Reset
  document.getElementById('tool-reset').addEventListener('click', async () => {
    if(await customConfirm("Apakah Anda yakin ingin mereset papan (menghapus semua clue, benang merah, dan dekorasi)? Tindakan ini tidak bisa dibatalkan.")){
      updateState({ clues: [], redThreads: [], decorations: [] });
      applyModeState();
      renderDecorations();
    }
  });

  // Keyboard accessibility on toolbox
  tools.forEach(tool => {
    tool.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' || e.key === ' ') {
         e.preventDefault();
         tool.click();
      }
    });
  });

});
