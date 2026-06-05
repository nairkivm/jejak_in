import { appState, updateState } from './state.js';
import { refreshMapMarkers } from './map.js';
import { renderThreads } from './thread.js';
import { renderTimeline } from './timeline.js';
import { renderDecorations } from './decorations.js';
import { closeAllModals, openModal, customAlert } from './modal.js';
import { onClueClickEvent } from './clue.js';

export const setupArchive = () => {
  document.getElementById('tool-archive').addEventListener('click', () => {
    openModal('archive-modal');
  });

  document.getElementById('export-json-btn').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `Jejak.in_Data_${appState.mode}_${Date.now()}.json`;
    a.click();
    closeAllModals();
  });

  document.getElementById('import-json-btn').addEventListener('click', () => {
    document.getElementById('import-json-input').click();
  });

  document.getElementById('import-json-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        
        // Minimal validation
        if (!imported.appVersion || !imported.clues) {
          throw new Error("Invalid format");
        }

        updateState(imported, true);
        customAlert("Data berhasil diimport!");
        
        closeAllModals();
        
        // Ensure UI matches new Mode
        window.applyModeState(); // Helper function injected globally in app.js
        
        if (appState.viewMode === 'map') {
            refreshMapMarkers(appState.clues, onClueClickEvent, false);
            renderThreads();
        } else {
            renderTimeline(onClueClickEvent);
        }
        renderDecorations();
        
      } catch (err) {
        console.error("Import error", err);
        customAlert("Gagal membaca file JSON. Format tidak sesuai.");
      }
    };
    reader.readAsText(file);
    // reset input
    e.target.value = '';
  });
};
