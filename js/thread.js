import { appState } from './state.js';
import { getMapInstance } from './map.js';

export const renderThreads = () => {
  const svg = document.getElementById('thread-layer');
  if (!svg) return;
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }
  
  if (appState.viewMode !== 'map') return;
  const map = getMapInstance();
  if (!map) return;

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  const validThreads = [];

  appState.redThreads.forEach(thread => {
    const clueA = appState.clues.find(c => c.id === thread.fromClueId);
    const clueB = appState.clues.find(c => c.id === thread.toClueId);
    if (!clueA || !clueB) return;

    // Convert latlng to pixel coords relative to map's layer pane (overlayPane)
    const ptA = map.latLngToLayerPoint(L.latLng(clueA.latitude, clueA.longitude));
    const ptB = map.latLngToLayerPoint(L.latLng(clueB.latitude, clueB.longitude));

    const startX = ptA.x;
    const startY = ptA.y;
    const endX = ptB.x;
    const endY = ptB.y;

    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx*dx + dy*dy);
    
    // Gravity effect sag based on distance
    const sag = Math.min(150, Math.max(40, distance * 0.25));
    
    const cp1X = startX + (dx * 0.2);
    const cp1Y = startY + (sag * 0.8);
    const cp2X = endX - (dx * 0.2);
    const cp2Y = endY + (sag * 0.8);

    minX = Math.min(minX, startX, endX, cp1X, cp2X);
    maxX = Math.max(maxX, startX, endX, cp1X, cp2X);
    minY = Math.min(minY, startY, endY, cp1Y, cp2Y);
    maxY = Math.max(maxY, startY, endY, cp1Y, cp2Y);

    validThreads.push({ id: thread.id, startX, startY, endX, endY, cp1X, cp1Y, cp2X, cp2Y });
  });

  if (validThreads.length === 0 || !isFinite(minX)) {
    svg.style.left = '0px';
    svg.style.top = '0px';
    svg.style.width = '0px';
    svg.style.height = '0px';
    svg.setAttribute('viewBox', '0 0 0 0');
    return;
  }

  // Padding to avoid clipping the 4px stroke or hover glow
  minX -= 30;
  minY -= 30;
  maxX += 30;
  maxY += 30;

  const width = Math.ceil(maxX - minX);
  const height = Math.ceil(maxY - minY);

  svg.style.left = `${minX}px`;
  svg.style.top = `${minY}px`;
  svg.style.width = `${width}px`;
  svg.style.height = `${height}px`;
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  validThreads.forEach(t => {
    // Translate coords so they are relative to the top-left of the viewBox
    const pathData = `M ${t.startX - minX} ${t.startY - minY} C ${t.cp1X - minX} ${t.cp1Y - minY}, ${t.cp2X - minX} ${t.cp2Y - minY}, ${t.endX - minX} ${t.endY - minY}`;
    
    // Invisible hit area
    const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitArea.setAttribute('d', pathData);
    hitArea.setAttribute('class', 'thread-hit-area');
    hitArea.style.stroke = 'transparent';
    hitArea.style.strokeWidth = '20';
    hitArea.style.fill = 'none';
    hitArea.style.pointerEvents = 'stroke';
    hitArea.style.cursor = 'pointer';
    hitArea.dataset.id = t.id;
    hitArea.addEventListener('click', (e) => {
       e.stopPropagation();
       window.dispatchEvent(new CustomEvent('threadClick', { detail: t.id }));
    });
    
    // The actual visible thread
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('class', 'thread-path');
    
    svg.appendChild(hitArea);
    svg.appendChild(path);
  });
};
