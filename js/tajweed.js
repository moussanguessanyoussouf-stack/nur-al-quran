// Affichage des règles de tajwīd en couleurs (aide indicative, activable/désactivable).
// Données annotées : Quran.com API v4 (uthmani_tajweed), transformées en segments.
// Chargement paresseux : le fichier n'est récupéré qu'à la première activation.

// Code de règle -> catégorie de couleur
const CAT = {
  m2: 'madd', m4: 'madd', mo: 'madd', m6: 'madd',
  gh: 'ghunna', ig: 'ghunna',
  ql: 'qalqala',
  ik: 'ikhfa', is: 'ikhfa',
  iq: 'iqlab',
  iw: 'idgham', im: 'idgham', it: 'idgham', ds: 'idgham',
  hw: 'silent', sl: 'silent', ls: 'silent',
};

export const LEGEND = [
  { cat: 'madd',    label: 'Prolongation (madd)' },
  { cat: 'ghunna',  label: 'Nasalisation (ghunna) / idghām avec ghunna' },
  { cat: 'qalqala', label: 'Qalqala (rebond)' },
  { cat: 'ikhfa',   label: 'Ikhfāʾ (dissimulation)' },
  { cat: 'idgham',  label: 'Idghām (assimilation)' },
  { cat: 'iqlab',   label: 'Iqlāb (substitution)' },
  { cat: 'silent',  label: 'Non prononcé (hamzat waṣl, lām solaire, lettre muette)' },
];

let cache = null;    // { "s:a": segments }
let loading = null;
let metaNote = '';

export async function loadTajweed() {
  if (cache) return cache;
  if (loading) return loading;
  loading = fetch('data/tajweed.json', { cache: 'force-cache' })
    .then(r => { if (!r.ok) throw new Error('tajweed HTTP ' + r.status); return r.json(); })
    .then(j => { cache = j.ayahs; metaNote = (j.meta && j.meta.note) || ''; return cache; })
    .finally(() => { loading = null; });
  return loading;
}

export function isLoaded() { return !!cache; }
export function note() { return metaNote; }
export function segmentsFor(s, a) { return cache ? cache[`${s}:${a}`] : null; }

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
}

// Rendu HTML coloré d'un tableau de segments (chaîne = brut ; [code,texte] = règle).
export function renderTajweed(segments) {
  if (!segments) return null;
  let html = '';
  for (const seg of segments) {
    if (Array.isArray(seg)) {
      const cat = CAT[seg[0]] || null;
      html += cat ? `<span class="tj tj-${cat}">${esc(seg[1])}</span>` : esc(seg[1]);
    } else {
      html += esc(seg);
    }
  }
  return html;
}
