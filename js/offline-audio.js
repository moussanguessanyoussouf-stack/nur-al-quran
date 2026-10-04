// Téléchargement et conservation des récitations hors-ligne (IndexedDB).
// Les clips sont stockés par récitateur + numéro global de verset ; un index
// « meta » retient les sourates complètes téléchargées (pour l'affichage/suppression).
import { DATA } from './data.js';

const DB_NAME = 'nur-audio';
const CLIPS = 'clips';   // clé : `${reciter}/${g}` -> Blob
const META = 'meta';     // clé : `${reciter}/${surah}` -> {reciter, surah, count, bytes}
const BASE = 'https://everyayah.com/data/';
const pad3 = (n) => String(n).padStart(3, '0');

let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(CLIPS)) d.createObjectStore(CLIPS);
      if (!d.objectStoreNames.contains(META)) d.createObjectStore(META);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

function tx(store, mode) { return db().then(d => d.transaction(store, mode).objectStore(store)); }
function reqP(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }

function clipKey(reciter, g) { return `${reciter}/${g}`; }
function metaKey(reciter, s) { return `${reciter}/${s}`; }
function ayahUrl(reciter, g) { const a = DATA.byGlobal.get(g); return a ? `${BASE}${reciter}/${pad3(a.s)}${pad3(a.a)}.mp3` : null; }

export async function hasClip(reciter, g) {
  try { const st = await tx(CLIPS, 'readonly'); return (await reqP(st.getKey(clipKey(reciter, g)))) !== undefined; }
  catch { return false; }
}

export async function getClipURL(reciter, g) {
  try {
    const st = await tx(CLIPS, 'readonly');
    const blob = await reqP(st.get(clipKey(reciter, g)));
    return blob ? URL.createObjectURL(blob) : null;
  } catch { return null; }
}

export async function isSurahDownloaded(reciter, s) {
  try { const st = await tx(META, 'readonly'); const m = await reqP(st.get(metaKey(reciter, s))); return !!m; }
  catch { return false; }
}

export async function downloadSurah(reciter, surah, onProgress) {
  const ayahs = DATA.bySurah.get(surah) || [];
  let bytes = 0, done = 0;
  for (const a of ayahs) {
    const key = clipKey(reciter, a.g);
    const st0 = await tx(CLIPS, 'readonly');
    const exists = (await reqP(st0.getKey(key))) !== undefined;
    if (!exists) {
      const res = await fetch(ayahUrl(reciter, a.g));
      if (!res.ok) throw new Error('Téléchargement échoué (' + res.status + ')');
      const blob = await res.blob();
      bytes += blob.size;
      const st = await tx(CLIPS, 'readwrite');
      await reqP(st.put(blob, key));
    }
    done++;
    if (onProgress) onProgress(done, ayahs.length);
  }
  const stm = await tx(META, 'readwrite');
  await reqP(stm.put({ reciter, surah, count: ayahs.length, bytes }, metaKey(reciter, surah)));
  return { count: ayahs.length, bytes };
}

let _cancel = false;
export function cancelDownload() { _cancel = true; }

// Télécharge TOUTES les sourates d'un récitateur (volumineux). Annulable.
export async function downloadReciter(reciter, onProgress) {
  _cancel = false;
  const surahs = DATA.surahs;
  const total = surahs.reduce((n, s) => n + s.cnt, 0);
  let done = 0;
  for (const s of surahs) {
    if (_cancel) break;
    await downloadSurah(reciter, s.n, (d) => { if (onProgress) onProgress(done + d, total, s.n); });
    done += s.cnt;
    if (onProgress) onProgress(done, total, s.n);
  }
  return { cancelled: _cancel, done, total };
}

export async function deleteReciter(reciter) {
  const list = await listDownloads();
  for (const m of list) if (m.reciter === reciter) await deleteSurah(reciter, m.surah);
}

export async function deleteSurah(reciter, surah) {
  const ayahs = DATA.bySurah.get(surah) || [];
  const st = await tx(CLIPS, 'readwrite');
  for (const a of ayahs) await reqP(st.delete(clipKey(reciter, a.g)));
  const stm = await tx(META, 'readwrite');
  await reqP(stm.delete(metaKey(reciter, surah)));
}

export async function listDownloads() {
  try {
    const st = await tx(META, 'readonly');
    const all = await reqP(st.getAll());
    return all || [];
  } catch { return []; }
}

export async function clearAll() {
  const st = await tx(CLIPS, 'readwrite'); await reqP(st.clear());
  const stm = await tx(META, 'readwrite'); await reqP(stm.clear());
}

export async function storageEstimate() {
  try { if (navigator.storage && navigator.storage.estimate) return await navigator.storage.estimate(); }
  catch {}
  return null;
}
