// Plans de lecture (PL-01) — 100 % local. Le Mushaf de Médine compte 604 pages.
import { store } from './store.js';

const TOTAL_PAGES = 604;

export const TEMPLATES = [
  { id: 'khatma30', name: 'Khatma en 30 jours', days: 30 },
  { id: 'ramadan',  name: 'Ramadan (30 jours)', days: 30 },
  { id: 'khatma60', name: 'Khatma en 60 jours', days: 60 },
  { id: 'week',     name: 'Khatma en 7 jours', days: 7 },
  { id: 'khatma90', name: 'Tranquille (90 jours)', days: 90 },
];

function buildPortions(nDays) {
  const portions = [];
  const chunk = TOTAL_PAGES / nDays;
  for (let i = 0; i < nDays; i++) {
    const from = Math.round(i * chunk) + 1;
    const to = i === nDays - 1 ? TOTAL_PAGES : Math.round((i + 1) * chunk);
    portions.push({ from, to: Math.max(from, to) });
  }
  return portions;
}

function save(plans) { store.set('plans', plans); }

export function all() { return store.get('plans'); }
export function active() {
  const p = store.get('plans');
  return p.active ? p.items[p.active] : null;
}

export function createFromTemplate(tplId) {
  const tpl = TEMPLATES.find(t => t.id === tplId);
  if (!tpl) return null;
  return create(tpl.name, tpl.days);
}

export function createCustom(pagesPerDay) {
  const ppd = Math.max(1, Math.min(TOTAL_PAGES, pagesPerDay | 0));
  const days = Math.ceil(TOTAL_PAGES / ppd);
  return create(`Personnalisé — ${ppd} page(s)/jour`, days);
}

function create(name, days) {
  const plans = store.get('plans');
  const id = 'p' + Date.now().toString(36);
  plans.items[id] = {
    id, name, days,
    portions: buildPortions(days),
    done: 0,
    start: Date.now(),
  };
  plans.active = id;
  save(plans);
  return plans.items[id];
}

export function setActive(id) { const p = store.get('plans'); p.active = id; save(p); }
export function remove(id) {
  const p = store.get('plans');
  delete p.items[id];
  if (p.active === id) p.active = Object.keys(p.items)[0] || null;
  save(p);
}

export function markNextDone() {
  const p = store.get('plans');
  const plan = p.active ? p.items[p.active] : null;
  if (!plan) return;
  if (plan.done < plan.portions.length) plan.done++;
  save(p);
  return plan;
}

export function progress(plan) {
  if (!plan) return null;
  const total = plan.portions.length;
  const next = plan.done < total ? plan.portions[plan.done] : null;
  const elapsed = Math.floor((Date.now() - plan.start) / 86400000) + 1; // jour courant (1-indexé)
  const expected = Math.min(total, Math.max(1, elapsed));
  return {
    done: plan.done,
    total,
    next,
    percent: Math.round((plan.done / total) * 100),
    behind: Math.max(0, expected - plan.done),
    finished: plan.done >= total,
  };
}
