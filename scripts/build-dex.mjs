// PokeAPI CSV → data/dex.json, data/types.json
// 사용: node scripts/build-dex.mjs   (Node 18+, 인터넷 필요)
import { writeFileSync } from 'node:fs';

const BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/';
const KO = '3', EN = '9';

async function csv(name) {
  const res = await fetch(BASE + name + '.csv');
  if (!res.ok) throw new Error(name + ' ' + res.status);
  const [head, ...rows] = (await res.text()).trim().split(/\r?\n/);
  const keys = head.split(',');
  return rows.map(line => {
    // 따옴표 포함 CSV 대응
    const out = []; let cur = '', q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === ',' && !q) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return Object.fromEntries(keys.map((k, i) => [k, out[i] ?? '']));
  });
}

const [pokemon, speciesNames, stats, ptypes, forms, formNames, types, typeNames, eff] = await Promise.all(
  ['pokemon', 'pokemon_species_names', 'pokemon_stats', 'pokemon_types', 'pokemon_forms',
   'pokemon_form_names', 'types', 'type_names', 'type_efficacy'].map(csv));

// ---------- 타입 ----------
const TYPE_IDS = types.filter(t => +t.id <= 18).map(t => +t.id);
const typeKey = Object.fromEntries(types.map(t => [t.id, t.identifier]));
const typeKo = {};
for (const t of typeNames) if (t.local_language_id === KO && +t.type_id <= 18) typeKo[typeKey[t.type_id]] = t.name.trim();
const chart = {}; // chart[공격][방어] = 배수
for (const e of eff) {
  if (+e.damage_type_id > 18 || +e.target_type_id > 18) continue;
  (chart[typeKey[e.damage_type_id]] ??= {})[typeKey[e.target_type_id]] = +e.damage_factor / 100;
}
const typeList = TYPE_IDS.map(id => ({ key: typeKey[id], ko: typeKo[typeKey[id]] }));
writeFileSync(new URL('../data/types.json', import.meta.url), JSON.stringify({ types: typeList, chart }));

// ---------- 포켓몬 ----------
const spName = {}, spEn = {};
for (const s of speciesNames) {
  if (s.local_language_id === KO) spName[s.pokemon_species_id] = s.name;
  if (s.local_language_id === EN) spEn[s.pokemon_species_id] = s.name;
}
const statMap = {};
for (const s of stats) (statMap[s.pokemon_id] ??= [])[+s.stat_id - 1] = +s.base_stat;
const typeMap = {};
for (const t of ptypes) (typeMap[t.pokemon_id] ??= [])[+t.slot - 1] = typeKey[t.type_id];
const formOf = {}; // pokemon_id → 기본 form
for (const f of forms) if (f.is_default === '1') formOf[f.pokemon_id] = f;
const formKo = {}, formEn = {};
for (const n of formNames) {
  if (n.local_language_id === KO) formKo[n.pokemon_form_id] = n.pokemon_name || '';
  if (n.local_language_id === EN) formEn[n.pokemon_form_id] = n.pokemon_name || '';
}

const SKIP = /-(gmax|totem|starter|cap|cosplay|rock-star|belle|pop-star|phd|libre|eternamax)(-|$)|-own-tempo|-battle-bond|-power-construct|-busted|-totem/;
const REGION = { alola: '알로라', galar: '가라르', hisui: '히스이', paldea: '팔데아' };
const defaultBySpecies = {};
for (const p of pokemon) if (p.is_default === '1') defaultBySpecies[p.species_id] = p;

const dex = [];
for (const p of pokemon) {
  const st = statMap[p.id], ty = typeMap[p.id];
  if (!st || !ty || st.length < 6) continue;
  const isDefault = p.is_default === '1';
  if (!isDefault) {
    if (SKIP.test(p.identifier)) continue;
    const base = defaultBySpecies[p.species_id];
    const same = base && statMap[base.id]?.join() === st.join() && typeMap[base.id]?.join() === ty.join();
    if (same && !/mega/.test(p.identifier)) continue; // 외형만 다른 폼 제외
  }
  const f = formOf[p.id];
  const mega = /-mega(-|$)/.test(p.identifier);
  const sKo = spName[p.species_id] || spEn[p.species_id];
  let ko = sKo;
  if (!isDefault) {
    ko = (f && formKo[f.id]) || '';
    if (!ko) {
      const suf = p.identifier.split('-mega')[1]?.replace('-', '').toUpperCase() || '';
      const reg = Object.keys(REGION).find(r => p.identifier.includes('-' + r));
      if (mega) ko = '메가' + sKo + suf;
      else if (reg) ko = REGION[reg] + ' ' + sKo;
      else ko = sKo + ' (' + p.identifier.replace(defaultBySpecies[p.species_id]?.identifier + '-', '') + ')';
    }
  }
  dex.push({
    id: +p.id, sp: +p.species_id, key: p.identifier, ko,
    en: (!isDefault && f && formEn[f.id]) || spEn[p.species_id] || p.identifier,
    t: ty.filter(Boolean), s: st, ...(mega ? { m: 1 } : {}), ...(isDefault ? {} : { f: 1 }),
  });
}
dex.sort((a, b) => a.sp - b.sp || a.id - b.id);
writeFileSync(new URL('../data/dex.json', import.meta.url), JSON.stringify(dex));
console.log('dex', dex.length, 'types', typeList.length);
