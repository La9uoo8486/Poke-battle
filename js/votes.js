// 유저 투표 — Supabase 익명 세션(로그인 창 없음)
// 기기마다 보이지 않는 익명 계정이 자동 생성됨 → 같은 기기는 포켓몬당 1표(수정 가능)
// 나중에 구글/디스코드 로그인을 붙이면 supabase.auth.linkIdentity() 로 같은 user_id 를 유지한 채 전환 가능
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';
import { store } from './data.js';

let sb = null, ready = null;
export const online = () => !!sb;

export function init() {
  if (ready) return ready;
  ready = (async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
    try {
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true } });
      const { data } = await client.auth.getSession();
      if (!data.session) {
        const { error } = await client.auth.signInAnonymously();
        if (error) throw error;
      }
      sb = client;
      return true;
    } catch (e) {
      console.warn('Supabase 연결 실패, 로컬 모드로 동작', e);
      return false;
    }
  })();
  return ready;
}

const localKey = f => 'votes:' + f;

export async function myVotes(format) {
  await init();
  if (!sb) return store.get(localKey(format), {});
  const { data, error } = await sb.from('votes').select('pokemon, score').eq('format', format);
  if (error) throw error;
  return Object.fromEntries(data.map(r => [r.pokemon, r.score]));
}

export async function vote(format, pokemon, score) {
  await init();
  if (!sb) {
    const v = store.get(localKey(format), {});
    if (score) v[pokemon] = score; else delete v[pokemon];
    store.set(localKey(format), v);
    return;
  }
  if (!score) {
    const { error } = await sb.from('votes').delete().eq('format', format).eq('pokemon', pokemon);
    if (error) throw error;
    return;
  }
  const { error } = await sb.from('votes').upsert({ format, pokemon, score }, { onConflict: 'format,pokemon,user_id' });
  if (error) throw error;
}

// [{pokemon, avg, votes}]
export async function summary(format) {
  await init();
  if (!sb) {
    return Object.entries(store.get(localKey(format), {})).map(([pokemon, s]) => ({ pokemon, avg: s, votes: 1 }));
  }
  const { data, error } = await sb.from('vote_summary').select('pokemon, avg, votes').eq('format', format)
    .order('avg', { ascending: false }).limit(300);
  if (error) throw error;
  return data;
}
