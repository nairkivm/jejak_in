import { openModal } from './modal.js';

export const setupGuide = () => {
  const guideBtn = document.getElementById('guide-btn');
  const guideModal = document.getElementById('guide-modal');
  const guideContent = document.getElementById('guide-content');
  const menuBtns = document.querySelectorAll('.guide-menu-btn');

  if (!guideBtn || !guideModal || !guideContent) return;

  const loadGuide = async (filename) => {
    try {
      guideContent.innerHTML = 'Memuat panduan...';
      let response = await fetch(`/guides/${filename}`);
      if (!response.ok) {
        // Fallback or retry with different path if served natively by vite
        response = await fetch(`/public/guides/${filename}`);
        if (!response.ok) throw new Error('Network response was not ok');
      }
      const text = await response.text();
      renderMarkdown(text);
    } catch (error) {
      console.error('Failed to load guide:', error);
      guideContent.innerHTML = `<p style="color:red">Gagal memuat panduan. Pastikan file ada di public/guides/${filename}</p>`;
    }
  };

  const renderMarkdown = (text) => {
    if (window.marked && window.marked.parse) {
      guideContent.innerHTML = window.marked.parse(text);
    } else {
      guideContent.innerHTML = text.replace(/\n/g, '<br>');
    }
  };

  guideBtn.addEventListener('click', () => {
    openModal('guide-modal');
    // Load default if not loaded
    const activeBtn = document.querySelector('.guide-menu-btn.active');
    if (activeBtn) {
      loadGuide(activeBtn.dataset.file);
    }
  });

  menuBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      menuBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      loadGuide(e.target.dataset.file);
    });
  });
};
