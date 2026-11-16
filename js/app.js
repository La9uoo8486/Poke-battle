import {
  S, loadData, store, esc, mult, defenseProfile, multLabel, multClass, defClass,
  typeBadge, typeBadges, spriteImg, usageOf, usageMon, showdownName, searchDex, total, STAT_KO, nm,
  allowed, setGimmick, gmCustom, resetGimmicks, loadGimmicks,
} from './data.js';
import * as Votes from './votes.js';

const $ = (s, el = document) => el.querySelector(s);
const view = $('#view');
const favs = new Set(store.get('favs', []));
const GM_LABEL = { mega: '메가진화', megaZA: '메가진화 Z-A', z: 'Z기술', dynamax: '다이맥스', tera: '테라스탈' };
const GM_HELP = { mega: 'XY·ORAS 메가진화 폼', megaZA: '레전즈 Z-A에서 추가된 메가진화 폼', z: '파티 빌더에서 Z크리스탈 선택', dynamax: '거다이맥스 폼', tera: '파티 빌더에서 테라 타입 선택' };
const Z_ITEM = { normal: 'Normalium Z', fire: 'Firium Z', water: 'Waterium Z', grass: 'Grassium Z', electric: 'Electrium Z', ice: 'Icium Z', fighting: 'Fightinium Z', poison: 'Poisonium Z', ground: 'Groundium Z', flying: 'Flyinium Z', psychic: 'Psychium Z', bug: 'Buginium Z', rock: 'Rockium Z', ghost: 'Ghostium Z', dragon: 'Dragonium Z', dark: 'Darkinium Z', steel: 'Steelium Z', fairy: 'Fairium Z' };
function setFormat(f) {
  S.format = f; $('#formatSel').value = f.key; store.set('format', f.key); loadGimmicks(); renderGimmicks();
}

// ================= 공통 UI =================
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2200);
}
function toggleFav(key) {
  favs.has(key) ? favs.delete(key) : favs.add(key);
  store.set('favs', [...favs]);
  document.querySelectorAll(`.star[data-fav="${CSS.escape(key)}"]`).forEach(b => b.classList.toggle('on', favs.has(key)));
}
const starBtn = key => `<button class="star ${favs.has(key) ? 'on' : ''}" data-fav="${esc(key)}" aria-label="즐겨찾기">★</button>`;

document.addEventListener('click', e => {
  const s = e.target.closest('[data-fav]');
  if (s) { e.stopPropagation(); e.preventDefault(); toggleFav(s.dataset.fav); return; }
  const p = e.target.closest('[data-poke]');
  if (p) { e.preventDefault(); openDetail(p.dataset.poke); }
});

// 포켓몬 검색 입력 (onPick(d))
function pokePicker(el, onPick, placeholder = '포켓몬 이름 검색 (한글/영문/번호)') {
  el.classList.add('search-pop');
  el.innerHTML = `<input type="search" placeholder="${placeholder}" style="width:100%" autocomplete="off"><div class="results" hidden></div>`;
  const input = $('input', el), box = $('.results', el);
  const render = () => {
    const res = searchDex(input.value, 25);
    box.hidden = !res.length;
    box.innerHTML = res.map(d => `<button type="button" data-k="${d.key}">${spriteImg(d)}<span class="grow"><b>${esc(d.ko)}</b> <span class="muted small">${esc(d.en)}</span><br>${typeBadges(d.t)}</span></button>`).join('');
  };
  input.addEventListener('input', render);
  input.addEventListener('focus', render);
  box.addEventListener('click', e => {
    const b = e.target.closest('button[data-k]'); if (!b) return;
    onPick(S.byKey.get(b.dataset.k)); input.value = ''; box.hidden = true;
  });
  document.addEventListener('click', e => { if (!el.contains(e.target)) box.hidden = true; });
  return input;
}

// ================= 헤더 / 포맷 =================
function renderHeader() {
  const sel = $('#formatSel');
  const groups = { champions: '포켓몬 챔피언스', sv: '스칼렛·바이올렛' };
  sel.innerHTML = Object.entries(groups).map(([g, label]) =>
    `<optgroup label="${label}">${S.formats.filter(f => f.game === g).map(f => `<option value="${f.key}">${esc(f.label)}</option>`).join('')}</optgroup>`).join('');
  sel.value = S.format.key;
  sel.onchange = () => { setFormat(S.formats.find(f => f.key === sel.value)); route(); };
  renderGimmicks();
  $('#themeBtn').onclick = () => {
    const cur = document.documentElement.dataset.theme
      || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next; store.set('theme', next);
    try { localStorage.setItem('theme', next); } catch {}
  };
}
// 기믹 칩: 누르면 켜고(포함) 끔(제외). 포맷 공식 룰과 다르면 표시 + 초기화
function renderGimmicks() {
  const f = S.format;
  $('#gimmicks').innerHTML = Object.entries(GM_LABEL).map(([k, l]) => {
    const on = !!S.gm[k], off = on !== !!f.gimmicks[k];
    return `<button type="button" class="gm ${on ? 'on' : 'off'} ${off ? 'custom' : ''}" data-gm="${k}" aria-pressed="${on}"
      title="${GM_HELP[k]} · 공식 룰: ${f.gimmicks[k] ? '허용' : '불가'}">${on ? '✓' : '✕'} ${l}</button>`;
  }).join('')
    + `<span class="gm">${f.battle === 'doubles' ? '더블' : '싱글'}</span>`
    + (gmCustom() ? '<button type="button" class="gm warn" data-gm-reset>공식 룰과 다름 · 초기화</button>' : '')
    + (f.verified ? '' : '<span class="gm" style="color:var(--warn)">룰 확인 필요</span>');
}
document.getElementById('gimmicks').addEventListener('click', e => {
  const b = e.target.closest('[data-gm]'), r = e.target.closest('[data-gm-reset]');
  if (b) setGimmick(b.dataset.gm, !S.gm[b.dataset.gm]);
  else if (r) resetGimmicks();
  else return;
  renderGimmicks(); route();
});

// ================= 라우터 =================
const routes = { usage: viewUsage, rank: viewRank, dex: viewDex, type: viewType, party: viewParty, counter: viewCounter, quiz: viewQuiz };
function parseHash() {
  const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
  return { name: routes[path] ? path : 'usage', params: new URLSearchParams(qs || '') };
}
function route() {
  const { name, params } = parseHash();
  document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.r === name));
  view.innerHTML = '';
  routes[name](params);
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

// ================= 1. 실전 사용률 순위 =================
function viewUsage() {
  const u = usageOf();
  view.innerHTML = `<h2>최근 실전 배틀 순위</h2>
    <div class="note">출처: Pokémon Showdown 래더 통계(Smogon), 레이팅 ${S.format.rating}+ 기준. 게임 내 공식 랭크 순위가 아니라 대전 시뮬레이터 사용률입니다.</div>
    <div id="u"></div>`;
  const box = $('#u');
  if (!u) { box.innerHTML = '<div class="note warn">이 포맷은 아직 사용률 데이터가 없습니다. 다음 자동 갱신(매주 월) 후 표시됩니다.</div>'; return; }
  const max = u.mons[0]?.usage || 1;
  const hidden = u.mons.filter(m => m.key && !allowed(S.byKey.get(m.key))).length;
  box.innerHTML = `<div class="row small muted"><span>${u.month} 통계 · ${u.battles ? u.battles.toLocaleString() + '판' : ''}</span>
      <span class="grow"></span><span>갱신 ${new Date(S.usage.updated).toLocaleDateString('ko-KR')}</span></div>
    ${S.usage.seed ? '<div class="note">초기 데이터(상위 40위, 사용률만). 첫 자동 갱신 후 기술·도구·테라·카운터 정보가 추가됩니다.</div>' : ''}
    ${hidden ? `<div class="note">꺼둔 기믹 때문에 ${hidden}마리를 숨겼어요. (순위 번호는 원래 순위)</div>` : ''}
    <div class="list">${u.mons.map(m => {
      const d = S.byKey.get(m.key);
      if (d && !allowed(d)) return '';
      if (!d) return `<div class="item"><span class="rank">${m.rank}</span><span class="grow">${esc(m.name)} <span class="muted small">(도감 매칭 안 됨)</span></span><span class="pct">${m.usage}%</span></div>`;
      return `<div class="item" role="button" tabindex="0" data-poke="${d.key}"><span class="rank">${m.rank}</span>${spriteImg(d)}
        <span class="grow"><span class="name">${esc(d.ko)}</span> ${typeBadges(d.t)}
        <div class="bar"><i style="width:${(m.usage / max * 100).toFixed(1)}%"></i></div></span>
        <span class="pct">${m.usage}%</span>${starBtn(d.key)}</div>`;
    }).join('')}</div>`;
}

// ================= 2. 랭킹 · 투표 =================
const TIERS = [[5, 'S'], [4, 'A'], [3, 'B'], [2, 'C'], [1, 'D']];
const tierOf = avg => avg >= 4.5 ? 'S' : avg >= 3.5 ? 'A' : avg >= 2.5 ? 'B' : avg >= 1.5 ? 'C' : 'D';
function viewRank(params) {
  const tab = params.get('t') || 'users';
  view.innerHTML = `<h2>포켓몬 랭킹</h2>
    <div class="seg" id="seg">
      <button data-t="users">유저 투표 순위</button><button data-t="vote">투표하기</button><button data-t="stats">종족값 순위</button>
    </div><div id="r" style="margin-top:10px"></div>`;
  $('#seg').querySelectorAll('button').forEach(b => {
    b.classList.toggle('on', b.dataset.t === tab);
    b.onclick = () => (location.hash = '#/rank?t=' + b.dataset.t);
  });
  ({ users: rankUsers, vote: rankVote, stats: rankStats })[tab]($('#r'));
}

async function rankUsers(box) {
  box.innerHTML = '<p class="muted">불러오는 중…</p>';
  const online = await Votes.init();
  let rows;
  try { rows = await Votes.summary(S.format.key); }
  catch (e) { box.innerHTML = `<div class="note warn">집계를 불러오지 못했습니다: ${esc(e.message)}</div>`; return; }
  const minVotes = online ? 3 : 1;
  const ranked = rows.filter(r => r.votes >= minVotes).sort((a, b) => b.avg - a.avg || b.votes - a.votes);
  box.innerHTML = `${online ? `<div class="note">${esc(S.format.label)} 기준, 표 ${minVotes}개 이상 받은 포켓몬만 표시. 점수: S=5 A=4 B=3 C=2 D=1 평균.</div>`
      : '<div class="note warn">서버 미연결 상태라 이 기기에서 내가 매긴 결과만 보입니다. (Supabase 설정 후 모든 유저 결과가 모입니다)</div>'}
    ${ranked.length ? `<div class="list">${ranked.map((r, i) => {
      const d = S.byKey.get(r.pokemon); if (!allowed(d)) return '';
      return `<button class="item" data-poke="${d.key}"><span class="rank">${i + 1}</span>${spriteImg(d)}
        <span class="grow"><span class="name">${esc(d.ko)}</span> ${typeBadges(d.t)}<div class="small muted">${r.votes}표</div></span>
        <span class="pct">${tierOf(r.avg)} · ${(+r.avg).toFixed(2)}</span></button>`;
    }).join('')}</div>` : '<p class="muted">아직 투표가 없습니다. "투표하기"에서 첫 표를 넣어주세요.</p>'}`;
}

async function rankVote(box) {
  box.innerHTML = '<p class="muted">불러오는 중…</p>';
  const online = await Votes.init();
  let mine = {};
  try { mine = await Votes.myVotes(S.format.key); } catch (e) { toast('내 투표를 불러오지 못했습니다'); }
  const u = usageOf();
  const keys = [...new Set([...(u?.mons.map(m => m.key).filter(Boolean) || []), ...Object.keys(mine)])];
  box.innerHTML = `<div class="note">${esc(S.format.label)}에서 실제로 얼마나 강한지 S~D로 매겨주세요. 같은 칸을 다시 누르면 취소, 다른 칸을 누르면 수정됩니다. 포켓몬당 기기 1표.
    ${online ? '' : '<br><b>현재 서버 미연결 — 이 기기에만 저장됩니다.</b>'}</div>
    <div id="add" style="max-width:420px"></div>
    <div class="list" id="vl"></div>`;
  const list = $('#vl');
  const row = key => {
    const d = S.byKey.get(key); if (!allowed(d)) return '';
    return `<div class="item" data-row="${key}">${spriteImg(d)}<span class="grow"><a href="#" data-poke="${key}" class="name">${esc(d.ko)}</a><br>${typeBadges(d.t)}</span>
      <span class="tiers">${TIERS.map(([s, l]) => `<button data-s="${s}" class="${mine[key] === s ? 'on' : ''}">${l}</button>`).join('')}</span></div>`;
  };
  list.innerHTML = keys.map(row).join('');
  pokePicker($('#add'), d => {
    if (!list.querySelector(`[data-row="${CSS.escape(d.key)}"]`)) list.insertAdjacentHTML('afterbegin', row(d.key));
  }, '목록에 없는 포켓몬 추가');
  list.addEventListener('click', async e => {
    const b = e.target.closest('.tiers button'); if (!b) return;
    const r = b.closest('[data-row]'), key = r.dataset.row, s = +b.dataset.s;
    const next = mine[key] === s ? 0 : s;
    const prev = mine[key];
    if (next) mine[key] = next; else delete mine[key];
    r.querySelectorAll('.tiers button').forEach(x => x.classList.toggle('on', +x.dataset.s === next));
    try { await Votes.vote(S.format.key, key, next); }
    catch (err) {
      if (prev) mine[key] = prev; else delete mine[key];
      r.querySelectorAll('.tiers button').forEach(x => x.classList.toggle('on', +x.dataset.s === prev));
      toast('저장 실패: ' + err.message);
    }
  });
}

function rankStats(box) {
  const sortKey = store.get('statSort', 6);
  box.innerHTML = `<div class="row"><select id="ss">${['합계', ...STAT_KO].map((l, i) => `<option value="${i === 0 ? 6 : i - 1}">${l}</option>`).join('')}</select>
    <label class="small"><input type="checkbox" id="onlyU" ${store.get('statOnlyU', true) ? 'checked' : ''}> 이 포맷 사용률 상위만</label></div>
    <div class="list" id="sl"></div>`;
  $('#ss').value = sortKey;
  const draw = () => {
    const k = +$('#ss').value, onlyU = $('#onlyU').checked;
    store.set('statSort', k); store.set('statOnlyU', onlyU);
    const u = usageOf();
    let pool = (onlyU && u ? u.mons.map(m => S.byKey.get(m.key)) : S.dex).filter(allowed);
    const val = d => k === 6 ? total(d) : d.s[k];
    pool = [...pool].sort((a, b) => val(b) - val(a)).slice(0, 100);
    $('#sl').innerHTML = pool.map((d, i) => `<div class="item" role="button" tabindex="0" data-poke="${d.key}"><span class="rank">${i + 1}</span>${spriteImg(d)}
      <span class="grow"><span class="name">${esc(d.ko)}</span> ${typeBadges(d.t)}<div class="small muted">${d.s.join(' / ')}</div></span>
      <span class="pct">${val(d)}</span>${starBtn(d.key)}</div>`).join('');
  };
  $('#ss').onchange = draw; $('#onlyU').onchange = draw; draw();
}

// ================= 3. 도감 =================
function viewDex() {
  const st = store.get('dexFilter', { q: '', type: '', fav: false, mega: false });
  view.innerHTML = `<h2>도감</h2>
    <div class="row">
      <input type="search" id="q" class="grow" placeholder="이름·번호 검색" value="${esc(st.q)}">
      <select id="ty"><option value="">전체 타입</option>${S.types.map(t => `<option value="${t.key}">${t.ko}</option>`).join('')}</select>
      <label class="small"><input type="checkbox" id="fv" ${st.fav ? 'checked' : ''}> ★ 즐겨찾기</label>
      <label class="small"><input type="checkbox" id="mg" ${st.mega ? 'checked' : ''}> 메가·거다이맥스만</label>
    </div>
    <div class="small muted" id="cnt"></div><div class="grid" id="g"></div><div style="text-align:center;margin-top:10px"><button class="btn" id="more" hidden>더 보기</button></div>`;
  $('#ty').value = st.type;
  let limit = 120;
  const draw = () => {
    Object.assign(st, { q: $('#q').value, type: $('#ty').value, fav: $('#fv').checked, mega: $('#mg').checked });
    store.set('dexFilter', st);
    const q = st.q.trim().toLowerCase(), num = /^\d+$/.test(q) ? +q : null;
    const res = S.dex.filter(d => allowed(d) &&
      (!q || (num ? d.sp === num : d.ko.toLowerCase().includes(q) || d.en.toLowerCase().includes(q))) &&
      (!st.type || d.t.includes(st.type)) && (!st.fav || favs.has(d.key)) && (!st.mega || d.m || d.g));
    $('#cnt').textContent = `${res.length}마리`;
    $('#g').innerHTML = res.slice(0, limit).map(d => `<div class="tile" data-poke="${d.key}" role="button" tabindex="0">${starBtn(d.key)}
      ${spriteImg(d)}<div class="no">No.${String(d.sp).padStart(4, '0')}</div><div class="name">${esc(d.ko)}</div><div>${typeBadges(d.t)}</div></div>`).join('');
    $('#more').hidden = res.length <= limit;
  };
  $('#more').onclick = () => { limit += 120; draw(); };
  ['q', 'ty', 'fv', 'mg'].forEach(id => $('#' + id).addEventListener(id === 'q' ? 'input' : 'change', () => { limit = 120; draw(); }));
  draw();
}

// 상세 모달
function openDetail(key) {
  const d = S.byKey.get(key); if (!d) return;
  const prof = defenseProfile(d.t);
  const groups = [[4, '4배'], [2, '2배'], [0.5, '½배'], [0.25, '¼배'], [0, '무효']];
  const um = usageMon(key);
  const forms = (S.bySp.get(d.sp) || []).filter(x => x.key !== key && allowed(x));
  const maxS = 200;
  const list = (arr, fmt = x => esc(nm(x[0])) + ' ' + x[1] + '%') => arr?.length ? `<div class="kv">${arr.map(x => `<span class="chip">${fmt(x)}</span>`).join('')}</div>` : '';
  $('#modalBody').innerHTML = `<button class="close" onclick="this.closest('dialog').close()" aria-label="닫기">×</button>
    <div class="row">${spriteImg(d, 'art', true)}<div class="grow">
      <div class="muted small">No.${String(d.sp).padStart(4, '0')} · ${esc(d.en)}</div>
      <h2 style="margin:2px 0">${esc(d.ko)} ${starBtn(d.key)}</h2>${typeBadges(d.t)}
      ${d.m ? `<div class="small" style="margin-top:6px">${d.m === 2 ? 'Z-A 메가진화' : '기존 메가진화'} · ${S.format.gimmicks[d.m === 2 ? 'megaZA' : 'mega'] ? '<span class="ok">이 포맷 공식 룰에서 사용 가능</span>' : '<span class="danger">이 포맷 공식 룰에서 사용 불가</span>'}</div>` : ''}
      ${d.g ? `<div class="small" style="margin-top:6px">거다이맥스 · ${S.format.gimmicks.dynamax ? '<span class="ok">이 포맷 공식 룰에서 사용 가능</span>' : '<span class="danger">이 포맷 공식 룰에서 사용 불가</span>'}</div>` : ''}
    </div></div>
    <h3>종족값 <span class="muted small">합계 ${total(d)}</span></h3>
    <div class="stats">${d.s.map((v, i) => `<span>${STAT_KO[i]}</span><span class="v">${v}</span><div class="bar"><i style="width:${Math.min(100, v / maxS * 100)}%;background:${v >= 120 ? 'var(--good)' : v < 60 ? 'var(--bad)' : 'var(--accent)'}"></i></div>`).join('')}</div>
    <h3>받는 데미지</h3>
    ${groups.map(([m, l]) => { const ts = S.types.filter(t => prof[t.key] === m); return ts.length ? `<div class="row small" style="margin:4px 0"><span class="mult ${defClass(m)}">${l}</span>${ts.map(t => typeBadge(t.key)).join('')}</div>` : ''; }).join('')}
    ${um ? `<h3>${esc(S.format.label)} 실전 데이터 <span class="muted small">${um.rank}위 · ${um.usage}%</span></h3>
      ${um.moves ? '<div class="small muted">기술</div>' + list(um.moves) : ''}
      ${um.items ? '<div class="small muted">도구</div>' + list(um.items) : ''}
      ${um.abilities ? '<div class="small muted">특성</div>' + list(um.abilities) : ''}
      ${S.gm.tera && um.tera?.length ? '<div class="small muted">테라스탈</div>' + list(um.tera, x => (S.typeKo[x[0].toLowerCase()] || esc(x[0])) + ' ' + x[1] + '%') : ''}
      ${um.mates?.length ? '<div class="small muted">자주 같이 쓰는 포켓몬</div>' + `<div class="kv">${um.mates.map(m => m[1] ? `<a class="chip" href="#" data-poke="${m[1]}">${esc(S.byKey.get(m[1])?.ko || m[0])}</a>` : `<span class="chip">${esc(m[0])}</span>`).join('')}</div>` : ''}
      ${!um.moves ? '<div class="note">기술·도구 등 상세 정보는 첫 자동 갱신 후 표시됩니다.</div>' : ''}` : ''}
    ${forms.length ? `<h3>다른 폼</h3><div class="kv">${forms.map(f => `<a class="chip" href="#" data-poke="${f.key}">${esc(f.ko)}</a>`).join('')}</div>` : ''}
    <div class="row" style="margin-top:16px">
      <button class="btn primary" id="toParty">파티에 추가</button>
      <a class="btn" href="#/counter?p=${d.key}" onclick="this.closest('dialog').close()">카운터 찾기</a>
    </div>`;
  $('#toParty').onclick = () => { addToParty(d.key); $('#modal').close(); };
  const m = $('#modal'); if (!m.open) m.showModal();
  $('#modalBody').scrollTop = 0;
}
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.matches?.('[role=button][data-poke]')) openDetail(e.target.dataset.poke);
});
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') e.target.close(); });

// ================= 4. 상성 =================
function viewType() {
  view.innerHTML = `<h2>타입 상성</h2>
    <div class="two">
      <div class="card"><h3 style="margin-top:0">방어 계산기</h3>
        <p class="small muted">방어 타입을 1~2개 고르면 받는 배수를 보여줍니다.</p>
        <div class="row"><select id="d1">${S.types.map(t => `<option value="${t.key}">${t.ko}</option>`).join('')}</select>
          <select id="d2"><option value="">(없음)</option>${S.types.map(t => `<option value="${t.key}">${t.ko}</option>`).join('')}</select></div>
        <div id="dres" style="margin-top:10px"></div></div>
      <div class="card"><h3 style="margin-top:0">공격 계산기</h3>
        <p class="small muted">공격 기술 타입이 어떤 타입에 잘 듣는지 보여줍니다.</p>
        <select id="a1">${S.types.map(t => `<option value="${t.key}">${t.ko}</option>`).join('')}</select>
        <div id="ares" style="margin-top:10px"></div></div>
    </div>
    <h3>전체 상성표 <span class="small muted">세로: 공격 / 가로: 방어</span></h3>
    <div class="chart-wrap"><table class="chart"><thead><tr><th style="left:0;z-index:2">공\\방</th>${S.types.map(t => `<th>${t.ko}</th>`).join('')}</tr></thead>
    <tbody>${S.types.map(a => `<tr><th>${typeBadge(a.key)}</th>${S.types.map(dd => { const m = S.chart[a.key][dd.key]; return `<td class="${multClass(m)}">${m === 1 ? '' : multLabel(m)}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
  const drawD = () => {
    const ts = [$('#d1').value, $('#d2').value].filter((v, i, a) => v && a.indexOf(v) === i);
    const p = defenseProfile(ts);
    $('#dres').innerHTML = [[4, '4배'], [2, '2배'], [1, '1배'], [0.5, '½배'], [0.25, '¼배'], [0, '무효']].map(([m, l]) => {
      const list = S.types.filter(t => p[t.key] === m); return list.length ? `<div class="row small" style="margin:4px 0"><span class="mult ${defClass(m)}">${l}</span>${list.map(t => typeBadge(t.key)).join('')}</div>` : '';
    }).join('');
  };
  const drawA = () => {
    const a = $('#a1').value;
    $('#ares').innerHTML = [[2, '효과 굉장'], [0.5, '효과 별로'], [0, '효과 없음']].map(([m, l]) => {
      const list = S.types.filter(t => S.chart[a][t.key] === m); return list.length ? `<div class="row small" style="margin:4px 0"><span class="mult ${multClass(m)}">${l}</span>${list.map(t => typeBadge(t.key)).join('')}</div>` : '';
    }).join('');
  };
  ['d1', 'd2'].forEach(id => $('#' + id).onchange = drawD); $('#a1').onchange = drawA;
  drawD(); drawA();
}

// ================= 5. 파티 빌더 =================
// party = { slots: [{key, tera}] }
let party = store.get('party', { slots: [] });
const saveParty = () => store.set('party', party);
function addToParty(key) {
  if (party.slots.length >= 6) { toast('파티는 6마리까지입니다'); return; }
  party.slots.push({ key, tera: '' }); saveParty();
  toast(`${S.byKey.get(key)?.ko} 파티에 추가`);
  if (parseHash().name === 'party') route();
}
function encodeParty() {
  return party.slots.map(s => [s.key, s.tera || '', s.z || ''].join('.').replace(/\.+$/, '')).join(',');
}
function decodeParty(str) {
  return str.split(',').filter(Boolean).slice(0, 6).map(x => { const [key, tera, z] = x.split('.'); return { key, tera: tera || '', z: z || '' }; })
    .filter(s => S.byKey.has(s.key)).map(s => ({ ...s, tera: S.typeKo[s.tera] ? s.tera : '', z: Z_ITEM[s.z] ? s.z : '' }));
}
function exportShowdown() {
  return party.slots.map(s => {
    const d = S.byKey.get(s.key);
    const lines = [showdownName(d), 'Level: 50'];
    if (s.z && S.gm.z) lines[0] += ' @ ' + Z_ITEM[s.z];
    if (s.tera && S.gm.tera) lines.push('Tera Type: ' + s.tera[0].toUpperCase() + s.tera.slice(1));
    return lines.join('\n');
  }).join('\n\n');
}
function importShowdown(text) {
  const out = [];
  for (const block of text.replace(/\r/g, '').split(/\n\s*\n/)) {
    const lines = block.trim().split('\n'); if (!lines[0]) continue;
    let [first, item = ''] = lines[0].split('@').map(s => s.trim());
    first = first.replace(/\((M|F)\)\s*$/, '').trim();
    const paren = first.match(/\(([^()]+)\)\s*$/);
    let species = paren ? paren[1] : first;
    let key = S.toKey(species);
    // 메가스톤 → 메가폼
    const mega = item.match(/ite(?:\s+([XYZ]))?$/i);
    if (key && mega && !/-mega/.test(key) && !/eviolite|white herb/i.test(item)) {
      const mk = key + '-mega' + (mega[1] ? '-' + mega[1].toLowerCase() : '');
      if (S.byKey.has(mk)) key = mk;
    }
    const teraLine = lines.find(l => /^Tera Type:/i.test(l));
    const tera = teraLine ? teraLine.split(':')[1].trim().toLowerCase() : '';
    const z = Object.keys(Z_ITEM).find(t => Z_ITEM[t].toLowerCase() === item.toLowerCase()) || '';
    if (key) out.push({ key, tera: S.typeKo[tera] ? tera : '', z });
  }
  return out.slice(0, 6);
}
function partyWarnings() {
  const g = S.gm, w = [];
  const name = s => S.byKey.get(s.key).ko;
  const megas = party.slots.filter(s => S.byKey.get(s.key)?.m);
  const offMega = megas.filter(s => !g[S.byKey.get(s.key).m === 2 ? 'megaZA' : 'mega']);
  if (offMega.length) w.push('꺼둔 메가진화 종류라 제외 대상입니다: ' + offMega.map(name).join(', '));
  const gmaxes = party.slots.filter(s => S.byKey.get(s.key)?.g);
  if (gmaxes.length && !g.dynamax) w.push('다이맥스를 꺼둬서 거다이맥스 폼은 제외 대상입니다: ' + gmaxes.map(name).join(', '));
  if (megas.length > 1 && (g.mega || g.megaZA)) w.push('메가진화는 한 배틀에 1마리만 가능합니다. (메가폼 ' + megas.length + '마리 등록됨, 선출 때 주의)');
  if (party.slots.filter(s => s.z).length > 1 && g.z) w.push('Z기술은 한 배틀에 1번만 쓸 수 있습니다.');
  if (party.slots.some(s => s.tera) && !g.tera) w.push('테라스탈을 꺼둬서 테라 타입은 계산에서 빠집니다.');
  if (party.slots.some(s => s.z) && !g.z) w.push('Z기술을 꺼둬서 Z크리스탈은 내보내기에서 빠집니다.');
  const sps = party.slots.map(s => S.byKey.get(s.key)?.sp);
  if (new Set(sps).size !== sps.length) w.push('같은 도감번호 포켓몬이 2마리 이상입니다 (종족 중복 금지 룰).');
  return w.filter(Boolean);
}
function viewParty(params) {
  if (params.get('t') != null) {
    const shared = decodeParty(params.get('t'));
    const f = S.formats.find(x => x.key === params.get('f'));
    if (shared.length && (party.slots.length === 0 || confirmReplace())) {
      party = { slots: shared }; saveParty();
      if (f) setFormat(f);
      toast('공유받은 파티를 불러왔습니다');
    }
    history.replaceState(null, '', '#/party');
  }
  const g = S.gm;
  const slots = [...party.slots, ...Array(6 - party.slots.length).fill(null)];
  view.innerHTML = `<h2>파티 빌더</h2>
    ${partyWarnings().map(w => `<div class="note warn">${esc(w)}</div>`).join('')}
    <div class="party" id="pt">${slots.map((s, i) => {
      if (!s) return `<div class="slot empty" data-add="${i}">＋ 추가</div>`;
      const d = S.byKey.get(s.key);
      return `<div class="slot"><button class="x" data-rm="${i}" aria-label="빼기">✕</button>${spriteImg(d)}
        <a href="#" data-poke="${d.key}" class="name">${esc(d.ko)}</a><div>${typeBadges(d.t)}</div>
        ${g.tera ? `<select data-tera="${i}"><option value="">테라 없음</option>${S.types.map(t => `<option value="${t.key}" ${s.tera === t.key ? 'selected' : ''}>테라 ${t.ko}</option>`).join('')}</select>` : ''}
        ${g.z ? `<select data-z="${i}"><option value="">Z크리스탈 없음</option>${S.types.map(t => `<option value="${t.key}" ${s.z === t.key ? 'selected' : ''}>Z ${t.ko}</option>`).join('')}</select>` : ''}
        ${d.m ? `<span class="chip">${d.m === 2 ? 'Z-A 메가' : '메가'}</span>` : ''}${d.g ? '<span class="chip">거다이맥스</span>' : ''}</div>`;
    }).join('')}</div>
    <div id="pick" style="max-width:420px;margin-top:10px" ${party.slots.length >= 6 ? 'hidden' : ''}></div>
    <div class="row" style="margin-top:10px">
      <button class="btn" id="share">링크 복사</button><button class="btn" id="exp">Showdown 내보내기</button>
      <button class="btn" id="imp">Showdown 불러오기</button><button class="btn" id="save">파티 저장</button>
      <button class="btn" id="clear">비우기</button>
    </div>
    <div id="io"></div>
    <div id="saved"></div>
    <div id="anal"></div>`;
  pokePicker($('#pick'), d => addToParty(d.key));
  $('#pt').addEventListener('click', e => {
    const rm = e.target.closest('[data-rm]');
    if (rm) { party.slots.splice(+rm.dataset.rm, 1); saveParty(); route(); return; }
    if (e.target.closest('[data-add]')) $('#pick input')?.focus();
  });
  $('#pt').addEventListener('change', e => {
    const t = e.target.closest('[data-tera]'), z = e.target.closest('[data-z]');
    if (t) { party.slots[+t.dataset.tera].tera = t.value; saveParty(); drawAnalysis(); }
    if (z) { party.slots[+z.dataset.z].z = z.value; saveParty(); route(); }
  });
  $('#share').onclick = async () => {
    if (!party.slots.length) return toast('파티가 비어 있습니다');
    const url = location.href.split('#')[0] + `#/party?f=${S.format.key}&t=${encodeParty()}`;
    try { await navigator.clipboard.writeText(url); toast('공유 링크를 복사했습니다'); }
    catch { $('#io').innerHTML = `<h3>공유 링크</h3><textarea readonly>${esc(url)}</textarea>`; }
  };
  $('#exp').onclick = () => {
    $('#io').innerHTML = `<h3>Showdown 텍스트</h3><textarea readonly id="et">${esc(exportShowdown())}</textarea>
      <div class="row"><button class="btn" id="cp">복사</button><span class="small muted">기술·도구·노력치는 Showdown에서 직접 채우세요.</span></div>`;
    $('#cp').onclick = () => navigator.clipboard.writeText($('#et').value).then(() => toast('복사했습니다'), () => $('#et').select());
  };
  $('#imp').onclick = () => {
    $('#io').innerHTML = `<h3>Showdown 텍스트 붙여넣기</h3><textarea id="it" placeholder="Showdown 팀빌더의 Import/Export 텍스트를 붙여넣으세요"></textarea>
      <button class="btn primary" id="go">불러오기</button>`;
    $('#go').onclick = () => {
      const res = importShowdown($('#it').value);
      if (!res.length) return toast('인식된 포켓몬이 없습니다');
      party = { slots: res }; saveParty(); route(); toast(`${res.length}마리 불러옴`);
    };
  };
  $('#save').onclick = () => {
    if (!party.slots.length) return toast('파티가 비어 있습니다');
    const name = prompt('파티 이름', `${S.format.label} 파티`); if (!name) return;
    const saved = store.get('savedParties', []);
    saved.unshift({ name, format: S.format.key, t: encodeParty(), at: Date.now() });
    store.set('savedParties', saved.slice(0, 30)); drawSaved();
  };
  $('#clear').onclick = () => { if (party.slots.length && confirm('파티를 비울까요?')) { party = { slots: [] }; saveParty(); route(); } };
  const drawSaved = () => {
    const saved = store.get('savedParties', []);
    $('#saved').innerHTML = saved.length ? `<h3>저장한 파티</h3><div class="list">${saved.map((p, i) => `<div class="item">
      <span class="grow"><b>${esc(p.name)}</b><div class="small muted">${p.t.split(',').map(x => esc(S.byKey.get(x.split('.')[0])?.ko || '?')).join(' · ')}</div></span>
      <button class="btn" data-load="${i}">불러오기</button><button class="btn" data-del="${i}">삭제</button></div>`).join('')}</div>` : '';
  };
  $('#saved').addEventListener('click', e => {
    const saved = store.get('savedParties', []);
    const l = e.target.closest('[data-load]'), d = e.target.closest('[data-del]');
    if (l) { const p = saved[+l.dataset.load]; party = { slots: decodeParty(p.t) }; saveParty();
      const f = S.formats.find(x => x.key === p.format); if (f) setFormat(f);
      route(); }
    if (d) { saved.splice(+d.dataset.del, 1); store.set('savedParties', saved); drawSaved(); }
  });
  drawSaved();
  drawAnalysis();
}
function confirmReplace() { return confirm('공유받은 파티로 현재 파티를 바꿀까요?'); }

function drawAnalysis() {
  const box = $('#anal'); if (!box) return;
  if (!party.slots.length) { box.innerHTML = '<p class="muted" style="margin-top:16px">포켓몬을 추가하면 약점 분석이 나옵니다.</p>'; return; }
  const useTera = S.gm.tera;
  const mons = party.slots.map(s => {
    const d = S.byKey.get(s.key);
    return { d, def: useTera && s.tera ? [s.tera] : d.t };
  });
  const rows = S.types.map(t => {
    const ms = mons.map(m => mult(t.key, m.def));
    const weak = ms.filter(m => m > 1).length, res = ms.filter(m => m < 1).length;
    return { t, ms, weak, res };
  });
  const danger = rows.filter(r => r.weak >= 3 || (r.weak >= 2 && r.res === 0));
  const off = S.types.map(t => {
    const best = Math.max(...mons.flatMap(m => m.d.t.map(a => mult(a, [t.key]))));
    return { t, best };
  });
  const noCover = off.filter(o => o.best < 1);
  const nSE = off.filter(o => o.best >= 2).length;
  box.innerHTML = `<h3>방어 약점 분석 ${useTera && party.slots.some(s => s.tera) ? '<span class="small muted">(테라 타입 적용)</span>' : ''}</h3>
    ${danger.length ? `<div class="note warn">주의 타입: ${danger.map(r => typeBadge(r.t.key) + ` 약점 ${r.weak}/반감 ${r.res}`).join(' · ')}</div>` : '<div class="note">약점이 크게 겹치는 타입이 없습니다.</div>'}
    <div class="chart-wrap"><table class="matrix"><thead><tr><th>공격</th>${mons.map(m => `<th>${esc(m.d.ko)}</th>`).join('')}<th>약점</th><th>반감</th></tr></thead>
    <tbody>${rows.map(r => `<tr><td>${typeBadge(r.t.key)}</td>${r.ms.map(m => `<td class="${defClass(m)}">${m === 1 ? '' : multLabel(m)}</td>`).join('')}
      <td class="sum ${r.weak >= 3 ? 'danger' : ''}">${r.weak || ''}</td><td class="sum ${r.res ? 'ok' : ''}">${r.res || ''}</td></tr>`).join('')}</tbody></table></div>
    <h3>자속(STAB) 공격 범위</h3>
    <div class="note">자기 타입 기술만 기준으로, 18타입 중 ${nSE}타입에 효과 굉장.
      ${noCover.length ? `<br>제대로 못 때리는 타입: ${noCover.map(o => typeBadge(o.t.key)).join('')}` : ''}</div>`;
}

// ================= 6. 카운터 찾기 =================
function viewCounter(params) {
  view.innerHTML = `<h2>카운터 찾기</h2>
    <p class="small muted">상대 포켓몬을 고르면, 그 포켓몬의 자속 기술을 잘 버티면서 약점을 찌를 수 있는 포켓몬과 공격 타입을 추천합니다.</p>
    <div id="cp" style="max-width:420px"></div><div id="cres"></div>`;
  pokePicker($('#cp'), d => (location.hash = '#/counter?p=' + d.key), '상대 포켓몬 검색');
  const key = params.get('p');
  if (key && S.byKey.has(key)) drawCounters(S.byKey.get(key));
  else {
    const u = usageOf();
    if (u) $('#cres').innerHTML = `<h3>자주 만나는 포켓몬</h3><div class="kv">${u.mons.slice(0, 16).map(m => S.byKey.get(m.key)).filter(Boolean)
      .map(d => `<a class="chip" href="#/counter?p=${d.key}">${esc(d.ko)}</a>`).join('')}</div>`;
  }
}
function drawCounters(T) {
  const u = usageOf(), um = usageMon(T.key);
  const pool = (u ? u.mons.map(m => S.byKey.get(m.key)) : S.dex.filter(d => total(d) >= 480)).filter(d => allowed(d) && d.sp !== T.sp);
  const scored = pool.map(C => {
    const taken = Math.max(...T.t.map(t => mult(t, C.t)));       // 상대 자속에 받는 배수
    const dealt = Math.max(...C.t.map(t => mult(t, T.t)));       // 내 자속으로 주는 배수
    const atk = Math.max(C.s[1], C.s[3]);
    const score = (dealt / Math.max(taken, 0.25)) * 100 + atk * 0.2 + (C.s[0] + C.s[2] + C.s[4]) * 0.05;
    return { C, taken, dealt, score };
  }).filter(x => x.taken <= 1 && x.dealt >= 1).sort((a, b) => b.score - a.score).slice(0, 12);
  const seTypes = S.types.map(t => ({ t, m: mult(t.key, T.t) })).filter(x => x.m >= 2).sort((a, b) => b.m - a.m);
  const real = um?.counters?.filter(c => c[1] && allowed(S.byKey.get(c[1]))) || [];
  const movesOf = C => usageMon(C.key)?.moves?.slice(0, 4).map(m => nm(m[0])).join(', ');
  $('#cres').innerHTML = `<div class="card" style="margin-top:12px"><div class="row">${spriteImg(T)}<div class="grow">
      <b>${esc(T.ko)}</b> ${typeBadges(T.t)}<div class="small muted">${T.s.join(' / ')}</div></div>
      <a href="#" data-poke="${T.key}" class="btn">상세</a></div></div>
    <h3>추천 공격 타입</h3>
    ${seTypes.length ? seTypes.map(x => `<span class="mult ${multClass(x.m)}">${x.m}배</span> ${typeBadge(x.t.key)}`).join(' ') : '<p class="muted">효과가 굉장한 타입이 없습니다.</p>'}
    ${um?.moves ? `<div class="small muted" style="margin-top:6px">상대가 자주 쓰는 기술: ${um.moves.slice(0, 4).map(m => esc(nm(m[0]))).join(', ')} — 자속 외 커버 기술도 확인하세요.</div>` : ''}
    ${real.length ? `<h3>실전 데이터 카운터 <span class="small muted">(Showdown 통계)</span></h3><div class="list">${real.map(c => {
      const d = S.byKey.get(c[1]); return `<button class="item" data-poke="${d.key}">${spriteImg(d)}<span class="grow"><span class="name">${esc(d.ko)}</span> ${typeBadges(d.t)}</span><span class="pct">${c[2]}%</span></button>`;
    }).join('')}</div>` : ''}
    <h3>타입 기준 추천 ${u ? `<span class="small muted">(${esc(S.format.label)} 사용률 상위 중)</span>` : ''}</h3>
    ${scored.length ? `<div class="list">${scored.map(x => `<button class="item" data-poke="${x.C.key}">${spriteImg(x.C)}
      <span class="grow"><span class="name">${esc(x.C.ko)}</span> ${typeBadges(x.C.t)}
      <div class="small">받는 자속 <span class="mult ${defClass(x.taken)}">${multLabel(x.taken)}배</span> · 주는 자속 <span class="mult ${multClass(x.dealt)}">${multLabel(x.dealt)}배</span></div>
      ${movesOf(x.C) ? `<div class="small muted">주요 기술: ${esc(movesOf(x.C))}</div>` : ''}</span></button>`).join('')}</div>`
      : '<p class="muted">타입만으로 유리한 포켓몬을 찾지 못했습니다.</p>'}
    <div class="note">타입 기준 추천은 자속 기술만 계산합니다. 특성(부유·저수 등), 도구, 서브 기술, 스피드는 반영하지 않습니다.</div>`;
}

// ================= 7. 퀴즈 =================
function viewQuiz() {
  const st = store.get('quiz', { score: 0, tries: 0, streak: 0, best: 0 });
  const ANS = [0, 0.25, 0.5, 1, 2, 4];
  view.innerHTML = `<h2>상성 퀴즈</h2><div class="card quiz">
    <div class="small muted" id="qs"></div><div class="q" id="qq"></div>
    <div class="answers" id="qa">${ANS.map(a => `<button class="btn" data-a="${a}">${multLabel(a)}배</button>`).join('')}</div>
    <div id="qr" style="min-height:48px;margin-top:14px"></div>
    <button class="btn primary" id="qn" hidden>다음 문제</button></div>
    <div style="text-align:center;margin-top:8px"><button class="btn" id="qreset">기록 초기화</button></div>`;
  let cur;
  const stats = () => ($('#qs').textContent = `정답 ${st.score}/${st.tries} · 연속 ${st.streak} · 최고 연속 ${st.best}`);
  const next = () => {
    const pick = () => S.types[Math.floor(Math.random() * S.types.length)].key;
    const atk = pick(), d1 = pick(); let d2 = Math.random() < 0.55 ? pick() : null; if (d2 === d1) d2 = null;
    const def = d2 ? [d1, d2] : [d1];
    // 가끔 실제 포켓몬으로 출제
    let who = '';
    if (Math.random() < 0.4) {
      const cands = S.dex.filter(d => !d.f && d.t.join() === def.join());
      if (cands.length) { const d = cands[Math.floor(Math.random() * cands.length)]; who = `<div style="margin-top:8px">${spriteImg(d)}<div class="small">${esc(d.ko)}</div></div>`; }
    }
    cur = { atk, def, ans: mult(atk, def) };
    $('#qq').innerHTML = `${typeBadge(atk)} 기술 → ${typeBadges(def)} 포켓몬${who}<div class="small muted" style="margin-top:6px">몇 배 데미지?</div>`;
    $('#qa').querySelectorAll('button').forEach(b => { b.className = 'btn'; b.disabled = false; });
    $('#qr').innerHTML = ''; $('#qn').hidden = true; stats();
  };
  $('#qa').onclick = e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    const a = +b.dataset.a, ok = a === cur.ans;
    st.tries++; if (ok) { st.score++; st.streak++; st.best = Math.max(st.best, st.streak); } else st.streak = 0;
    store.set('quiz', st);
    $('#qa').querySelectorAll('button').forEach(x => { x.disabled = true; if (+x.dataset.a === cur.ans) x.classList.add('right'); });
    if (!ok) b.classList.add('wrong');
    $('#qr').innerHTML = (ok ? '<b class="ok">정답!</b>' : `<b class="danger">오답</b> 정답은 ${multLabel(cur.ans)}배`) +
      `<div class="small muted">${cur.def.map(d => `${S.typeKo[d]} ${multLabel(S.chart[cur.atk][d])}배`).join(' × ')}</div>`;
    $('#qn').hidden = false; stats();
  };
  $('#qn').onclick = next;
  $('#qreset').onclick = () => { Object.assign(st, { score: 0, tries: 0, streak: 0, best: 0 }); store.set('quiz', st); stats(); };
  next();
}

// ================= 시작 =================
(async () => {
  try { await loadData(); }
  catch (e) { view.innerHTML = `<div class="note warn">데이터를 불러오지 못했습니다. 새로고침 해주세요. (${esc(e.message)})</div>`; return; }
  renderHeader(); route();
  Votes.init();
})();

// PWA: 서비스워커 등록 + 새 버전 오면 자동 새로고침
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.update();
      setInterval(() => reg.update(), 60 * 60 * 1000);
    }).catch(() => {});
    let reloaded = false;
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloaded) return; // 첫 설치 때는 새로고침 안 함
      reloaded = true; location.reload();
    });
  });
}
