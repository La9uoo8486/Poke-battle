-- 포켓배틀 노트 — Supabase SQL Editor 에 통째로 붙여넣고 Run
-- 구조: 기기(익명 계정)당 포맷·포켓몬별 1표. 다시 누르면 수정, 같은 칸 다시 누르면 취소.
-- 나중에 구글/디스코드 로그인 추가 시 user_id 그대로 유지됨 (linkIdentity) → 테이블 변경 불필요.

create table if not exists public.votes (
  format     text not null check (char_length(format) <= 64),
  pokemon    text not null check (char_length(pokemon) <= 64),
  score      smallint not null check (score between 1 and 5),   -- 5=S 4=A 3=B 2=C 1=D
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (format, pokemon, user_id)
);
create index if not exists votes_format_idx on public.votes (format);

-- 수정 시각 자동 갱신
create or replace function public.touch_votes() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists votes_touch on public.votes;
create trigger votes_touch before update on public.votes for each row execute function public.touch_votes();

-- 행 단위 보안: 자기 표만 읽기/쓰기
alter table public.votes enable row level security;
drop policy if exists "own select" on public.votes;
drop policy if exists "own insert" on public.votes;
drop policy if exists "own update" on public.votes;
drop policy if exists "own delete" on public.votes;
create policy "own select" on public.votes for select to authenticated using (user_id = auth.uid());
create policy "own insert" on public.votes for insert to authenticated with check (user_id = auth.uid());
create policy "own update" on public.votes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own delete" on public.votes for delete to authenticated using (user_id = auth.uid());

-- 집계(누구나 읽기 가능, 개인 정보 없음)
create or replace view public.vote_summary as
  select format, pokemon,
         round(avg(score)::numeric, 2) as avg,
         count(*)::int as votes
  from public.votes
  group by format, pokemon;
grant select on public.vote_summary to anon, authenticated;
