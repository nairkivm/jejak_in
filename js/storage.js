export const STORAGE_KEY = 'jejak_in_state_v1';

export const saveState = (state) => {
  try {
    state.updatedAt = new Date().toISOString();
    const key = state.mode ? `${STORAGE_KEY}_${state.mode}` : STORAGE_KEY;
    localStorage.setItem(key, JSON.stringify(state));
  } catch (err) {
    console.error("Failed to save state:", err);
  }
};

export const loadState = (mode) => {
  try {
    const key = mode ? `${STORAGE_KEY}_${mode}` : STORAGE_KEY;
    let data = localStorage.getItem(key);
    
    // Migration for older saves without mode suffix
    if (!data && mode) {
      const legacyData = localStorage.getItem(STORAGE_KEY);
      if (legacyData) {
        const parsed = JSON.parse(legacyData);
        const legacyMode = parsed.mode || 'mystery';
        if (legacyMode === mode) {
          data = legacyData;
          // Optionally save to new key immediately
          localStorage.setItem(key, legacyData);
        }
      }
    }
    
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error("Failed to load state:", err);
    return null;
  }
};
