// Persistance locale (localStorage) — réglages, position, repères, notes, surlignages, récents.
// Aucune donnée n'est envoyée à un tiers (exigence NF-12).

const KEY = 'nur-quran:v1';

const DEFAULTS = {
  theme: 'light',
  font: 'quran',          // 'quran' (Uthmani) | 'naskh'
  size: 2.0,              // rem
  lead: 2.2,              // interligne
  showTrans: true,        // traduction française
  showTranslit: false,    // translittération
  reciter: 'Alafasy_128kbps',
  rate: 1.0,
  position: { surah: 1, ayah: 1 },   // dernière position (LC-03)
  bookmarks: [],          // [globalAyahNumber]
  notes: {},              // { globalAyah: "texte" }
  highlights: {},         // { globalAyah: "#color" }
  recents: [],            // [{s,a,ts}] derniers emplacements visités
};

let data = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(DEFAULTS), ...parsed };
  } catch (e) {
    console.warn('Store: lecture impossible, valeurs par défaut.', e);
    return structuredClone(DEFAULTS);
  }
}

let saveTimer = null;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { console.warn('Store: écriture impossible.', e); }
  }, 150);
}

export const store = {
  get: (k) => data[k],
  all: () => data,
  set(k, v) { data[k] = v; persist(); },

  setPosition(s, a) {
    data.position = { surah: s, ayah: a };
    // journal des récents (dédupliqué par sourate)
    data.recents = data.recents.filter(r => r.s !== s);
    data.recents.unshift({ s, a, ts: Date.now() });
    data.recents = data.recents.slice(0, 20);
    persist();
  },

  isBookmarked: (g) => data.bookmarks.includes(g),
  toggleBookmark(g) {
    const i = data.bookmarks.indexOf(g);
    if (i >= 0) data.bookmarks.splice(i, 1); else data.bookmarks.push(g);
    persist();
    return i < 0;
  },

  getNote: (g) => data.notes[g] || '',
  setNote(g, text) {
    if (text && text.trim()) data.notes[g] = text.trim();
    else delete data.notes[g];
    persist();
  },

  getHighlight: (g) => data.highlights[g] || '',
  setHighlight(g, color) {
    if (color) data.highlights[g] = color; else delete data.highlights[g];
    persist();
  },

  exportJSON() {
    return JSON.stringify({
      bookmarks: data.bookmarks, notes: data.notes,
      highlights: data.highlights, position: data.position,
      exported: new Date().toISOString(),
    }, null, 2);
  },

  importJSON(obj) {
    if (obj.bookmarks) data.bookmarks = obj.bookmarks;
    if (obj.notes) data.notes = obj.notes;
    if (obj.highlights) data.highlights = obj.highlights;
    if (obj.position) data.position = obj.position;
    persist();
  },

  reset() { data = structuredClone(DEFAULTS); persist(); },
};
