// Line icons (24px grid, stroke = currentColor). Decorative unless a label is given.
const P = {
  train: '<path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12"/>',
  plans: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  progress: '<path d="M4 20h16M7 16v-5M12 16V5M17 16v-8"/>',
  body: '<circle cx="12" cy="7" r="3.2"/><path d="M5 20.5c1.2-4 4-6 7-6s5.8 2 7 6"/>',
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  check: '<path d="M5 12l4 4 10-10"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  more: '<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>',
  note: '<path d="M5 4h10l4 4v12H5z"/><path d="M14 4v5h5M8 13h8M8 17h5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  swap: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
  history: '<path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4"/><path d="M12 8v4l3 2"/>',
  plates: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/>',
  flame: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 1.6 1 2.5 2 3 0-3-1-5.5.5-8z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7"/>',
  pause: '<path d="M9 6v12M15 6v12"/>',
  timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 1.5M10 2.5h4"/>',
};

export const ic = (name, size = 20, label = '') =>
  `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${P[name] || ''}</svg>`;
