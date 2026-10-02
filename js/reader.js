// Rendu du Mushaf : sourate à l'écran, basmala, outils par verset, décorations.
import { DATA } from './data.js';
import { store } from './store.js';
import { splitArabic } from './words.js';
import * as tajweed from './tajweed.js';

const AR_DIGITS = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
export const toArabicDigits = (n) => String(n).split('').map(d => AR_DIGITS[+d] ?? d).join('');

const el = () => document.getElementById('reader');

export const reader = {
  rendered: 0,
  callbacks: { openSheet() {}, play() {}, toggleBookmark() {} },
};

function esc(s) {
  return s.replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
}

export function applyTypography() {
  const r = document.documentElement.style;
  r.setProperty('--ayah-size', store.get('size') + 'rem');
  r.setProperty('--ayah-leading', store.get('lead'));
  const fam = store.get('font') === 'naskh'
    ? "'Scheherazade New', 'Amiri', serif"
    : "'Amiri Quran', 'Amiri', serif";
  r.setProperty('--font-ar', fam);
}

export function renderSurah(num, opts = {}) {
  const sur = DATA.surahByNum.get(num);
  const ayahs = DATA.bySurah.get(num) || [];
  if (!sur) return;

  const showTrans = store.get('showTrans');
  const showTranslit = store.get('showTranslit');
  const wordMode = !!opts.wordMode;
  reader.wordMode = wordMode;
  // Tajwīd : actif seulement hors mode récitation et si les données sont chargées
  const tajweedMode = !wordMode && store.get('tajweed') && tajweed.isLoaded();

  let html = `
    <section class="surah-head">
      <div class="ar">${esc(sur.name)}</div>
      <div class="en">${esc(sur.en)} — « ${esc(sur.enm)} »</div>
      <div class="meta">${sur.rev === 'Meccan' ? 'Mecquoise' : 'Médinoise'} · ${sur.cnt} versets · sourate ${sur.n}</div>
    </section>`;

  if (sur.bism) {
    let bism = esc(DATA.meta.basmala);
    if (tajweedMode) {
      const bsmSeg = tajweed.segmentsFor(1, 1); // la basmala = Fātiḥa 1:1
      const col = tajweed.renderTajweed(bsmSeg);
      if (col) bism = col;
    }
    html += `<div class="basmala">${bism}</div>`;
  }

  for (const a of ayahs) {
    html += ayahHTML(a, { showTrans, showTranslit, wordMode, tajweedMode });
  }

  if (num < 114) {
    html += `<div class="empty-hint" id="next-surah" role="button" tabindex="0">▾ Sourate suivante : ${esc(DATA.surahByNum.get(num + 1).en)}</div>`;
  }

  el().innerHTML = html;
  reader.rendered = num;
  decorateAll();

  if (opts.scrollToAyah) {
    const node = document.getElementById('a-' + ayahGlobal(num, opts.scrollToAyah));
    if (node) node.scrollIntoView({ block: 'center' });
  } else {
    el().scrollIntoView({ block: 'start' });
    window.scrollTo(0, 0);
  }
  bindAyahEvents();
}

function ayahGlobal(s, a) {
  const x = (DATA.bySurah.get(s) || []).find(v => v.a === a);
  return x ? x.g : '';
}

function ayahHTML(a, { showTrans, showTranslit, wordMode, tajweedMode }) {
  const sajda = a.sj ? '<span class="ayah-sajda" title="Verset de prosternation">۩</span>' : '';
  let block = `<article class="ayah" id="a-${a.g}" data-g="${a.g}" data-s="${a.s}" data-a="${a.a}">`;
  let arabic;
  if (wordMode) {
    arabic = splitArabic(a.t).map((w, i) => `<span class="w" data-key="${a.g}:${i}">${esc(w)}</span>`).join(' ');
  } else if (tajweedMode) {
    arabic = tajweed.renderTajweed(tajweed.segmentsFor(a.s, a.a)) || esc(a.t);
  } else {
    arabic = esc(a.t);
  }
  block += `<div class="ayah-ar" dir="rtl">${arabic}<span class="ayah-num">${toArabicDigits(a.a)}</span>${sajda}</div>`;
  if (showTranslit && a.r) block += `<div class="ayah-translit">${esc(a.r)}</div>`;
  if (showTrans && a.f) block += `<div class="ayah-trans">${esc(a.f)}</div>`;
  block += `<div class="ayah-note" data-note></div>`;
  block += `<div class="ayah-tools">
      <button data-tool="play" aria-label="Écouter">${iconPlay()}Écouter</button>
      <button data-tool="bookmark" aria-label="Signet">${iconMark()}<span data-bm-label>Signet</span></button>
      <button data-tool="more" aria-label="Options">${iconMore()}Options</button>
    </div></article>`;
  return block;
}

const iconPlay = () => '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>';
const iconMark = () => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
const iconMore = () => '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';

function bindAyahEvents() {
  const container = el();
  container.querySelectorAll('.ayah').forEach(node => {
    const g = +node.dataset.g;
    node.querySelector('[data-tool="play"]').addEventListener('click', () => reader.callbacks.play(g));
    node.querySelector('[data-tool="bookmark"]').addEventListener('click', () => reader.callbacks.toggleBookmark(g));
    node.querySelector('[data-tool="more"]').addEventListener('click', () => reader.callbacks.openSheet(g));
  });
  const next = document.getElementById('next-surah');
  if (next) {
    const go = () => reader.callbacks.nextSurah && reader.callbacks.nextSurah();
    next.addEventListener('click', go);
    next.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }
}

// ---- Décorations (signets, surlignages, notes) ----
export function decorateAyah(g) {
  const node = document.getElementById('a-' + g);
  if (!node) return;
  // signet
  node.classList.toggle('bookmarked', store.isBookmarked(g));
  const bl = node.querySelector('[data-bm-label]');
  if (bl) bl.textContent = store.isBookmarked(g) ? 'Retirer' : 'Signet';
  // surlignage
  const hl = store.getHighlight(g);
  if (hl) { node.style.setProperty('--row-hl', hl); node.classList.add('has-hl'); }
  else { node.style.removeProperty('--row-hl'); node.classList.remove('has-hl'); }
  // note
  const note = store.getNote(g);
  const nn = node.querySelector('[data-note]');
  if (nn) { nn.textContent = note; nn.style.display = note ? 'block' : 'none'; }
}

export function decorateAll() {
  el().querySelectorAll('.ayah').forEach(n => decorateAyah(+n.dataset.g));
}

// ---- Surlignage de récitation ----
let lastPlaying = null;
export function setPlaying(g) {
  if (lastPlaying != null) {
    const p = document.getElementById('a-' + lastPlaying);
    if (p) p.classList.remove('playing');
  }
  lastPlaying = g;
  if (g == null) return;
  const node = document.getElementById('a-' + g);
  if (node) {
    node.classList.add('playing');
    node.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

// ---- Surlignage par mot (mode récitation guidée) ----
export function markWord(key, cls) {
  const el = document.querySelector(`.w[data-key="${key}"]`);
  if (el) el.classList.add(cls);
}
let currentWordKey = null;
export function setCurrentWord(key, scroll = true) {
  if (currentWordKey) {
    const prev = document.querySelector(`.w[data-key="${currentWordKey}"]`);
    if (prev) prev.classList.remove('w-current');
  }
  currentWordKey = key;
  if (!key) return;
  const el = document.querySelector(`.w[data-key="${key}"]`);
  if (el) {
    el.classList.add('w-current');
    if (scroll) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}
export function clearWordMarks() {
  currentWordKey = null;
  document.querySelectorAll('.w.w-matched, .w.w-omitted, .w.w-current')
    .forEach(e => e.classList.remove('w-matched', 'w-omitted', 'w-current'));
}
