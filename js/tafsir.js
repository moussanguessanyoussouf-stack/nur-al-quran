// Tafsir (exégèse) à la demande, depuis l'API ouverte tafsir_api (spa5k), mise en cache.
// Ibn Kathir n'existe pas en français dans les sources libres : le tafsir français fourni
// est « Al-Mukhtasar » (Le Résumé, fiable) ; Ibn Kathir est proposé en arabe et en anglais.

export const TAFSIRS = [
  { slug: 'french-mokhtasar',    name: 'Al-Mukhtasar (Le Résumé)', lang: 'fr' },
  { slug: 'ar-tafsir-ibn-kathir', name: 'Ibn Kathîr', lang: 'ar' },
  { slug: 'en-tafisr-ibn-kathir', name: 'Ibn Kathîr (anglais)', lang: 'en' },
  { slug: 'ar-tafsir-as-saadi',  name: 'As-Saʿdî', lang: 'ar' },
  { slug: 'ar-tafsir-al-tabari', name: 'Aṭ-Ṭabarî', lang: 'ar' },
  { slug: 'ar-tafseer-al-qurtubi', name: 'Al-Qurṭubî', lang: 'ar' },
  { slug: 'ar-tafsir-muyassar',  name: 'Al-Muyassar', lang: 'ar' },
  { slug: 'en-al-jalalayn',      name: 'Al-Jalâlayn (anglais)', lang: 'en' },
];

const BASE = 'https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/';
const cache = new Map(); // `${slug}/${s}/${a}` -> text

export function editionDir(slug) {
  const e = TAFSIRS.find(t => t.slug === slug);
  return e && e.lang === 'ar' ? 'rtl' : 'ltr';
}
export function editionName(slug) {
  const e = TAFSIRS.find(t => t.slug === slug);
  return e ? e.name : slug;
}

export async function fetchTafsir(slug, s, a) {
  const key = `${slug}/${s}/${a}`;
  if (cache.has(key)) return cache.get(key);
  const res = await fetch(`${BASE}${slug}/${s}/${a}.json`, { cache: 'force-cache' });
  if (!res.ok) throw new Error('Tafsir indisponible (' + res.status + ')');
  const j = await res.json();
  let text = (j && j.text) || '';
  // Nettoyage léger d'éventuelles balises HTML
  text = text.replace(/<[^>]+>/g, ' ').replace(/\s+\n/g, '\n').trim();
  cache.set(key, text);
  return text;
}
