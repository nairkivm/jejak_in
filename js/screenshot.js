import { customAlert } from './modal.js';

export const setupScreenshot = () => {
  document.getElementById('tool-screenshot').addEventListener('click', async () => {
    const stage = document.getElementById('game-scene');
    if (!stage) return;
    
    // Hide UI elements that shouldn't be in the photo
    const searchPanel = document.getElementById('location-search-panel');
    const decPanel = document.getElementById('decoration-panel');
    
    if(searchPanel) searchPanel.classList.add('hidden');
    if(decPanel) decPanel.classList.add('hidden');
    
    document.body.classList.add('taking-screenshot');
    stage.classList.add('screenshot-mode');

    // Wait a bit to ensure the browser repaints without the UI before taking the screenshot
    await new Promise(r => setTimeout(r, 150));

    // FIX SVG FOR HTML2CANVAS
    const svg = document.getElementById('thread-layer');
    let svgImg = null;
    let originalSvgDisplay = '';
    
    if (svg && svg.childNodes.length > 0) {
      const clonedSvg = svg.cloneNode(true);
      if(!clonedSvg.getAttribute('xmlns')) clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      
      const styleStr = `
        .thread-path {
          fill: none;
          stroke: #d32f2f;
          stroke-width: 4px;
          stroke-linecap: round;
        }
      `;
      const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleEl.textContent = styleStr;
      clonedSvg.prepend(styleEl);

      const xml = new XMLSerializer().serializeToString(clonedSvg);
      const b64 = window.btoa(unescape(encodeURIComponent(xml)));
      svgImg = document.createElement('img');
      svgImg.src = 'data:image/svg+xml;base64,' + b64;
      svgImg.style.position = 'absolute';
      svgImg.style.left = svg.style.left;
      svgImg.style.top = svg.style.top;
      svgImg.style.width = svg.style.width;
      svgImg.style.height = svg.style.height;
      svgImg.style.zIndex = '450';
      svgImg.style.pointerEvents = 'none';

      svg.parentNode.insertBefore(svgImg, svg);
      originalSvgDisplay = svg.style.display;
      svg.style.display = 'none';
      
      // Explicitly wait for img to load to guarantee html2canvas sees it
      await new Promise(r => {
        svgImg.onload = r;
        svgImg.onerror = r;
      });
    }

    // Give time for classes to apply
    await new Promise(r => setTimeout(r, 50));

    try {
      const canvas = await html2canvas(stage, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#11100f', // --bg-dark
        scale: Math.min(2, window.devicePixelRatio || 1),
        ignoreElements: (el) => el.classList?.contains("modal-container")
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Download
      const link = document.createElement('a');
      link.download = `Jejak_in_${Date.now()}.png`;
      link.href = imgData;
      link.click();
      
    } catch(err) {
      console.error("Screenshot error:", err);
      customAlert("Terjadi kesalahan saat mengambil screenshot. Mungkin ada gambar cross-origin yang tidak dapat dirender.");
    } finally {
      // Restore UI elements
      if(searchPanel) {
        searchPanel.classList.remove('hidden');
      }
      
      document.body.classList.remove('taking-screenshot');
      stage.classList.remove('screenshot-mode');
      
      if (svgImg) {
        svgImg.remove();
      }
      if (svg) {
        svg.style.display = originalSvgDisplay;
      }
    }
  });
};
