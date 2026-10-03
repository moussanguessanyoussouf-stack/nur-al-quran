// Point d'entrée : orchestration de l'interface, navigation, audio, recherche, repères.
import { paintIcons, ICONS } from './icons.js';
import { store } from './store.js';
import { DATA, loadData, nav } from './data.js';
import { player, RECITERS } from './audio.js';
import { reader, renderSurah, renderPage, fitPage, applyTypography, decorateAyah, setPlaying, toArabicDigits,
         markWord, setCurrentWord, clearWordMarks,
         applyMask, clearMask, revealAllMasks, markHifz } from './reader.js';
import { search, highlightFrench } from './search.js';
import { createRecognizer, isSupported as sttSupported } from './recognizer.js';
import { Tracker } from './tracker.js';
import { loadTajweed, LEGEND as TAJWEED_LEGEND } from './tajweed.js';
import * as hifz from './hifz.js';
import * as stats from './stats.js';
import * as plans from './plans.js';

const $ = (id) => document.getElementById(id);
const $$ = (sel, r = document) => [...r.querySelectorAll(sel)];

let state = { surah: 0, topAyah: 1, sheetG: null, observer: null };
let recite = null; // session de récitation guidée en cours
let memo = null;   // session de masquage (mémorisation) : { surah, level }
let review = { queue: [], idx: 0 }; // session de révision espacée

// ========================================================================
// Démarrage
// ========================================================================
async function init() {
  paintIcons();
  applyTheme(store.get('theme'));
  applyTypography();

  try {
    await loadData(msg => { const s = $('splash-status'); if (s) s.textContent = msg; });
  } catch (e) {
    $('splash-status').innerHTML = 'Erreur de chargement du texte.<br><small>' + String(e.message || e) + '</small>';
    console.error(e);
    return;
  }

  buildSurahList();
  buildJumpControls();
  buildSettings();
  buildReciters();
  wireEvents();
  wireAudio();

  // Reprise à la dernière position (LC-03)
  const pos = store.get('position') || { surah: 1, ayah: 1 };
  goTo(pos.surah, pos.ayah, { scroll: true, silent: true });

  // Précharge le tajwīd si l'option était active
  if (store.get('tajweed')) {
    loadTajweed().then(() => { renderSurah(state.surah, { scrollToAyah: state.topAyah }); observeAyahs(); }).catch(() => {});
  }

  // Avertissement d'intégrité éventuel (AR-02)
  if (DATA.integrity.checked && !DATA.integrity.ok) {
    toast('⚠️ Avertissement : empreinte du texte non concordante.');
    openModal('integrity-modal');
  }

  const splash = $('splash');
  if (splash) {
    splash.classList.add('hide');
    setTimeout(() => splash.remove(), 500);
  }

  registerSW();
  startReadingClock();
}

// Compteur de temps de lecture (ST-02) : +15 s tant que l'onglet est visible.
function startReadingClock() {
  setInterval(() => {
    if (document.visibilityState === 'visible') stats.addSeconds(15);
  }, 15000);
}

// ========================================================================
// Thème & réglages
// ========================================================================
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const colors = { light: '#0f7b6c', dark: '#12140f', sepia: '#efe6d2' };
  const mt = document.querySelector('meta[name="theme-color"]');
  if (mt) mt.setAttribute('content', colors[t] || '#0f7b6c');
}

function buildSettings() {
  // Thème
  $$('#set-theme button').forEach(b => {
    b.classList.toggle('active', b.dataset.themeVal === store.get('theme'));
    b.onclick = () => {
      store.set('theme', b.dataset.themeVal); applyTheme(b.dataset.themeVal);
      $$('#set-theme button').forEach(x => x.classList.toggle('active', x === b));
    };
  });
  // Style d'écriture (select)
  const fontSel = $('set-font');
  fontSel.value = store.get('font');
  fontSel.onchange = () => { store.set('font', fontSel.value); applyTypography(); if (store.get('viewMode') === 'page') fitPage(); };
  // Mode d'affichage (flux / page)
  $$('#set-viewmode button').forEach(b => {
    b.classList.toggle('active', b.dataset.view === store.get('viewMode'));
    b.onclick = () => {
      store.set('viewMode', b.dataset.view);
      $$('#set-viewmode button').forEach(x => x.classList.toggle('active', x === b));
      if (b.dataset.view === 'page') { const a = DATA.bySurah.get(state.surah)?.find(x => x.a === state.topAyah); gotoPage(a ? a.p : 1); }
      else { state.surah = 0; goTo(store.get('position').surah, store.get('position').ayah, { scroll: true }); }
    };
  });
  // Taille
  const size = $('set-size'); size.value = store.get('size');
  $('val-size').textContent = store.get('size').toFixed(1);
  size.oninput = () => { store.set('size', +size.value); $('val-size').textContent = (+size.value).toFixed(1); applyTypography(); if (store.get('viewMode') === 'page') fitPage(); };
  // Interligne
  const lead = $('set-lead'); lead.value = store.get('lead');
  $('val-lead').textContent = store.get('lead').toFixed(1);
  lead.oninput = () => { store.set('lead', +lead.value); $('val-lead').textContent = (+lead.value).toFixed(1); applyTypography(); if (store.get('viewMode') === 'page') fitPage(); };
  // Traduction / translittération
  const tr = $('set-trans'); tr.checked = store.get('showTrans');
  tr.onchange = () => { store.set('showTrans', tr.checked); renderSurah(state.surah, { scrollToAyah: state.topAyah }); observeAyahs(); };
  const tl = $('set-translit'); tl.checked = store.get('showTranslit');
  tl.onchange = () => { store.set('showTranslit', tl.checked); renderSurah(state.surah, { scrollToAyah: state.topAyah }); observeAyahs(); };
  // Tajwīd (couleurs)
  const tj = $('set-tajweed'); tj.checked = store.get('tajweed');
  tj.onchange = async () => {
    store.set('tajweed', tj.checked);
    if (tj.checked) {
      toast('Chargement des règles de tajwīd…');
      try { await loadTajweed(); } catch { toast('Chargement des règles impossible.'); }
    }
    renderSurah(state.surah, { scrollToAyah: state.topAyah }); observeAyahs();
  };
  // Vitesse
  const rate = $('set-rate'); rate.value = store.get('rate');
  $('val-rate').textContent = '×' + store.get('rate').toFixed(2);
  rate.oninput = () => { store.set('rate', +rate.value); $('val-rate').textContent = '×' + (+rate.value).toFixed(2); player.setRate(+rate.value); };
  player.setRate(store.get('rate'));
}

function buildReciters() {
  const sel = $('set-reciter');
  sel.innerHTML = RECITERS.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
  sel.value = store.get('reciter');
  player.setReciter(store.get('reciter'));
  sel.onchange = () => { store.set('reciter', sel.value); player.setReciter(sel.value); };
}

// ========================================================================
// Navigation
// ========================================================================
function buildSurahList() {
  const ul = $('surah-list');
  ul.innerHTML = DATA.surahs.map(s => `
    <li><button data-surah="${s.n}">
      <span class="idx"><span>${s.n}</span></span>
      <span class="nm"><b>${escapeHTML(s.en)}</b><small>${s.rev === 'Meccan' ? 'Mecquoise' : 'Médinoise'} · ${s.cnt} v.</small></span>
      <span class="ar">${escapeHTML(s.name)}</span>
    </button></li>`).join('');
  ul.onclick = (e) => {
    const b = e.target.closest('[data-surah]'); if (!b) return;
    goTo(+b.dataset.surah, 1, { scroll: true }); closePanel('nav');
  };
  $('surah-filter').oninput = (e) => {
    const q = e.target.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    $$('#surah-list li').forEach(li => {
      const t = li.textContent.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      li.style.display = t.includes(q) ? '' : 'none';
    });
  };
}

function buildJumpControls() {
  $('jump-juz').innerHTML = Array.from({ length: 30 }, (_, i) =>
    `<option value="${i + 1}">Juzʾ ${i + 1}</option>`).join('');
  $('jump-hizb').innerHTML = Array.from({ length: 240 }, (_, i) => {
    const q = i + 1, hizb = Math.ceil(q / 4), quarter = ((q - 1) % 4) + 1;
    return `<option value="${q}">Ḥizb ${hizb} · quart ${quarter}</option>`;
  }).join('');
  $('jump-surah').innerHTML = DATA.surahs.map(s => `<option value="${s.n}">${s.n}. ${escapeHTML(s.en)}</option>`).join('');

  $('jump-go').onclick = () => {
    const tab = currentJumpField();
    if (tab === 'juz') { const a = nav.firstOfJuz(+$('jump-juz').value); goTo(a.s, a.a, { scroll: true }); }
    else if (tab === 'hizb') { const a = nav.firstOfHizbQuarter(+$('jump-hizb').value); goTo(a.s, a.a, { scroll: true }); }
    else if (tab === 'page') { const list = nav.page(+$('jump-page').value); if (list[0]) goTo(list[0].s, list[0].a, { scroll: true }); else toast('Page invalide'); }
    else { const s = +$('jump-surah').value, a = +$('jump-ayah').value || 1; goTo(s, a, { scroll: true }); }
    closePanel('nav');
  };
  // Le dernier champ modifié détermine l'action
  ['jump-juz','jump-hizb','jump-page','jump-surah','jump-ayah'].forEach(id => {
    $(id).addEventListener('focus', () => { lastJump = id.replace('jump-', ''); });
    $(id).addEventListener('input', () => { lastJump = id.replace('jump-', ''); });
  });
}
let lastJump = 'surah';
function currentJumpField() {
  if (lastJump === 'ayah') return 'surah';
  return lastJump;
}

// ========================================================================
// Aller à un emplacement
// ========================================================================
function gotoPage(p) {
  p = Math.min(604, Math.max(1, p | 0));
  if (recite) stopRecitation(false);
  if (memo) exitMemo();
  renderPage(p);
  const first = nav.page(p)[0];
  if (first) { state.surah = first.s; state.topAyah = first.a; updateTitle(first.s, first.a); store.setPosition(first.s, first.a); stats.recordPage(p); }
  store.set('page', p);
}

function goTo(surah, ayah = 1, opts = {}) {
  surah = nav.clampSurah(surah);
  if (recite && !opts.silent) stopRecitation(false); // fin propre de la récitation si l'on navigue
  if (memo && !opts.silent && memo.surah !== surah) exitMemo(); // sortie du masquage si l'on change de sourate
  if (store.get('viewMode') === 'page') {
    const a = (DATA.bySurah.get(surah) || []).find(x => x.a === ayah) || (DATA.bySurah.get(surah) || [])[0];
    gotoPage(a ? a.p : 1);
    return;
  }
  if (state.surah !== surah || opts.force) {
    renderSurah(surah, { scrollToAyah: opts.scroll ? ayah : null });
    state.surah = surah;
    observeAyahs();
  } else if (opts.scroll) {
    const g = ayahGlobal(surah, ayah);
    const node = $('a-' + g); if (node) node.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  state.topAyah = ayah;
  updateTitle(surah, ayah);
  if (!opts.silent) store.setPosition(surah, ayah);
  decorateHifz();
}

function decorateHifz() {
  for (const a of (DATA.bySurah.get(state.surah) || [])) {
    const it = store.hifzGet(a.g);
    if (it) markHifz(a.g, hifz.statusOf(it));
  }
}

function ayahGlobal(s, a) {
  const x = (DATA.bySurah.get(s) || []).find(v => v.a === a);
  return x ? x.g : null;
}

function updateTitle(surah, ayah) {
  const s = DATA.surahByNum.get(surah);
  if (!s) return;
  $('topbar-title').innerHTML = `<b>${escapeHTML(s.en)}</b><small>${escapeHTML(s.name)} · v. ${ayah}</small>`;
}

// Suivi du verset visible -> position & titre
function observeAyahs() {
  if (state.observer) state.observer.disconnect();
  state.observer = new IntersectionObserver((entries) => {
    const vis = entries.filter(e => e.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (vis) {
      const node = vis.target;
      const s = +node.dataset.s, a = +node.dataset.a;
      state.topAyah = a;
      updateTitle(s, a);
      store.setPosition(s, a);
      const ay = DATA.byGlobal.get(+node.dataset.g);
      if (ay) stats.recordPage(ay.p);
    }
  }, { rootMargin: '-80px 0px -60% 0px', threshold: 0 });
  $$('.ayah').forEach(n => state.observer.observe(n));
}

// ========================================================================
// Audio
// ========================================================================
function wireAudio() {
  player.on.change = (g) => {
    const a = DATA.byGlobal.get(g); const s = DATA.surahByNum.get(a.s);
    $('audiobar').hidden = false;
    $('audio-now').innerHTML = `<b>${escapeHTML(s.en)} ${a.s}:${a.a}</b><br><span>${RECITERS.find(r => r.id === player.reciter)?.name || ''}</span>`;
    if (store.get('viewMode') === 'page') {
      if (reader.pageNum !== a.p) { renderPage(a.p); state.surah = a.s; }
      setPlaying(g);
    } else {
      setPlaying(g);
      if (state.surah !== a.s) { renderSurah(a.s); state.surah = a.s; observeAyahs(); setPlaying(g); }
    }
  };
  player.on.state = (playing) => {
    $('au-play').innerHTML = playing ? ICONS.pause : ICONS.play;
  };
  player.on.time = (cur, dur) => {
    $('au-cur').textContent = fmt(cur);
    $('au-dur').textContent = fmt(dur);
    if (dur) $('au-seek').value = Math.round((cur / dur) * 1000);
  };
  player.on.stop = () => { setPlaying(null); $('au-play').innerHTML = ICONS.play; };

  $('au-play').onclick = () => { if (player.current == null) { const g = ayahGlobal(state.surah, state.topAyah); if (g) player.playAyah(g); } else player.toggle(); };
  $('au-next').onclick = () => player.next();
  $('au-prev').onclick = () => player.prev();
  $('au-repeat').onclick = () => openRepeat(player.current ?? ayahGlobal(state.surah, state.topAyah));
  $('au-seek').oninput = () => player.seekFraction(+$('au-seek').value / 1000);
}
const fmt = (s) => { s = Math.max(0, s | 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// ========================================================================
// Feuille d'action d'un verset
// ========================================================================
function openSheet(g) {
  state.sheetG = g;
  const a = DATA.byGlobal.get(g); const s = DATA.surahByNum.get(a.s);
  $('sheet-ref').textContent = `${s.en} · ${a.s}:${a.a}`;
  $('hl-colors').hidden = true;
  $('ayah-sheet').classList.add('open');
  $('scrim').classList.add('open');
}
function closeSheet() { $('ayah-sheet').classList.remove('open'); if (!anyPanelOpen()) $('scrim').classList.remove('open'); $('hl-colors').hidden = true; }

function wireSheet() {
  $('ayah-sheet').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const g = state.sheetG; if (g == null) return;
    const act = b.dataset.act;
    if (act === 'play') { player.playAyah(g); closeSheet(); }
    else if (act === 'repeat') { closeSheet(); openRepeat(g); }
    else if (act === 'bookmark') { const on = store.toggleBookmark(g); decorateAyah(g); toast(on ? 'Signet ajouté' : 'Signet retiré'); closeSheet(); }
    else if (act === 'note') { closeSheet(); openNote(g); }
    else if (act === 'copy') { copyAyah(g); closeSheet(); }
    else if (act === 'highlight') { $('hl-colors').hidden = !$('hl-colors').hidden; }
    else if (act === 'hifz') {
      if (store.hifzHas(g)) { store.hifzRemove(g); toast('Retiré de la mémorisation'); }
      else { store.hifzAdd(g); toast('Ajouté à la mémorisation'); }
      markHifz(g, hifz.statusOf(store.hifzGet(g)));
      closeSheet();
    }
    else if (act === 'tafsir') { showRepers(g); closeSheet(); }
    else if (act === 'close-sheet') { closeSheet(); }
  });
  $('hl-colors').addEventListener('click', (e) => {
    const b = e.target.closest('[data-hl]'); if (!b) return;
    store.setHighlight(state.sheetG, b.dataset.hl); decorateAyah(state.sheetG);
    toast(b.dataset.hl ? 'Surlignage appliqué' : 'Surlignage retiré'); closeSheet();
  });
}

async function copyAyah(g) {
  const a = DATA.byGlobal.get(g); const s = DATA.surahByNum.get(a.s);
  const txt = `${a.t}\n\n${a.f}\n— ${s.en} (${a.s}:${a.a})`;
  try { await navigator.clipboard.writeText(txt); toast('Copié'); }
  catch { toast('Copie impossible'); }
}

function showRepers(g) {
  const a = DATA.byGlobal.get(g);
  toast(`Juzʾ ${a.j} · Ḥizb ${Math.ceil(a.h / 4)} (quart ${((a.h - 1) % 4) + 1}) · Page ${a.p}${a.sj ? ' · prosternation' : ''}`);
}

// ========================================================================
// Répétition (boucle)
// ========================================================================
let repScope = 'ayah';
function openRepeat(g) {
  if (g == null) { toast('Choisissez d\'abord un verset'); return; }
  state.sheetG = g;
  const a = DATA.byGlobal.get(g);
  $('rep-from').value = a.a; $('rep-to').value = Math.min(a.a + 2, DATA.surahByNum.get(a.s).cnt);
  repScope = 'ayah';
  $$('#rep-scope button').forEach(x => x.classList.toggle('active', x.dataset.rep === 'ayah'));
  $('rep-range-row').style.display = 'none';
  const rc = $('rep-count'); rc.value = 3; $('val-rep').textContent = '3×';
  openModal('repeat-modal');
}
function wireRepeat() {
  $$('#rep-scope button').forEach(b => b.onclick = () => {
    repScope = b.dataset.rep;
    $$('#rep-scope button').forEach(x => x.classList.toggle('active', x === b));
    $('rep-range-row').style.display = (repScope === 'range' || repScope === 'cumul') ? '' : 'none';
  });
  $('rep-count').oninput = () => $('val-rep').textContent = $('rep-count').value + '×';
  $('rep-apply').onclick = () => {
    const g = state.sheetG; const a = DATA.byGlobal.get(g);
    const count = +$('rep-count').value;
    let from = g, to = g, mode = 'whole';
    if (repScope === 'range' || repScope === 'cumul') {
      const f = Math.max(1, +$('rep-from').value), t = Math.min(DATA.surahByNum.get(a.s).cnt, +$('rep-to').value);
      from = ayahGlobal(a.s, Math.min(f, t)); to = ayahGlobal(a.s, Math.max(f, t));
      if (repScope === 'cumul') mode = 'each'; // chaque verset répété N fois avant le suivant (HF-06)
    } else if (repScope === 'page') {
      const list = nav.page(a.p); from = list[0].g; to = list[list.length - 1].g;
    }
    player.playAyah(from, { from, to, count, mode });
    closeModal('repeat-modal');
    toast(repScope === 'cumul' ? `Cumul : chaque verset ×${count}` : `Boucle : ${count}× activée`);
  };
}

// ========================================================================
// Note
// ========================================================================
function openNote(g) {
  state.sheetG = g;
  const a = DATA.byGlobal.get(g); const s = DATA.surahByNum.get(a.s);
  $('note-title').textContent = `Note — ${s.en} ${a.s}:${a.a}`;
  $('note-text').value = store.getNote(g);
  openModal('note-modal');
  setTimeout(() => $('note-text').focus(), 100);
}
function wireNote() {
  $('note-save').onclick = () => { store.setNote(state.sheetG, $('note-text').value); decorateAyah(state.sheetG); closeModal('note-modal'); toast('Note enregistrée'); };
  $('note-delete').onclick = () => { store.setNote(state.sheetG, ''); decorateAyah(state.sheetG); closeModal('note-modal'); toast('Note supprimée'); };
}

// ========================================================================
// Repères (panneau)
// ========================================================================
function openBookmarks() {
  renderBookmarks('marks');
  $('bookmarks-panel').classList.add('open'); $('scrim').classList.add('open');
  closePanel('settings');
}
function renderBookmarks(tab) {
  $$('#bookmarks-panel [data-bmtab]').forEach(b => b.classList.toggle('active', b.dataset.bmtab === tab));
  const body = $('bookmarks-body');
  let items = [];
  if (tab === 'marks') items = store.get('bookmarks').map(g => ({ g }));
  else if (tab === 'notes') items = Object.keys(store.all().notes).map(g => ({ g: +g, note: store.all().notes[g] }));
  else items = store.get('recents').map(r => ({ g: ayahGlobal(r.s, r.a), ts: r.ts }));

  if (!items.length) { body.innerHTML = `<div class="empty-hint">Aucun élément pour l'instant.</div>`; return; }
  body.innerHTML = items.filter(x => x.g).map(x => {
    const a = DATA.byGlobal.get(x.g); const s = DATA.surahByNum.get(a.s);
    return `<div class="result" data-goto="${a.s}:${a.a}">
      <div class="ref">${escapeHTML(s.en)} · ${a.s}:${a.a}</div>
      <div class="ar" dir="rtl" style="font-size:1.3rem">${escapeHTML(a.t)}</div>
      ${x.note ? `<div class="fr">📝 ${escapeHTML(x.note)}</div>` : ''}
    </div>`;
  }).join('');
  body.onclick = (e) => {
    const r = e.target.closest('[data-goto]'); if (!r) return;
    const [s, a] = r.dataset.goto.split(':').map(Number);
    goTo(s, a, { scroll: true }); closePanel('bookmarks');
  };
}
function wireBookmarks() {
  $$('#bookmarks-panel [data-bmtab]').forEach(b => b.onclick = () => renderBookmarks(b.dataset.bmtab));
}

// ========================================================================
// Recherche
// ========================================================================
function openSearch() {
  $('search-panel').classList.add('open');
  setTimeout(() => $('search-input').focus(), 100);
}
function closeSearch() { $('search-panel').classList.remove('open'); }
let searchTimer = null;
function wireSearch() {
  $('search-close').onclick = closeSearch;
  $('search-input').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => runSearch(e.target.value), 180);
  });
  $('search-results').onclick = (e) => {
    const r = e.target.closest('[data-goto]'); if (!r) return;
    const [s, a] = r.dataset.goto.split(':').map(Number);
    goTo(s, a, { scroll: true }); closeSearch();
  };
}
function runSearch(q) {
  const box = $('search-results');
  if (!q || q.trim().length < 1) { box.innerHTML = `<div class="search-empty">Saisissez un mot arabe, un mot français, ou une référence comme « 2:255 ».</div>`; return; }
  const res = search(q.trim());
  if (res.type === 'ref') {
    const a = DATA.byGlobal.get(ayahGlobal(res.s, res.a)); const s = DATA.surahByNum.get(res.s);
    box.innerHTML = `<div class="result" data-goto="${res.s}:${res.a}">
      <div class="ref">Référence · ${escapeHTML(s.en)} ${res.s}:${res.a}</div>
      <div class="ar" dir="rtl">${escapeHTML(a.t)}</div>
      <div class="fr">${escapeHTML(a.f)}</div></div>`;
    return;
  }
  if (!res.results.length) { box.innerHTML = `<div class="search-empty">Aucun résultat pour « ${escapeHTML(q)} ».</div>`; return; }
  box.innerHTML = `<div style="font-size:.78rem;color:var(--muted);margin:.2rem .3rem .6rem">${res.results.length} résultat(s)${res.results.length >= 200 ? ' (affichage limité)' : ''}</div>` +
    res.results.map(a => {
      const s = DATA.surahByNum.get(a.s);
      return `<div class="result" data-goto="${a.s}:${a.a}">
        <div class="ref">${escapeHTML(s.en)} · ${a.s}:${a.a}</div>
        <div class="ar" dir="rtl">${escapeHTML(a.t)}</div>
        <div class="fr">${res.hasAr ? escapeHTML(a.f) : highlightFrench(a.f, res.qf)}</div>
      </div>`;
    }).join('');
}

// ========================================================================
// Panneaux / modales / scrim
// ========================================================================
const PANELS = { nav: 'nav-panel', settings: 'settings-panel', bookmarks: 'bookmarks-panel', hifz: 'hifz-panel', dash: 'dash-panel' };
function openPanel(name) { $(PANELS[name]).classList.add('open'); $('scrim').classList.add('open'); }
function closePanel(name) { $(PANELS[name]).classList.remove('open'); if (!anyPanelOpen() && !sheetOpen()) $('scrim').classList.remove('open'); }
function anyPanelOpen() { return Object.values(PANELS).some(id => $(id).classList.contains('open')); }
function sheetOpen() { return $('ayah-sheet').classList.contains('open'); }
function closeAllPanels() { Object.keys(PANELS).forEach(n => $(PANELS[n]).classList.remove('open')); closeSheet(); $('scrim').classList.remove('open'); }
function openModal(id) { $(id).classList.add('open'); }
function closeModal(id) { $(id).classList.remove('open'); }

// ========================================================================
// Câblage général
// ========================================================================
function wireEvents() {
  $('btn-menu').onclick = () => openPanel('nav');
  $('btn-settings').onclick = () => openPanel('settings');
  $('btn-search').onclick = openSearch;
  $('btn-focus').onclick = toggleFocus;
  $('focus-exit').onclick = toggleFocus;
  $('topbar-title').onclick = () => openPanel('nav');
  $('topbar-title').addEventListener('keydown', e => { if (e.key === 'Enter') openPanel('nav'); });

  $('scrim').onclick = closeAllPanels;
  $$('[data-close]').forEach(b => b.onclick = () => closePanel(b.dataset.close));
  $$('[data-close-modal]').forEach(b => b.onclick = () => closeModal(b.dataset.closeModal));

  // onglets navigation
  $$('[data-navtab]').forEach(b => b.onclick = () => {
    $$('[data-navtab]').forEach(x => x.classList.toggle('active', x === b));
    $('navtab-surah').classList.toggle('hidden', b.dataset.navtab !== 'surah');
    $('navtab-jump').classList.toggle('hidden', b.dataset.navtab !== 'jump');
  });

  $('open-bookmarks').onclick = openBookmarks;
  $('open-dash').onclick = openDash;
  $('open-hifz').onclick = openHifz;
  $('open-integrity').onclick = () => { renderIntegrity(); openModal('integrity-modal'); };
  $('open-about').onclick = () => openModal('about-modal');
  $('open-tajweed-legend').onclick = openTajweedLegend;

  // Callbacks du lecteur
  reader.callbacks.openSheet = openSheet;
  reader.callbacks.play = (g) => player.playAyah(g);
  reader.callbacks.toggleBookmark = (g) => { const on = store.toggleBookmark(g); decorateAyah(g); toast(on ? 'Signet ajouté' : 'Signet retiré'); };
  reader.callbacks.nextSurah = () => goTo(state.surah + 1, 1, { scroll: true });
  reader.callbacks.gotoPage = gotoPage;

  wireSheet(); wireRepeat(); wireNote(); wireBookmarks(); wireSearch(); wireRecite(); wireHifz(); wireDash();

  document.addEventListener('keydown', onKey);
  let resizeT = null;
  window.addEventListener('resize', () => {
    if (store.get('viewMode') !== 'page') return;
    clearTimeout(resizeT); resizeT = setTimeout(fitPage, 200);
  });
}

function toggleFocus() {
  document.body.classList.toggle('focus-mode');
  $('btn-focus').classList.toggle('active', document.body.classList.contains('focus-mode'));
}

function onKey(e) {
  if (e.target.matches('input, textarea, select')) return;
  if (e.key === 'Escape') { if (recite) stopRecitation(true); if (memo) exitMemo(); closeAllPanels(); closeSearch(); ['repeat-modal','note-modal','integrity-modal','about-modal','recite-consent','recite-review','tajweed-legend','review-modal'].forEach(closeModal); if (document.body.classList.contains('focus-mode')) toggleFocus(); }
  else if (e.key === ' ') { e.preventDefault(); $('au-play').click(); }
  else if (e.key === 'ArrowRight') player.prev && player.current != null && player.prev(); // RTL : droite = précédent
  else if (e.key === 'ArrowLeft') player.current != null && player.next();
  else if (e.key === '/') { e.preventDefault(); openSearch(); }
}

function renderIntegrity() {
  const I = DATA.integrity; const m = DATA.meta;
  $('integrity-status').innerHTML = I.ok
    ? `<div class="integrity ok">${ICONS.shield_ok} Texte vérifié — empreinte concordante.</div>`
    : `<div class="integrity bad">${ICONS.shield_bad} Empreinte NON concordante — texte possiblement altéré.</div>`;
  $('meta-table').innerHTML = `
    <tr><td>Source</td><td>${escapeHTML(m.source)}</td></tr>
    <tr><td>Lecture</td><td>${escapeHTML(m.reading)}</td></tr>
    <tr><td>Édition arabe</td><td>${escapeHTML(m.edition_ar)}</td></tr>
    <tr><td>Traduction</td><td>${escapeHTML(m.edition_fr)}</td></tr>
    <tr><td>Translittération</td><td>${escapeHTML(m.edition_tr)}</td></tr>
    <tr><td>Versets</td><td>${m.ayah_count} · ${m.surah_count} sourates</td></tr>
    <tr><td>SHA-256 attendu</td><td style="word-break:break-all;font-family:monospace;font-size:.7rem">${I.expected}</td></tr>
    <tr><td>SHA-256 calculé</td><td style="word-break:break-all;font-family:monospace;font-size:.7rem">${I.actual}</td></tr>`;
}

// ========================================================================
// Récitation guidée (Lot 2)
// ========================================================================
function openReciteConsent() {
  if (!sttSupported()) {
    toast('Reconnaissance vocale indisponible ici — essayez Chrome ou Edge.');
    return;
  }
  openModal('recite-consent');
}

function startRecitation() {
  closeModal('recite-consent');
  if (player.current != null) player.stop();

  const first = (DATA.bySurah.get(state.surah) || [])[0];
  const startG = ayahGlobal(state.surah, state.topAyah) || (first && first.g);

  renderSurah(state.surah, { wordMode: true });
  observeAyahs();

  const tracker = new Tracker(state.surah, startG);
  const recognizer = createRecognizer('ar-SA');
  recite = { recognizer, tracker, hesTimer: null, paused: false };

  tracker.on.word = (e) => markWord(e.key, 'w-matched');
  tracker.on.omit = (e) => markWord(e.key, 'w-omitted');
  tracker.on.current = (e) => setCurrentWord(e ? e.key : null);
  tracker.on.progress = (s) => { $('recite-progress').style.width = Math.round(s.progress * 100) + '%'; };

  recognizer.on.final = (txt) => { if (recite) recite.tracker.processFinal(txt); $('recite-interim').textContent = ''; };
  recognizer.on.interim = (txt) => { $('recite-interim').textContent = txt; };
  recognizer.on.state = (listening) => $('recite-mic').classList.toggle('listening', listening);
  recognizer.on.error = (code) => {
    if (code === 'not-allowed' || code === 'service-not-allowed') { toast('Accès au micro refusé.'); stopRecitation(false); }
    else if (code === 'unsupported') { toast('Non supporté sur ce navigateur.'); stopRecitation(false); }
    else if (code === 'start-failed') { /* relance gérée */ }
  };

  const cur = tracker.current;
  setCurrentWord(cur ? cur.key : null);

  $('recitebar').classList.add('open');
  $('btn-recite').classList.add('active');
  const sur = DATA.surahByNum.get(state.surah);
  $('recite-title').textContent = `Récitation — ${sur.en}`;
  $('recite-sub').textContent = 'Récitez à voix haute…';
  $('recite-progress').style.width = Math.round(tracker.summary().progress * 100) + '%';

  recognizer.start();

  recite.hesTimer = setInterval(() => {
    if (!recite || recite.paused) return;
    $('recite-sub').textContent = (Date.now() - recite.tracker.lastMatchTs > 9000)
      ? '⏸ En attente — reprenez au mot surligné.'
      : 'Écoute en cours…';
  }, 2000);
}

function toggleRecitePause() {
  if (!recite) return;
  if (recite.paused) {
    recite.paused = false; recite.recognizer.start();
    $('recite-sub').textContent = 'Écoute en cours…';
  } else {
    recite.paused = true; recite.recognizer.stop();
    $('recite-mic').classList.remove('listening');
    $('recite-sub').textContent = '⏸ En pause — touchez le micro pour reprendre.';
  }
}

function stopRecitation(showReview = true) {
  if (!recite) return;
  const tracker = recite.tracker;
  clearInterval(recite.hesTimer);
  try { recite.recognizer.stop(); } catch {}
  recite = null;
  $('recitebar').classList.remove('open');
  $('btn-recite').classList.remove('active');
  $('recite-mic').classList.remove('listening');
  $('recite-interim').textContent = '';
  const rev = tracker.review();
  clearWordMarks();
  renderSurah(state.surah, { scrollToAyah: state.topAyah });
  observeAyahs();
  if (showReview) showReciteReview(rev);
}

function showReciteReview(rev) {
  $('rv-progress').textContent = Math.round(rev.progress * 100) + '%';
  $('rv-accuracy').textContent = rev.cursor ? Math.round(rev.accuracy * 100) + '%' : '—';
  $('rv-omit').textContent = rev.omittedCount;
  $('rv-note').textContent = rev.omittedCount
    ? "Passages non reconnus (à vérifier — peut aussi provenir d'une reconnaissance imparfaite) :"
    : 'Aucun passage signalé.';
  $('rv-list').innerHTML = rev.ayahs.map(a => {
    const ay = DATA.byGlobal.get(a.g); const s = DATA.surahByNum.get(ay.s);
    return `<div class="ra" data-goto="${ay.s}:${ay.a}">
      <div class="ref">${escapeHTML(s.en)} ${ay.s}:${ay.a}</div>
      <div class="ww" dir="rtl">${a.words.map(escapeHTML).join(' ')}</div></div>`;
  }).join('');
  $('rv-list').onclick = (e) => {
    const r = e.target.closest('[data-goto]'); if (!r) return;
    const [s, a] = r.dataset.goto.split(':').map(Number);
    closeModal('recite-review'); goTo(s, a, { scroll: true });
  };
  openModal('recite-review');
}

function openTajweedLegend() {
  $('tajweed-legend-list').innerHTML = TAJWEED_LEGEND.map(x =>
    `<div class="legend-row"><span class="sw" style="background:var(--tj-${x.cat})"></span><span class="lab">${escapeHTML(x.label)}</span></div>`
  ).join('');
  openModal('tajweed-legend');
}

function wireRecite() {
  $('btn-recite').onclick = openReciteConsent;
  $('recite-begin').onclick = startRecitation;
  $('recite-mic').onclick = toggleRecitePause;
  $('recite-stop').onclick = () => stopRecitation(true);
}

// ========================================================================
// Mémorisation (ḥifẓ) — Lot 3
// ========================================================================
let hifzSelectReady = false;
function openHifz() {
  if (!hifzSelectReady) {
    $('hz-add-surah').innerHTML = DATA.surahs.map(s => `<option value="${s.n}">${s.n}. ${escapeHTML(s.en)}</option>`).join('');
    $('hz-add-surah').value = state.surah;
    hifzSelectReady = true;
  }
  refreshHifzDash();
  renderHifzJournal();
  closePanel('settings');
  openPanel('hifz');
}

function refreshHifzDash() {
  const st = hifz.stats();
  $('hz-new').textContent = st.new;
  $('hz-learn').textContent = st.learning;
  $('hz-known').textContent = st.known;
  $('hz-due').textContent = st.due;
  $('hz-review').disabled = st.due === 0;
  $('hz-review').style.opacity = st.due === 0 ? .5 : 1;
  $('hz-empty-hint').style.display = st.total ? 'none' : '';
  const lvl = store.get('maskLevel');
  $('hz-masklabel').textContent = ['Visible', 'Estompé', 'Masqué'][lvl] || '';
  $$('#hz-mask button').forEach(b => b.classList.toggle('active', +b.dataset.mask === lvl));
}

function renderHifzJournal() {
  const j = hifz.journal();
  const box = $('hifz-journal-list');
  if (!j.length) { box.innerHTML = `<div class="empty-hint">Aucun verset en mémorisation.</div>`; return; }
  box.innerHTML = j.map(group => {
    const s = DATA.surahByNum.get(group.s);
    const counts = { new: 0, learning: 0, known: 0 };
    group.items.forEach(i => counts[i.status]++);
    const first = group.items[0];
    return `<div class="journal-row" data-goto="${group.s}:${first.a}">
      <span class="dot ${counts.known === group.items.length ? 'known' : (counts.new === group.items.length ? 'new' : 'learning')}"></span>
      <span class="nm">${escapeHTML(s.en)}</span>
      <span class="cnt">${group.items.length} v. · ${counts.known} acquis</span>
    </div>`;
  }).join('');
  box.onclick = (e) => {
    const r = e.target.closest('[data-goto]'); if (!r) return;
    const [s, a] = r.dataset.goto.split(':').map(Number);
    goTo(s, a, { scroll: true }); closePanel('hifz');
  };
}

function wireHifz() {
  $$('#hifz-panel [data-hifztab]').forEach(b => b.onclick = () => {
    $$('#hifz-panel [data-hifztab]').forEach(x => x.classList.toggle('active', x === b));
    $('hifztab-dash').classList.toggle('hidden', b.dataset.hifztab !== 'dash');
    $('hifztab-add').classList.toggle('hidden', b.dataset.hifztab !== 'add');
    $('hifztab-journal').classList.toggle('hidden', b.dataset.hifztab !== 'journal');
    if (b.dataset.hifztab === 'journal') renderHifzJournal();
  });
  $$('#hz-mask button').forEach(b => b.onclick = () => { store.set('maskLevel', +b.dataset.mask); refreshHifzDash(); });

  $('hz-add-surah-btn').onclick = () => {
    const s = +$('hz-add-surah').value;
    const from = parseInt($('hz-from').value, 10);
    const to = parseInt($('hz-to').value, 10);
    let n;
    if (from) n = hifz.addRange(s, from, to || DATA.surahByNum.get(s).cnt);
    else n = hifz.addSurah(s);
    toast(`${n} verset(s) ajouté(s)`); refreshHifzDash(); decorateHifz();
  };
  $('hz-add-page').onclick = () => { const p = (DATA.bySurah.get(state.surah)?.find(a => a.a === state.topAyah) || {}).p; const n = hifz.addPage(p); toast(`${n} verset(s) ajouté(s)`); refreshHifzDash(); decorateHifz(); };
  $('hz-add-juz').onclick = () => { const a = DATA.bySurah.get(state.surah)?.find(x => x.a === state.topAyah); const n = hifz.addJuz(a ? a.j : 1); toast(`${n} verset(s) ajouté(s)`); refreshHifzDash(); decorateHifz(); };

  $('hz-start-current').onclick = () => { startMemo(state.surah); closePanel('hifz'); };
  $('hz-review').onclick = () => { closePanel('hifz'); startReview(); };

  // Barre de masquage
  $$('#memo-mask button').forEach(b => b.onclick = () => setMemoLevel(+b.dataset.mask));
  $('memo-peek').onclick = () => { revealAllMasks(true); setTimeout(() => revealAllMasks(false), 1600); };
  $('memo-exit').onclick = exitMemo;

  // Révision
  $('review-reveal').onclick = () => { $('review-ar').classList.remove('hidden-text'); $('review-grade').classList.remove('hidden'); $('review-reveal').classList.add('hidden'); };
  $('review-listen').onclick = () => { const g = review.queue[review.idx]; if (g) player.playAyah(g, { from: g, to: g, count: 1, mode: 'whole' }); };
  $$('#review-grade button').forEach(b => b.onclick = () => gradeCurrent(b.dataset.grade));
  $('review-modal').querySelector('[data-close-modal]').addEventListener('click', endReview);
}

// ---- Session de masquage ----
function startMemo(surah) {
  if (recite) stopRecitation(false);
  let inSurah = (DATA.bySurah.get(surah) || []).filter(a => store.hifzHas(a.g));
  if (!inSurah.length) { hifz.addSurah(surah); inSurah = DATA.bySurah.get(surah); toast('Sourate ajoutée à la mémorisation'); }
  renderSurah(surah, {}); observeAyahs(); decorateHifz();
  memo = { surah, level: store.get('maskLevel') || 2 };
  applyMemoMask();
  $('memobar').classList.add('open');
  $$('#memo-mask button').forEach(b => b.classList.toggle('active', +b.dataset.mask === memo.level));
}
function applyMemoMask() {
  const set = new Set((DATA.bySurah.get(memo.surah) || []).filter(a => store.hifzHas(a.g)).map(a => a.g));
  applyMask(set, memo.level);
}
function setMemoLevel(level) {
  if (!memo) return;
  memo.level = level; store.set('maskLevel', level);
  applyMemoMask();
  $$('#memo-mask button').forEach(b => b.classList.toggle('active', +b.dataset.mask === level));
}
function exitMemo() {
  if (!memo) return;
  memo = null; clearMask();
  $('memobar').classList.remove('open');
}

// ---- Session de révision espacée ----
function startReview() {
  const due = hifz.dueItems();
  if (!due.length) { toast('Rien à réviser pour l\'instant.'); return; }
  review = { queue: due.map(it => it.g), idx: 0 };
  showReviewCard();
  openModal('review-modal');
}
function showReviewCard() {
  const g = review.queue[review.idx];
  const a = DATA.byGlobal.get(g); const s = DATA.surahByNum.get(a.s);
  $('review-ref').textContent = `${s.en} · ${a.s}:${a.a}`;
  $('review-ar').textContent = a.t;
  $('review-ar').classList.add('hidden-text');
  $('review-fr').textContent = a.f;
  $('review-grade').classList.add('hidden');
  $('review-reveal').classList.remove('hidden');
  $('review-count').textContent = `${review.idx + 1} / ${review.queue.length}`;
}
function gradeCurrent(q) {
  const g = review.queue[review.idx];
  hifz.grade(g, q);
  markHifz(g, hifz.statusOf(store.hifzGet(g)));
  review.idx++;
  if (review.idx >= review.queue.length) { endReview(); toast('Révision terminée. Qu\'Allah facilite.'); }
  else showReviewCard();
}
function endReview() {
  closeModal('review-modal');
  if (player.current != null) player.stop();
  refreshHifzDash();
}

// ========================================================================
// Tableau de bord : statistiques, plans, données (Lot 4)
// ========================================================================
let dashPlanSelectReady = false;
function openDash() {
  if (!dashPlanSelectReady) {
    $('plan-template').innerHTML = plans.TEMPLATES.map(t => `<option value="${t.id}">${escapeHTML(t.name)}</option>`).join('');
    dashPlanSelectReady = true;
  }
  renderDashToday();
  renderPlansTab();
  closePanel('settings');
  openPanel('dash');
}

function renderDashToday() {
  const s = stats.summary();
  const pct = Math.min(100, Math.round((s.todayPages / s.goal) * 100));
  $('dash-ring').style.setProperty('--p', pct);
  $('dash-ring-num').textContent = s.todayPages;
  $('dash-goal-line').textContent = `${s.todayPages} / ${s.goal} page(s) aujourd'hui`;
  $('dash-encourage').textContent = s.goalMet
    ? 'Objectif atteint — qu\'Allah l\'agrée.'
    : (s.streak > 0 ? `Série de ${s.streak} jour(s), continuez.` : 'Commencez par une page, à votre rythme.');
  $('dash-streak').textContent = s.streak;
  $('dash-time').textContent = Math.round(s.todaySecs / 60) + ' min';
  $('dash-active').textContent = s.activeDays;

  const goal = store.get('goalPages') || 1;
  $('dash-goalrange').value = goal;
  $('dash-goalval').textContent = goal + ' p/j';

  // mini-graphe 14 jours
  const max = Math.max(1, ...s.last14.map(d => d.pages));
  const todayK = stats.todayKey();
  $('dash-chart').innerHTML = s.last14.map(d =>
    `<div class="bar ${d.pages ? 'has' : ''} ${d.key === todayK ? 'today' : ''}" style="height:${Math.round((d.pages / max) * 100)}%" title="${d.key} : ${d.pages} page(s)"></div>`
  ).join('');

  renderDashPlanCard();
  renderDashHifz();
}

function renderDashPlanCard() {
  const plan = plans.active();
  const body = $('dash-plan-body');
  if (!plan) { body.innerHTML = `<div style="font-size:.85rem;color:var(--text-soft)">Aucun plan actif. Créez-en un dans l'onglet « Plans ».</div>`; return; }
  const pr = plans.progress(plan);
  if (pr.finished) { body.innerHTML = `<b>Plan terminé 🎉</b><div class="plan-bar"><i style="width:100%"></i></div>`; return; }
  body.innerHTML = `
    <div style="font-size:.82rem;color:var(--text-soft)">${escapeHTML(plan.name)} — jour ${pr.done + 1}/${pr.total}
      ${pr.behind > 0 ? `<span class="behind-badge">· ${pr.behind} en retard</span>` : ''}</div>
    <div class="dash-plan-portion">Pages ${pr.next.from} → ${pr.next.to}</div>
    <div class="plan-bar"><i style="width:${pr.percent}%"></i></div>
    <div class="dash-row">
      <button class="btn primary" id="dash-plan-read">Lire</button>
      <button class="btn" id="dash-plan-done">Marquer fait</button>
    </div>`;
  $('dash-plan-read').onclick = () => { const list = nav.page(pr.next.from); if (list[0]) { goTo(list[0].s, list[0].a, { scroll: true }); closePanel('dash'); } };
  $('dash-plan-done').onclick = () => { plans.markNextDone(); renderDashToday(); renderPlansTab(); toast('Portion validée'); };
}

function renderDashHifz() {
  const st = hifz.stats();
  const body = $('dash-hifz-body');
  body.innerHTML = `
    <div style="font-size:.85rem;color:var(--text-soft)">${st.total} verset(s) · ${st.known} acquis · <b style="color:var(--danger)">${st.due} à réviser</b></div>
    ${st.due ? `<div class="dash-row"><button class="btn primary" id="dash-hifz-review">Réviser maintenant</button></div>` : ''}`;
  if (st.due) $('dash-hifz-review').onclick = () => { closePanel('dash'); startReview(); };
}

function renderPlansTab() {
  const plan = plans.active();
  const act = $('dash-active-plan');
  if (plan) {
    const pr = plans.progress(plan);
    act.innerHTML = `<div class="dash-card"><h3>Plan actif</h3>
      <b>${escapeHTML(plan.name)}</b>
      <div class="plan-bar"><i style="width:${pr.percent}%"></i></div>
      <div style="font-size:.8rem;color:var(--text-soft)">${pr.done}/${pr.total} portions · ${pr.percent}%</div></div>`;
  } else { act.innerHTML = ''; }

  const items = plans.all().items;
  const keys = Object.keys(items);
  $('plan-list').innerHTML = keys.length ? keys.map(id => {
    const p = items[id]; const pr = plans.progress(p);
    const active = plans.all().active === id;
    return `<div class="plan-item ${active ? 'active' : ''}">
      <div class="nm"><b>${escapeHTML(p.name)}</b><small>${pr.done}/${pr.total} · ${pr.percent}%</small></div>
      ${active ? '<span style="font-size:.72rem;color:var(--accent)">actif</span>' : `<button class="btn" data-activate="${id}" style="padding:.3rem .5rem">Activer</button>`}
      <button class="iconbtn" data-delplan="${id}" aria-label="Supprimer" style="width:36px;height:36px"></button>
    </div>`;
  }).join('') : `<div class="empty-hint">Aucun plan.</div>`;
  $('plan-list').querySelectorAll('[data-delplan]').forEach(b => b.innerHTML = ICONS.trash);
  $('plan-list').onclick = (e) => {
    const act = e.target.closest('[data-activate]'); const del = e.target.closest('[data-delplan]');
    if (act) { plans.setActive(act.dataset.activate); renderPlansTab(); renderDashToday(); }
    else if (del) { plans.remove(del.dataset.delplan); renderPlansTab(); renderDashToday(); toast('Plan supprimé'); }
  };
}

function wireDash() {
  $$('#dash-panel [data-dashtab]').forEach(b => b.onclick = () => {
    $$('#dash-panel [data-dashtab]').forEach(x => x.classList.toggle('active', x === b));
    $('dashtab-today').classList.toggle('hidden', b.dataset.dashtab !== 'today');
    $('dashtab-plans').classList.toggle('hidden', b.dataset.dashtab !== 'plans');
    $('dashtab-data').classList.toggle('hidden', b.dataset.dashtab !== 'data');
    if (b.dataset.dashtab === 'today') renderDashToday();
    if (b.dataset.dashtab === 'plans') renderPlansTab();
  });
  $('dash-goalrange').oninput = () => { store.set('goalPages', +$('dash-goalrange').value); $('dash-goalval').textContent = $('dash-goalrange').value + ' p/j'; renderDashToday(); };
  $('plan-create').onclick = () => { plans.createFromTemplate($('plan-template').value); renderPlansTab(); renderDashToday(); toast('Plan créé'); };
  $('plan-create-custom').onclick = () => { plans.createCustom(+$('plan-ppd').value || 1); renderPlansTab(); renderDashToday(); toast('Plan créé'); };

  // Données
  $('data-export').onclick = exportData;
  $('data-import').onclick = () => $('data-import-file').click();
  $('data-import-file').onchange = importData;
  $('data-delete').onclick = deleteAllData;
}

function exportData() {
  const blob = new Blob([store.exportAll()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `nur-al-quran-sauvegarde-${stats.todayKey()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Export généré');
}

function importData(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const obj = JSON.parse(reader.result);
      const merge = confirm('Fusionner avec vos données actuelles ?\n\nOK = fusionner · Annuler = remplacer');
      store.importAll(obj, { merge });
      toast('Données importées');
      renderDashToday(); renderPlansTab(); decorateHifz();
      renderSurah(state.surah, { scrollToAyah: state.topAyah }); observeAyahs();
    } catch (err) { toast('Fichier invalide'); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function deleteAllData() {
  if (!confirm('Supprimer définitivement toutes vos données locales (repères, notes, mémorisation, progression, plans) ?')) return;
  store.reset();
  if (window.caches) caches.keys().then(ks => ks.forEach(k => caches.delete(k)));
  toast('Données supprimées');
  setTimeout(() => location.reload(), 600);
}

// ========================================================================
// Service worker
// ========================================================================
function registerSW() {
  // Dans l'app native (Capacitor), les fichiers sont déjà embarqués : pas de service worker.
  if (globalThis.Capacitor && globalThis.Capacitor.isNativePlatform && globalThis.Capacitor.isNativePlatform()) return;
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW non enregistré', e));
  }
}

// ========================================================================
// Utilitaires
// ========================================================================
function escapeHTML(s) { return String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }
let toastTimer = null;
function toast(msg) {
  const box = $('toasts');
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

init();
