// Moteur d'alignement de la récitation (RV-01..03, RV-06).
// Pur et testable : reçoit des transcriptions (texte), les aligne sur la séquence
// de mots attendue, avance un curseur, détecte omissions / ajouts / reprises.
import { DATA } from './data.js';
import { normalizeArabic } from './search.js';
import { splitArabic } from './words.js';

const LOOKAHEAD = 6;   // tolérance de saut vers l'avant (mots omis / non reconnus)
const LOOKBACK = 4;    // tolérance de reprise (l'usager recommence)

// Distance de Levenshtein bornée (petits mots)
function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

function similar(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const d = lev(a, b);
  const L = Math.max(a.length, b.length);
  // tolérance ~1/3 de la longueur (erreurs de reconnaissance)
  return d <= Math.max(1, Math.floor(L / 3));
}

export function buildExpected(surahNum) {
  const out = [];
  for (const a of (DATA.bySurah.get(surahNum) || [])) {
    const words = splitArabic(a.t);
    words.forEach((w, i) => out.push({ key: `${a.g}:${i}`, g: a.g, s: a.s, aNum: a.a, wi: i, raw: w, norm: normalizeArabic(w) }));
  }
  return out;
}

export class Tracker {
  constructor(surahNum, startGlobal = null) {
    this.expected = buildExpected(surahNum);
    this.total = this.expected.length;
    this.state = new Array(this.total).fill(0); // 0 à venir, 1 reconnu, 2 omis
    this.cursor = 0;
    this.insertions = 0;
    this.matchedCount = 0;
    this.lastMatchTs = Date.now();
    this.restarted = false;
    if (startGlobal != null) {
      const idx = this.expected.findIndex(e => e.g === startGlobal);
      if (idx >= 0) this.cursor = idx;
    }
    this.on = { word() {}, omit() {}, current() {}, progress() {} };
    this.on.current(this.expected[this.cursor]);
  }

  get current() { return this.expected[this.cursor] || null; }

  _match(idx) {
    if (this.state[idx] !== 1) { this.state[idx] = 1; this.matchedCount++; }
    this.lastMatchTs = Date.now();
    this.on.word(this.expected[idx]);
  }
  _omit(idx) {
    if (this.state[idx] === 0) { this.state[idx] = 2; this.on.omit(this.expected[idx]); }
  }

  // Traite une transcription FINALE (chaîne) ; renvoie un résumé de l'avancée.
  processFinal(text) {
    const tokens = splitArabic(normalizeArabic(text));
    for (const t of tokens) this._consume(t);
    this.on.current(this.expected[this.cursor]);
    this.on.progress(this.summary());
    return this.summary();
  }

  _consume(t) {
    // Recherche vers l'avant
    for (let k = 0; k <= LOOKAHEAD; k++) {
      const idx = this.cursor + k;
      if (idx >= this.total) break;
      if (similar(t, this.expected[idx].norm)) {
        for (let j = this.cursor; j < idx; j++) this._omit(j);
        this._match(idx);
        this.cursor = idx + 1;
        return true;
      }
    }
    // Recherche vers l'arrière (reprise / recommencement)
    for (let k = 1; k <= LOOKBACK; k++) {
      const idx = this.cursor - k;
      if (idx < 0) break;
      if (similar(t, this.expected[idx].norm)) {
        this._match(idx);
        this.cursor = idx + 1;
        this.restarted = true;
        return true;
      }
    }
    // Sinon : mot en trop / mal reconnu (toléré)
    this.insertions++;
    return false;
  }

  summary() {
    return {
      total: this.total,
      cursor: this.cursor,
      matched: this.matchedCount,
      insertions: this.insertions,
      progress: this.total ? this.cursor / this.total : 0,
      accuracy: this.cursor ? this.matchedCount / this.cursor : 1,
    };
  }

  // Relevé de fin de séance (RV-06) : passages non reconnus, regroupés par verset.
  review() {
    const omitted = [];
    for (let i = 0; i < this.cursor; i++) {
      if (this.state[i] === 2) omitted.push(this.expected[i]);
    }
    const byAyah = new Map();
    for (const w of omitted) {
      if (!byAyah.has(w.g)) byAyah.set(w.g, []);
      byAyah.get(w.g).push(w.raw);
    }
    return {
      ...this.summary(),
      omittedCount: omitted.length,
      ayahs: [...byAyah.entries()].map(([g, words]) => ({ g, words })),
    };
  }
}
