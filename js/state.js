import { loadState, saveState } from './storage.js';

export const getInitialState = () => ({
  appVersion: "0.1.0",
  mode: "mystery",
  viewMode: "map", // map or timeline
  caseInfo: {
    title: "",
    mainQuestion: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  clues: [],
  locations: [],
  characters: [],
  redThreads: [],
  decorations: [], // texts, stickers, doodles
  ui: {
    activeTool: null, // 'clue', 'thread', 'eraser', etc.
    selectedClueId: null,
    isLocationSearchVisible: true
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

export let appState = getInitialState();

export const initAppState = (mode = null) => {
  const loaded = loadState(mode);
  
  // Create a clean initial state
  const cleanState = getInitialState();
  
  if (loaded) {
    // Apply defaults to loaded state for backward compatibility
    // We clear current keys to avoid leftover old state when switching modes
    for (const key in appState) {
      delete appState[key];
    }
    Object.assign(appState, cleanState, loaded, { ui: cleanState.ui });
  } else {
    for (const key in appState) {
      delete appState[key];
    }
    Object.assign(appState, cleanState);
  }
  
  if (mode) {
    appState.mode = mode;
  }
};

// Dispatcher or simple update and save
export const updateState = (updates, doSave = true) => {
  Object.assign(appState, updates);
  if (doSave) saveState(appState);
};
