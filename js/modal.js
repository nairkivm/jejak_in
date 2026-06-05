import { appState } from './state.js';

export const openModal = (modalId) => {
  document.getElementById('modal-container').classList.remove('hidden');
  document.querySelectorAll('.modal-content').forEach(el => el.classList.add('hidden'));
  document.getElementById(modalId).classList.remove('hidden');
};

export const closeAllModals = () => {
  document.getElementById('modal-container').classList.add('hidden');
  document.querySelectorAll('.modal-content').forEach(el => el.classList.add('hidden'));
  
  // Also close dynamic confirm modal if it's open
  const confirmModal = document.getElementById('confirm-modal');
  if (confirmModal) confirmModal.classList.add('hidden');
};

export const customAlert = (message) => {
  return new Promise((resolve) => {
    document.getElementById('confirm-title').innerText = "Informasi";
    document.getElementById('confirm-message').innerText = message;
    document.getElementById('confirm-cancel-btn').classList.add('hidden'); // Hide cancel button
    
    document.getElementById('confirm-ok-btn').innerText = "OK";
    document.getElementById('confirm-ok-btn').style.background = "var(--primary-color, #4a6fa5)";
    document.getElementById('confirm-ok-btn').style.borderColor = "var(--primary-color, #4a6fa5)";
    
    openModal('confirm-modal');
    
    document.getElementById('confirm-ok-btn').onclick = () => {
      closeAllModals();
      document.getElementById('confirm-cancel-btn').classList.remove('hidden'); // Reset for later
      resolve(true);
    };
  });
};

export const customConfirm = (message) => {
  return new Promise((resolve) => {
    document.getElementById('confirm-title').innerText = "Konfirmasi";
    document.getElementById('confirm-message').innerText = message;
    document.getElementById('confirm-cancel-btn').classList.remove('hidden');
    
    document.getElementById('confirm-ok-btn').innerText = "Ya, Lanjutkan";
    document.getElementById('confirm-ok-btn').style.background = "#cc0000";
    document.getElementById('confirm-ok-btn').style.borderColor = "#ff4444";
    
    openModal('confirm-modal');
    
    document.getElementById('confirm-ok-btn').onclick = () => {
      closeAllModals();
      resolve(true);
    };
    
    document.getElementById('confirm-cancel-btn').onclick = () => {
      closeAllModals();
      resolve(false);
    };
  });
};

const setupModalEvents = () => {
  // Close buttons
  document.querySelectorAll('.close-modal, .cancel-modal').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });

  // Escape key support
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });

  // Backdrop click
  document.querySelector('.modal-backdrop').addEventListener('click', closeAllModals);
};

setupModalEvents();

