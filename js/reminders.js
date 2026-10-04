// Rappels de lecture (notifications locales) — application native (Capacitor).
// Niveaux : 'min' (2/j), 'moy' (3/j), 'imp' (~ toutes les 3 h, calées sur les prières).
// Les horaires de prière sont calculés avec adhan-js à partir de la position.
// Sur le web (sans Capacitor), ce module ne fait rien.
import { store } from './store.js';
import { goalsStatus } from './stats.js';

function cap() { return globalThis.Capacitor; }
function isNative() { return !!(cap() && cap().isNativePlatform && cap().isNativePlatform()); }
function LN() { return cap() && cap().Plugins ? cap().Plugins.LocalNotifications : null; }
function GEO() { return cap() && cap().Plugins ? cap().Plugins.Geolocation : null; }

let adhanP = null;
async function loadAdhan() {
  if (adhanP) return adhanP;
  adhanP = import('https://cdn.jsdelivr.net/npm/adhan@4.4.3/+esm').catch(() => null);
  return adhanP;
}

async function getCoords() {
  const saved = store.get('location');
  if (saved && saved.lat != null) return saved;
  const geo = GEO();
  if (geo) {
    try {
      await geo.requestPermissions?.();
      const pos = await geo.getCurrentPosition({ timeout: 8000, enableHighAccuracy: false });
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      store.set('location', c);
      return c;
    } catch {}
  }
  return null;
}

function at(date, h, m) { const d = new Date(date); d.setHours(h, m, 0, 0); return d; }

async function prayerSlots(date, coords) {
  const adhan = await loadAdhan();
  if (!adhan || !coords) return null;
  try {
    const c = new adhan.Coordinates(coords.lat, coords.lng);
    const params = adhan.CalculationMethod.MuslimWorldLeague();
    const pt = new adhan.PrayerTimes(c, date, params);
    // ~20 min après chaque prière (hors Shurûq)
    return [pt.fajr, pt.dhuhr, pt.asr, pt.maghrib, pt.isha]
      .map(t => new Date(t.getTime() + 20 * 60000));
  } catch { return null; }
}

async function dayTimes(level, date, coords) {
  if (level === 'imp') {
    const pr = await prayerSlots(date, coords);
    if (pr) return pr;
    return [8, 11, 14, 17, 20].map(h => at(date, h, 0)); // repli : ~ toutes les 3 h
  }
  if (level === 'moy') return [at(date, 8, 0), at(date, 13, 0), at(date, 19, 0)];
  return [at(date, 9, 0), at(date, 20, 0)]; // 'min'
}

function body() {
  const g = store.get('goalPages') || 1;
  return `Pensez à votre lecture du Coran aujourd'hui. Objectif : ${g} page(s). Qu'Allah facilite.`;
}

const DAYS_AHEAD = 7;
function idFor(dayOffset, slot) { return 1000 + dayOffset * 10 + slot; }

export async function schedule() {
  if (!isNative()) return;
  const ln = LN(); if (!ln) return;
  try { const p = await ln.requestPermissions(); if (p && p.display && p.display !== 'granted') return; } catch {}
  if (!store.get('notify')) { await cancelAll(); return; }

  const level = store.get('objLevel') || 'min';
  const coords = level === 'imp' ? await getCoords() : null;
  const now = Date.now();
  const notifications = [];
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const date = new Date(); date.setDate(date.getDate() + d);
    const times = await dayTimes(level, date, coords);
    times.forEach((t, i) => {
      if (t.getTime() > now + 60000) {
        notifications.push({ id: idFor(d, i), title: 'Nûr al-Qur\'ân', body: body(), schedule: { at: t }, channelId: 'rappels' });
      }
    });
  }
  try {
    await cancelAll();
    if (ln.createChannel) { try { await ln.createChannel({ id: 'rappels', name: 'Rappels de lecture', importance: 4 }); } catch {} }
    if (notifications.length) await ln.schedule({ notifications });
  } catch (e) { /* ignore */ }
}

export async function cancelAll() {
  const ln = LN(); if (!ln) return;
  const ids = [];
  for (let d = 0; d < DAYS_AHEAD; d++) for (let i = 0; i < 6; i++) ids.push({ id: idFor(d, i) });
  try { await ln.cancel({ notifications: ids }); } catch {}
}

// Annule les rappels restants d'aujourd'hui (appelé quand l'objectif du jour est atteint).
export async function cancelTodayRemaining() {
  const ln = LN(); if (!ln) return;
  const ids = [];
  for (let i = 0; i < 6; i++) ids.push({ id: idFor(0, i) });
  try { await ln.cancel({ notifications: ids }); } catch {}
}

// À appeler après une progression de lecture : si l'objectif du jour est atteint, stopper les rappels du jour.
export async function onProgress() {
  if (!isNative() || !store.get('notify')) return;
  try { if (goalsStatus().daily.met) await cancelTodayRemaining(); } catch {}
}

export async function init() {
  if (!isNative()) return;
  if (store.get('notify')) schedule();
}
