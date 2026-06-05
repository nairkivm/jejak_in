import { appState, updateState } from './state.js';
import { generateId } from './utils.js';

let isDrawing = false;
let ctx = null;
let canvas = null;
let selectedDecId = null;

export const initDecorations = () => {
  canvas = document.getElementById('doodle-canvas');
  ctx = canvas.getContext('2d');
  
  const resizeCanvas = () => {
    const rect = document.getElementById('board-container').getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    renderDecorations();
  };
  
  window.addEventListener('resize', resizeCanvas);
  // initial delay to ensure dom is mounted
  setTimeout(resizeCanvas, 100);

  // Tools toggle
  document.getElementById('tool-decoration').addEventListener('click', () => {
    const panel = document.getElementById('decoration-panel');
    panel.classList.toggle('hidden');
  });
  
  document.querySelector('.panel-close-btn').addEventListener('click', () => {
    document.getElementById('decoration-panel').classList.add('hidden');
    appState.ui.activeTool = null;
    deactivateAllDecTools();
  });

  const tools = ['dec-text-btn', 'dec-sticker-btn', 'dec-doodle-btn', 'dec-eraser-btn'];
  const deactivateAllDecTools = () => {
    tools.forEach(t => document.getElementById(t).classList.remove('active'));
    document.getElementById('dec-options').classList.add('hidden');
    document.getElementById('dec-options').innerHTML = '';
    document.getElementById('board-container').classList.remove('eraser-mode');
    appState.ui.activeTool = null;
    selectedDecId = null;
    renderDecorations();
  };

  document.getElementById('dec-text-btn').addEventListener('click', (e) => {
    deactivateAllDecTools();
    e.target.classList.add('active');
    appState.ui.activeTool = 'text';
    
    const opts = document.getElementById('dec-options');
    opts.classList.remove('hidden');
    opts.innerHTML = `
      <input type="text" id="dec-text-input" placeholder="Teks...">
      <input type="color" id="dec-text-color" value="#ffffff">
      <select id="dec-text-font">
        <option value="'Special Elite', monospace">Special Elite</option>
        <option value="'Caveat', cursive">Caveat</option>
        <option value="'Patrick Hand', cursive">Patrick Hand</option>
        <option value="'Permanent Marker', cursive">Permanent Marker</option>
      </select>
      <button id="dec-text-add">Tambah</button>
    `;
    
    document.getElementById('dec-text-add').addEventListener('click', () => {
      const content = document.getElementById('dec-text-input').value;
      if (!content) return;
      
      const newText = {
        id: generateId('D'),
        type: 'text',
        x: 100, y: 100,
        scale: 1, rotation: 0,
        content,
        color: document.getElementById('dec-text-color').value,
        fontFamily: document.getElementById('dec-text-font').value,
        createdAt: new Date().toISOString()
      };
      
      updateState({ decorations: [...appState.decorations, newText] });
      renderDecorations();
      document.getElementById('dec-text-input').value = '';
    });
  });

  document.getElementById('dec-sticker-btn').addEventListener('click', (e) => {
    deactivateAllDecTools();
    e.target.classList.add('active');
    appState.ui.activeTool = 'sticker';
    
    const placeholders = ['⭐','❤️','🔥','📌','💡', '🔍'];
    
    const opts = document.getElementById('dec-options');
    opts.classList.remove('hidden');
    opts.innerHTML = placeholders.map(st => `<button class="sticker-opt" style="font-size:24px; background:none; border:none; cursor:pointer">${st}</button>`).join('') + 
      `<label class="sticker-opt" style="font-size:24px; background:none; border:none; cursor:pointer; margin-left:10px;">
        🖼️<input type="file" id="dec-sticker-upload" accept="image/png, image/jpeg" style="display:none">
       </label>`;
    
    document.querySelectorAll('.sticker-opt:not(label)').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const newSticker = {
          id: generateId('D'),
          type: 'sticker',
          x: 150, y: 150,
          scale: 1, rotation: 0,
          content: e.target.innerText,
          createdAt: new Date().toISOString()
        };
        updateState({ decorations: [...appState.decorations, newSticker] });
        renderDecorations();
      });
    });

    document.getElementById('dec-sticker-upload').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const newSticker = {
          id: generateId('D'),
          type: 'image',
          x: 150, y: 150,
          scale: 1, rotation: 0,
          content: ev.target.result,
          createdAt: new Date().toISOString()
        };
        updateState({ decorations: [...appState.decorations, newSticker] });
        renderDecorations();
      };
      reader.readAsDataURL(file);
    });
  });

  document.getElementById('dec-doodle-btn').addEventListener('click', (e) => {
    deactivateAllDecTools();
    e.target.classList.add('active');
    appState.ui.activeTool = 'doodle';
    
    canvas.style.pointerEvents = 'auto'; // allow drawing
    
    const opts = document.getElementById('dec-options');
    opts.classList.remove('hidden');
    opts.innerHTML = `
      <input type="color" id="dec-doodle-color" value="#ff0000">
      <input type="range" id="dec-doodle-size" min="1" max="20" value="3">
    `;
    document.getElementById('dec-clear-doodle-btn').classList.remove('hidden');
  });

  document.getElementById('dec-eraser-btn').addEventListener('click', (e) => {
    deactivateAllDecTools();
    e.target.classList.add('active');
    appState.ui.activeTool = 'eraser';
    document.getElementById('board-container').classList.add('eraser-mode');
    document.getElementById('dec-clear-doodle-btn').classList.remove('hidden'); // allow clearing all still
    canvas.style.pointerEvents = 'auto'; // allow click on canvas to erase doodles
  });
  
  // Clear selected decoration when clicking on empty board
  document.getElementById('board-container').addEventListener('mousedown', (e) => {
    if (e.target.id === 'map' || e.target.id === 'board-container' || e.target.classList.contains('leaflet-container')) {
      if (selectedDecId !== null) {
        selectedDecId = null;
        renderDecorations();
      }
    }
  });

  document.getElementById('dec-clear-doodle-btn').addEventListener('click', () => {
    // Clear doodle from state
    const newDec = appState.decorations.filter(d => d.type !== 'doodle');
    updateState({ decorations: newDec });
    ctx.clearRect(0,0, canvas.width, canvas.height);
  });

  // Doodle Drawing events
  canvas.addEventListener('mousedown', (e) => {
    if(appState.ui.activeTool === 'doodle'){
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      
      const newDoodle = {
        id: generateId('D'),
        type: 'doodle',
        color: document.getElementById('dec-doodle-color').value,
        size: document.getElementById('dec-doodle-size').value,
        path: [[x,y]]
      };
      appState.decorations.push(newDoodle); // Add without save yet to avoid lag
    } else if (appState.ui.activeTool === 'eraser') {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      let toRemove = null;
      // Reverse loop to hit top-most drawing first
      for (let i = appState.decorations.length - 1; i >= 0; i--) {
        const dec = appState.decorations[i];
        if (dec.type === 'doodle' && dec.path && dec.path.length > 0) {
          ctx.beginPath();
          ctx.moveTo(dec.path[0][0], dec.path[0][1]);
          dec.path.forEach(pt => ctx.lineTo(pt[0], pt[1]));
          ctx.lineWidth = Math.max(10, dec.size || 3); // Make hit area larger for easier erasing
          if (ctx.isPointInStroke(x, y)) {
            toRemove = dec.id;
            break;
          }
        }
      }
      if (toRemove) {
        const newDec = appState.decorations.filter(d => d.id !== toRemove);
        updateState({ decorations: newDec });
        renderDecorations();
      }
    }
  });
  
  canvas.addEventListener('mousemove', (e) => {
    if(isDrawing && appState.ui.activeTool === 'doodle'){
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      ctx.lineTo(x, y);
      ctx.strokeStyle = document.getElementById('dec-doodle-color').value;
      ctx.lineWidth = document.getElementById('dec-doodle-size').value;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      const current = appState.decorations[appState.decorations.length - 1];
      current.path.push([x,y]);
    }
  });

  canvas.addEventListener('mouseup', () => {
    if(isDrawing && appState.ui.activeTool === 'doodle') {
      isDrawing = false;
      updateState({}, true); // force save
    }
  });
  canvas.addEventListener('mouseout', () => {
    if(isDrawing && appState.ui.activeTool === 'doodle') {
      isDrawing = false;
      updateState({}, true);
    }
  });
  
  // To allow click-through if not doodling or erasing
  setInterval(()=>{
    if(appState.ui.activeTool !== 'doodle' && appState.ui.activeTool !== 'eraser') {
      canvas.style.pointerEvents = 'none';
      document.getElementById('dec-clear-doodle-btn').classList.add('hidden');
    }
  }, 500);

};

export const renderDecorations = () => {
  const layer = document.getElementById('decoration-layer');
  layer.innerHTML = '';
  if(ctx) ctx.clearRect(0,0, canvas.width, canvas.height);
  
  appState.decorations.forEach(dec => {
    if(dec.type === 'doodle' && ctx) {
      if(!dec.path || dec.path.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(dec.path[0][0], dec.path[0][1]);
      dec.path.forEach(pt => ctx.lineTo(pt[0], pt[1]));
      ctx.strokeStyle = dec.color || '#ff0000';
      ctx.lineWidth = dec.size || 3;
      ctx.lineCap = 'round';
      ctx.stroke();
    } else if (dec.type === 'text' || dec.type === 'sticker' || dec.type === 'image') {
      const el = document.createElement('div');
      el.className = `dec-item ${dec.type}-dec`;
      if (selectedDecId === dec.id) el.classList.add('selected');
      el.style.left = dec.x + 'px';
      el.style.top = dec.y + 'px';
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'dec-content';
      
      const scale = dec.scale || 1;
      const rotation = dec.rotation || 0;
      contentDiv.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
      contentDiv.style.transformOrigin = 'center center';
      
      if(dec.type === 'text'){
        contentDiv.innerText = dec.content;
        contentDiv.style.color = dec.color;
        contentDiv.style.fontFamily = dec.fontFamily;
      } else if (dec.type === 'image') {
        const img = document.createElement('img');
        img.src = dec.content;
        contentDiv.appendChild(img);
      } else {
        contentDiv.innerText = dec.content;
        contentDiv.style.fontSize = '40px';
      }
      el.appendChild(contentDiv);
      
      // Add controls if selected
      if (selectedDecId === dec.id) {
        const controls = document.createElement('div');
        controls.className = 'dec-controls';
        controls.innerHTML = `
          <button data-action="scale-down" title="Perkecil">➖</button>
          <button data-action="scale-up" title="Perbesar">➕</button>
          <button data-action="rotate-left" title="Putar Kiri">⟲</button>
          <button data-action="rotate-right" title="Putar Kanan">⟳</button>
        `;
        
        controls.addEventListener('mousedown', (e) => {
          e.stopPropagation(); // prevent grabbing
        });
        
        controls.querySelectorAll('button').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = e.target.dataset.action;
            let currentScale = dec.scale || 1;
            let currentRot = dec.rotation || 0;
            
            if (action === 'scale-down') currentScale = Math.max(0.2, currentScale - 0.2);
            if (action === 'scale-up') currentScale += 0.2;
            if (action === 'rotate-left') currentRot -= 15;
            if (action === 'rotate-right') currentRot += 15;
            
            dec.scale = currentScale;
            dec.rotation = currentRot;
            updateState({}, true);
            renderDecorations();
          });
        });
        el.appendChild(controls);
      }
      
      // Dragging logic
      let isDragging = false;
      let startX, startY;
      
      el.addEventListener('mousedown', (e) => {
        if(appState.ui.activeTool === 'eraser') return;
        isDragging = true;
        startX = e.clientX - dec.x;
        startY = e.clientY - dec.y;
        e.stopPropagation();
        
        if (selectedDecId !== dec.id) {
          selectedDecId = dec.id;
          renderDecorations();
        }
      });
      
      window.addEventListener('mousemove', (e) => {
        if(!isDragging) return;
        dec.x = e.clientX - startX;
        dec.y = e.clientY - startY;
        el.style.left = dec.x + 'px';
        el.style.top = dec.y + 'px';
      });
      
      window.addEventListener('mouseup', () => {
        if(isDragging){
          isDragging = false;
          updateState({}, true);
        }
      });
      
      // Eraser click
      el.addEventListener('click', (e) => {
        if(appState.ui.activeTool === 'eraser') {
          e.stopPropagation();
          const newDec = appState.decorations.filter(d => d.id !== dec.id);
          updateState({ decorations: newDec });
          renderDecorations();
        }
      });
      
      layer.appendChild(el);
    }
  });
};
