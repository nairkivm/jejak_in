import { appState } from './state.js';

export const generateId = (prefix) => {
  const prefixMap = {
    'C': 'CLU',
    'L': 'LOC',
    'P': 'PRS',
    'R': 'THR',
    'D': 'DEC'
  };
  
  const mappedPrefix = prefixMap[prefix] || prefix;

  if (appState) {
    const allIds = [
      ...(appState.clues || []).map(c => c.id),
      ...(appState.locations || []).map(l => l.id),
      ...(appState.characters || []).map(p => p.id),
      ...(appState.redThreads || []).map(r => r.id),
      ...(appState.decorations || []).map(d => d.id)
    ];

    let count = 1;
    let nextId = `${mappedPrefix}-${String(count).padStart(3, '0')}`;
    while (allIds.includes(nextId)) {
      count++;
      nextId = `${mappedPrefix}-${String(count).padStart(3, '0')}`;
    }
    return nextId;
  }

  // Fallback
  return `${mappedPrefix}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
};

export const parseTags = (text) => {
  const characters = [];
  const locations = [];
  if (!text) return { characters, locations };
  
  const words = text.split(/\s+/);
  words.forEach(word => {
    if (word.startsWith('@') && word.length > 1) {
      characters.push(word.substring(1));
    } else if (word.startsWith('#') && word.length > 1) {
      locations.push(word.substring(1));
    }
  });
  
  return { characters, locations };
};

export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => resolve(reader.result); // fallback
    };
    reader.onerror = error => reject(error);
  });
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
};
