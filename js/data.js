// Chargement du corpus + contrôle d'intégrité (ED-02, AR-01/AR-02).
import { sha256hex } from './sha256.js';

export const DATA = {
  meta: null,
  surahs: [],         // métadonnées des 114 sourates
  ayahs: [],          // 6236 versets dans l'ordre
  byGlobal: new Map(),// g -> ayah
  bySurah: new Map(), // s -> [ayahs]
  byPage: new Map(),  // p -> [ayahs]
  surahByNum: new Map(),
  integrity: { checked: false, ok: false, expected: '', actual: '' },
};

async function fetchJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

export async function loadData(onStatus = () => {}) {
  onStatus('Chargement des sourates…');
  const s = await fetchJSON('data/surahs.json');
  DATA.meta = s.meta;
  DATA.surahs = s.surahs;
  s.surahs.forEach(x => DATA.surahByNum.set(x.n, x));

  onStatus('Chargement du texte coranique…');
  const q = await fetchJSON('data/quran.json');
  DATA.ayahs = q.ayahs;

  for (const a of q.ayahs) {
    DATA.byGlobal.set(a.g, a);
    if (!DATA.bySurah.has(a.s)) DATA.bySurah.set(a.s, []);
    DATA.bySurah.get(a.s).push(a);
    if (!DATA.byPage.has(a.p)) DATA.byPage.set(a.p, []);
    DATA.byPage.get(a.p).push(a);
  }

  onStatus('Vérification de l\'intégrité du texte…');
  await verifyIntegrity(q);
  return DATA;
}

async function verifyIntegrity(q) {
  // Reproduit exactement le calcul de génération : concat( texte + "\n" ) en UTF-8, SHA-256.
  const concat = q.ayahs.map(a => a.t + '\n').join('');
  const bytes = new TextEncoder().encode(concat);
  let actual = '';
  try {
    if (globalThis.crypto && crypto.subtle && isSecure()) {
      const buf = await crypto.subtle.digest('SHA-256', bytes);
      actual = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      actual = sha256hex(bytes);
    }
  } catch {
    actual = sha256hex(bytes);
  }
  const expected = (q.meta && q.meta.sha256_ar) || (DATA.meta && DATA.meta.sha256_ar) || '';
  DATA.integrity = { checked: true, ok: actual === expected, expected, actual };
  if (!DATA.integrity.ok) {
    console.error('Intégrité : empreinte non concordante.', DATA.integrity);
  }
  return DATA.integrity;
}

function isSecure() {
  return globalThis.isSecureContext === true ||
    ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
}

// ---- Helpers de navigation ----
export const nav = {
  surah: (n) => DATA.bySurah.get(n) || [],
  ayah: (s, a) => (DATA.bySurah.get(s) || []).find(x => x.a === a),
  page: (p) => DATA.byPage.get(p) || [],
  firstOfJuz(j) { return DATA.ayahs.find(x => x.j === j) || DATA.ayahs[0]; },
  firstOfHizbQuarter(h) { return DATA.ayahs.find(x => x.h === h) || DATA.ayahs[0]; },
  clampSurah: (n) => Math.min(114, Math.max(1, n | 0)),
  totalSurahs: 114,
};
