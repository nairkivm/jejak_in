import { appState } from './state.js';
import { formatDate } from './utils.js';

export const renderTimeline = (onClueClick) => {
  const impreciseList = document.getElementById('timeline-imprecise-list');
  const track = document.getElementById('timeline-track');
  
  impreciseList.innerHTML = '';
  track.innerHTML = '';

  const clues = [...appState.clues];
  
  const impreciseClues = [];
  const preciseClues = [];

  clues.forEach(clue => {
    if (clue.date) {
      preciseClues.push(clue);
    } else {
      impreciseClues.push(clue);
    }
  });

  preciseClues.sort((a, b) => {
    const dtA = new Date(`${a.date}T${a.time || '00:00:00'}`).getTime();
    const dtB = new Date(`${b.date}T${b.time || '00:00:00'}`).getTime();
    return dtA - dtB;
  });

  const createClueCard = (clue) => {
    let thumbHtml = '';
    if (clue.image) {
      thumbHtml = `<img src="${clue.image}" class="clue-thumb" alt="thumb"/>`;
    } else {
      thumbHtml = `<div class="clue-thumb-placeholder"></div>`;
    }
    const html = `
      <div class="clue-note" style="position: static; transform: none;" data-id="${clue.id}">
        ${thumbHtml}
        <div class="clue-title-text">${clue.title}</div>
      </div>
    `;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const el = wrapper.firstElementChild;
    el.addEventListener('click', () => onClueClick(clue.id));
    return el;
  };

  impreciseClues.forEach(clue => {
    impreciseList.appendChild(createClueCard(clue));
  });

  preciseClues.forEach((clue, idx) => {
    const eventEl = document.createElement('div');
    eventEl.className = 'timeline-event';
    
    const dtStr = clue.time ? `${formatDate(clue.date)} ${clue.time}` : formatDate(clue.date);
    
    eventEl.innerHTML = `
      <div class="timeline-date" style="order: ${idx % 2 === 0 ? '-1' : '1'}">${dtStr}</div>
      <div class="timeline-dot"></div>
      <div class="card-wrapper"></div>
    `;
    
    eventEl.querySelector('.card-wrapper').appendChild(createClueCard(clue));
    
    if (idx % 2 === 0) {
      eventEl.style.justifyContent = 'flex-start';
      eventEl.style.marginTop = '-50px';
    } else {
      eventEl.style.justifyContent = 'flex-end';
      eventEl.style.marginBottom = '-50px';
    }

    track.appendChild(eventEl);
  });
};
