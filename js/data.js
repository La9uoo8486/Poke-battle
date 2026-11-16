// 데이터 로딩 + 공통 유틸
import { makeToKey } from '../scripts/name-map.mjs';

export const S = {
  dex: [], byKey: new Map(), bySp: new Map(), types: [], typeKo: {}, chart: {},
  formats: [], usage: { formats: {} }, format: null, toKey: null, names: {}, gm: {},
};

export async function loadData() {
  const get = p => fetch(p).then(r => { if (!r.ok) throw new Error(p); return r.json(); });
  const [dex, types, formats, usage] = await Promise.all([
    get('data/dex.json'), get('data/types.json'), get('data/formats.json'),
    get('data/usage.json').catch(() => ({ formats: {} })),
  ]);
  S.names = await get('data/names.json').catch(() => ({}));
  S.dex = dex;
  for (const d of dex) {
    S.byKey.set(d.key, d);
    if (!S.bySp.has(d.sp)) S.bySp.set(d.sp, []);
    S.bySp.get(d.sp).push(d);
  }
  S.types = types.types; S.chart = types.chart;
  S.typeKo = Object.fromEntries(types.types.map(t => [t.key, t.ko]));
  S.formats = formats.formats; S.usage = usage;
  S.toKey = makeToKey(dex);
  const saved = store.get('format');
  S.format = S.formats.find(f => f.key === saved) || S.formats[0];
  loadGimmicks();
}

// ---------- 기믹 (켜면 포함, 끄면 제외) ----------
export const GM_KEYS = ['mega', 'megaZA', 'z', 'dynamax', 'tera'];
export function loadGimmicks() {
  const o = store.get('gm:' + S.format.key, null);
  S.gm = { ...S.format.gimmicks, ...(o || {}) };
}
export function setGimmick(k, v) {
  S.gm[k] = v;
  const diff = Object.fromEntries(GM_KEYS.filter(x => !!S.gm[x] !== !!S.format.gimmicks[x]).map(x => [x, S.gm[x]]));
  store.set('gm:' + S.format.key, Object.keys(diff).length ? diff : null);
}
export const gmCustom = () => GM_KEYS.some(x => !!S.gm[x] !== !!S.format.gimmicks[x]);
export function resetGimmicks() { store.set('gm:' + S.format.key, null); loadGimmicks(); }
// 현재 기믹 설정에서 이 폼을 보여줄지
export function allowed(d) {
  if (!d) return false;
  if (d.m === 1 && !S.gm.mega) return false;
  if (d.m === 2 && !S.gm.megaZA) return false;
  if (d.g && !S.gm.dynamax) return false;
  return true;
}

// localStorage (사파리 프라이빗 모드 등에서 실패해도 동작)
export const store = {
  get(k, def = null) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- 타입 상성 ----------
export const mult = (atk, defTypes) => defTypes.reduce((m, d) => m * (S.chart[atk]?.[d] ?? 1), 1);
export function defenseProfile(defTypes) {
  const out = {};
  for (const t of S.types) out[t.key] = mult(t.key, defTypes);
  return out;
}
export const multLabel = m => m === 0 ? '0' : m === 0.25 ? '¼' : m === 0.5 ? '½' : String(m);
export const multClass = m => m === 0 ? 'm0' : m === 0.25 ? 'm25' : m === 0.5 ? 'm5' : m === 2 ? 'm2' : m === 4 ? 'm4' : '';
// 방어 관점 색: 받는 배수가 높으면 나쁨 → 공격표와 색 반대
export const defClass = m => m === 0 ? 'm4' : m === 0.25 ? 'm4' : m === 0.5 ? 'm2' : m === 2 ? 'm5' : m === 4 ? 'm25' : '';

export const typeBadge = t => `<span class="type t-${t}">${esc(S.typeKo[t] || t)}</span>`;
export const typeBadges = ts => ts.map(typeBadge).join('');

// ---------- 스프라이트 ----------
const SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
export function spriteImg(d, cls = 'sprite', art = false) {
  const path = art ? 'other/official-artwork/' : '';
  return `<img class="${cls}" loading="lazy" alt="" src="${SPR}${path}${d.id}.png"
    onerror="if(!this.dataset.f){this.dataset.f=1;this.src='${SPR}${path}${d.sp}.png'}else{this.style.visibility='hidden'}">`;
}

// ---------- 사용률 ----------
export function usageOf(formatKey = S.format.key) { return S.usage.formats?.[formatKey] || null; }
export function usageMon(key, formatKey = S.format.key) {
  return usageOf(formatKey)?.mons.find(m => m.key === key) || null;
}

// Showdown 표기 이름
export function showdownName(d) {
  const base = S.bySp.get(d.sp)?.[0];
  if (!d.f || !base) return d.en;
  const suffix = d.key.slice(base.key.length + 1)
    .replace(/-(mask|male|incarnate|single-strike)$/, '')
    .split('-').map(w => w === 'z' || w === 'x' || w === 'y' ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)).join('-');
  const female = /-female$/.test(d.key);
  return base.en + '-' + (female ? 'F' : suffix);
}

export function searchDex(q, limit = 30) {
  q = q.trim().toLowerCase();
  if (!q) return [];
  const num = /^\d+$/.test(q) ? +q : null;
  const res = [];
  for (const d of S.dex) {
    if (!allowed(d)) continue;
    if (num ? d.sp === num : (d.ko.toLowerCase().includes(q) || d.en.toLowerCase().includes(q) || d.key.includes(q))) res.push(d);
    if (res.length >= limit) break;
  }
  return res;
}

export const total = d => d.s.reduce((a, b) => a + b, 0);
export const STAT_KO = ['HP', '공격', '방어', '특공', '특방', '스피드'];

// Showdown id(closecombat) → 한글명
export const nm = id => S.names[String(id).toLowerCase().replace(/[^a-z0-9]/g, '')] || id;
