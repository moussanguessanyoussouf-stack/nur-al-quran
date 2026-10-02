// Mémorisation (ḥifẓ) : répétition espacée (méthode de Leitner), objectifs, journal.
// HF-01, HF-03, HF-05. Le masquage (HF-02) est géré dans reader.js ; la vérification
// vocale (HF-04) réutilise le moteur du Lot 2.
import { DATA } from './data.js';
import { store } from './store.js';

const DAY = 86400000;
// Intervalles par boîte (en jours) : 0 = à (re)voir aujourd'hui
export const INTERVALS = [0, 1, 3, 7, 16, 35, 90];
export const MAX_BOX = INTERVALS.length - 1;

export function statusOf(item) {
  if (!item) return 'none';
  if (item.reps === 0) return 'new';          // nouveau
  if (item.box >= 4) return 'known';          // acquis
  return 'learning';                          // en cours
}

// Ajoute une liste de versets (numéros globaux) à la mémorisation.
export function addAyahs(globals) {
  let added = 0;
  for (const g of globals) if (store.hifzAdd(g)) added++;
  return added;
}

export function addSurah(s) { return addAyahs((DATA.bySurah.get(s) || []).map(a => a.g)); }
export function addRange(s, aFrom, aTo) {
  const lo = Math.min(aFrom, aTo), hi = Math.max(aFrom, aTo);
  const gs = (DATA.bySurah.get(s) || []).filter(a => a.a >= lo && a.a <= hi).map(a => a.g);
  return addAyahs(gs);
}
export function addPage(p) { return addAyahs((DATA.byPage.get(p) || []).map(a => a.g)); }
export function addJuz(j) { return addAyahs(DATA.ayahs.filter(a => a.j === j).map(a => a.g)); }

export function dueItems(now = Date.now()) {
  return Object.values(store.hifzAll())
    .filter(it => it.due <= now)
    .sort((a, b) => a.due - b.due || a.g - b.g);
}

// Évaluation d'une révision : 'again' (échec), 'good' (correct), 'easy' (facile).
export function grade(g, quality) {
  const it = store.hifzGet(g);
  if (!it) return;
  it.reps++;
  it.last = Date.now();
  if (quality === 'again') { it.box = Math.max(0, it.box - 2); it.lapses++; }
  else if (quality === 'good') { it.box = Math.min(MAX_BOX, it.box + 1); }
  else if (quality === 'easy') { it.box = Math.min(MAX_BOX, it.box + 2); }
  it.due = Date.now() + INTERVALS[it.box] * DAY;
  store.hifzSet(g, it);
  return it;
}

export function stats() {
  const items = Object.values(store.hifzAll());
  const now = Date.now();
  let neu = 0, learning = 0, known = 0;
  for (const it of items) {
    const st = statusOf(it);
    if (st === 'new') neu++; else if (st === 'known') known++; else learning++;
  }
  return {
    total: items.length,
    new: neu,
    learning,
    known,
    due: items.filter(it => it.due <= now).length,
  };
}

// Journal regroupé par sourate, avec statut par verset.
export function journal() {
  const bySurah = new Map();
  for (const it of Object.values(store.hifzAll())) {
    const a = DATA.byGlobal.get(it.g);
    if (!a) continue;
    if (!bySurah.has(a.s)) bySurah.set(a.s, []);
    bySurah.get(a.s).push({ g: it.g, a: a.a, status: statusOf(it), due: it.due });
  }
  for (const list of bySurah.values()) list.sort((x, y) => x.a - y.a);
  return [...bySurah.entries()].sort((a, b) => a[0] - b[0]).map(([s, items]) => ({ s, items }));
}
