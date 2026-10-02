// Recherche : par référence (2:255), dans le texte arabe (sans vocalisation) et en français.
import { DATA } from './data.js';

// Diacritiques, signes coraniques, tatwîl, alef wasla…
const AR_MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ‌-‏]/g;

export function normalizeArabic(s) {
  if (!s) return '';
  return s
    .replace(AR_MARKS, '')
    .replace(/[آأإٱ]/g, 'ا') // آأإٱ -> ا
    .replace(/ى/g, 'ي')                      // ى -> ي
    .replace(/ة/g, 'ه')                      // ة -> ه
    .replace(/[ؤئ]/g, (m) => m === 'ؤ' ? 'و' : 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeLatin(s) {
  if (!s) return '';
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

let indexed = false;
function buildIndex() {
  if (indexed) return;
  for (const a of DATA.ayahs) {
    a._na = normalizeArabic(a.t);
    a._nf = normalizeLatin(a.f || '');
  }
  indexed = true;
}

const REF_RE = /^\s*(\d{1,3})\s*[:\. \-]\s*(\d{1,3})\s*$/;
const SURAH_RE = /^\s*(\d{1,3})\s*$/;

export function parseReference(q) {
  let m = q.match(REF_RE);
  if (m) {
    const s = +m[1], a = +m[2];
    const sur = DATA.surahByNum.get(s);
    if (sur && a >= 1 && a <= sur.cnt) return { s, a };
  }
  m = q.match(SURAH_RE);
  if (m) {
    const s = +m[1];
    if (DATA.surahByNum.has(s)) return { s, a: 1 };
  }
  return null;
}

export function search(query, limit = 200) {
  buildIndex();
  const ref = parseReference(query);
  if (ref) return { type: 'ref', ...ref };

  const qa = normalizeArabic(query);
  const qf = normalizeLatin(query);
  const hasAr = /[؀-ۿ]/.test(query);
  const results = [];

  for (const a of DATA.ayahs) {
    let hit = false;
    if (hasAr && qa && a._na.includes(qa)) hit = true;
    if (!hit && !hasAr && qf.length >= 2 && a._nf.includes(qf)) hit = true;
    if (hit) {
      results.push(a);
      if (results.length >= limit) break;
    }
  }
  return { type: 'text', query, qa, qf, hasAr, results };
}

// Met en évidence les correspondances dans la traduction française (texte brut -> HTML sûr).
export function highlightFrench(text, qf) {
  if (!qf) return escapeHTML(text);
  const norm = normalizeLatin(text);
  const idx = norm.indexOf(qf);
  if (idx < 0) return escapeHTML(text);
  // Correspondance approximative de position (normalisation conserve ~ la longueur)
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + qf.length);
  const after = text.slice(idx + qf.length);
  return escapeHTML(before) + '<mark>' + escapeHTML(match) + '</mark>' + escapeHTML(after);
}

function escapeHTML(s) {
  return s.replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
}
