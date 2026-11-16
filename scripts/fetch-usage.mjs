// Smogon(Showdown 래더) 사용률 → data/usage.json
// 사용: node scripts/fetch-usage.mjs   (Node 18+)
// GitHub Actions 에서 매주 자동 실행 (.github/workflows/update-usage.yml)
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const formats = JSON.parse(readFileSync(new URL('data/formats.json', ROOT))).formats;
const dex = JSON.parse(readFileSync(new URL('data/dex.json', ROOT)));
const TOP = 60;

import { makeToKey } from './name-map.mjs';
const toKey = makeToKey(dex);

async function get(url, type = 'text') {
  const r = await fetch(url, { headers: { 'User-Agent': 'pokebattle-usage-bot' } });
  if (!r.ok) return null;
  return type === 'json' ? r.json() : r.text();
}

const top = (obj, n, total) => Object.entries(obj || {})
  .filter(([k]) => k && k !== 'nothing' && k !== '')
  .sort((a, b) => b[1] - a[1]).slice(0, n)
  .map(([k, v]) => [k, +(100 * v / total).toFixed(1)]);

const index = await get('https://www.smogon.com/stats/');
const months = [...(index || '').matchAll(/href="(\d{4}-\d{2})\/"/g)].map(m => m[1]).sort().reverse();
if (!months.length) { console.error('월 목록을 가져오지 못함'); process.exit(1); }

let prev = {};
try { prev = JSON.parse(readFileSync(new URL('data/usage.json', ROOT))); } catch {}
const out = { updated: new Date().toISOString(), source: 'Smogon / Pokémon Showdown 래더 통계', formats: {} };

for (const f of formats) {
  let done = false;
  for (const month of months.slice(0, 3)) { // 최신 달에 없으면 이전 달
    const data = await get(`https://www.smogon.com/stats/${month}/chaos/${f.key}-${f.rating}.json`, 'json');
    if (!data?.data) continue;
    const entries = Object.entries(data.data);
    const sumUsage = entries.reduce((s, [, v]) => s + (v.usage || 0), 0);
    const mons = entries.sort((a, b) => b[1].usage - a[1].usage).slice(0, TOP).map(([name, v], i) => {
      // 가중치 합계(= 특성 값 합)를 분모로 써야 % 가 맞음
      const cnt = Object.values(v.Abilities || {}).reduce((a, b) => a + b, 0) || v['Raw count'] || 1;
      const counters = Object.entries(v['Checks and Counters'] || {})
        // [표본 수, 상대를 쓰러뜨리거나 교체시킨 비율, 표준편차] → Smogon 방식 점수 p - 4σ
        .filter(([, c]) => c[0] > 0.5).map(([n, c]) => [n, c[1] - 4 * c[2]])
        .sort((a, b) => b[1] - a[1]).slice(0, 6)
        .map(([n, sc]) => [n, toKey(n), +(Math.max(0, sc) * 100).toFixed(1)]);
      return {
        rank: i + 1, name, key: toKey(name),
        usage: +(100 * v.usage).toFixed(2),
        moves: top(v.Moves, 6, cnt), items: top(v.Items, 4, cnt), abilities: top(v.Abilities, 3, cnt),
        tera: top(v['Tera Types'], 3, cnt),
        mates: top(v.Teammates, 6, cnt).map(([n, p]) => [n, toKey(n), p]),
        counters,
      };
    });
    out.formats[f.key] = { month, battles: data.info?.['number of battles'] ?? null, rating: f.rating, mons };
    const miss = mons.filter(m => !m.key).map(m => m.name);
    console.log(f.key, month, mons.length, miss.length ? '매칭 실패: ' + miss.join(', ') : '');
    void sumUsage; done = true; break;
  }
  if (!done) {
    console.warn(f.key, '데이터 없음 — 이전 값 유지');
    if (prev.formats?.[f.key]) out.formats[f.key] = prev.formats[f.key];
  }
}
writeFileSync(new URL('data/usage.json', ROOT), JSON.stringify(out));
