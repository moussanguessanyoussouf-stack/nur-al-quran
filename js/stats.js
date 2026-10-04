// Suivi et statistiques (ST-01..04) — 100 % local.
import { store } from './store.js';

export function todayKey(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function days() { return store.get('stats').days; }

export function recordPage(p) {
  if (!p) return;
  const s = store.get('stats');
  const k = todayKey();
  if (!s.days[k]) s.days[k] = { pages: {}, secs: 0 };
  s.days[k].pages[p] = 1;
  store.set('stats', s);
}

export function addSeconds(n) {
  const s = store.get('stats');
  const k = todayKey();
  if (!s.days[k]) s.days[k] = { pages: {}, secs: 0 };
  s.days[k].secs += n;
  store.set('stats', s);
}

export function pagesOn(key) {
  const d = days()[key];
  return d ? Object.keys(d.pages).length : 0;
}

export function secondsOn(key) {
  const d = days()[key];
  return d ? d.secs : 0;
}

// Série de jours consécutifs d'activité se terminant aujourd'hui (ou hier).
export function streak() {
  const d = days();
  let count = 0;
  const cur = new Date();
  // tolère de commencer la série à hier si rien aujourd'hui
  if (!d[todayKey(cur)]) cur.setDate(cur.getDate() - 1);
  while (d[todayKey(cur)] && Object.keys(d[todayKey(cur)].pages).length > 0) {
    count++;
    cur.setDate(cur.getDate() - 1);
  }
  return count;
}

export function summary() {
  const d = days();
  const keys = Object.keys(d);
  const allPages = new Set();
  let totalSecs = 0, activeDays = 0;
  for (const k of keys) {
    const day = d[k];
    const np = Object.keys(day.pages).length;
    if (np > 0) activeDays++;
    for (const p of Object.keys(day.pages)) allPages.add(p);
    totalSecs += day.secs || 0;
  }
  const goal = store.get('goalPages') || 1;
  const todayPages = pagesOn(todayKey());
  return {
    todayPages,
    todaySecs: secondsOn(todayKey()),
    goal,
    goalMet: todayPages >= goal,
    streak: streak(),
    activeDays,
    distinctPages: allPages.size,
    totalSecs,
    last14: last14(),
  };
}

// Somme des pages lues sur les n derniers jours (glissant).
export function pagesLastDays(n) {
  const d = days();
  let sum = 0; const cur = new Date();
  for (let i = 0; i < n; i++) { const k = todayKey(cur); sum += d[k] ? Object.keys(d[k].pages).length : 0; cur.setDate(cur.getDate() - 1); }
  return sum;
}

// État des objectifs (quotidien / hebdomadaire / mensuel) : atteint ou non.
export function goalsStatus() {
  const dp = pagesOn(todayKey()), dg = store.get('goalPages') || 1;
  const wp = pagesLastDays(7), wg = store.get('goalWeek') || 7;
  const mp = pagesLastDays(30), mg = store.get('goalMonth') || 30;
  return {
    daily: { done: dp, goal: dg, met: dp >= dg },
    week: { done: wp, goal: wg, met: wp >= wg },
    month: { done: mp, goal: mg, met: mp >= mg },
  };
}

// Activité des 14 derniers jours (pour un mini-graphe).
function last14() {
  const d = days();
  const out = [];
  const cur = new Date();
  cur.setDate(cur.getDate() - 13);
  for (let i = 0; i < 14; i++) {
    const k = todayKey(cur);
    out.push({ key: k, pages: d[k] ? Object.keys(d[k].pages).length : 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}
