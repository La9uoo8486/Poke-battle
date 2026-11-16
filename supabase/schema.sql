-- Poke-battle votes schema (paste all and Run)
create table if not exists public.votes (
  format     text not null check (char_length(format) <= 64),
  pokemon    text not null check (char_length(pokemon) <= 64),
  score      smallint not null check (score between 1 and 5),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (format, pokemon, user_id)
);
create index if not exists votes_format_idx on public.votes (format);

create or replace function public.touch_votes() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists votes_touch on public.votes;
create trigger votes_touch before update on public.votes for each row execute function public.touch_votes();

alter table public.votes enable row level security;
drop policy if exists "own select" on public.votes;
drop policy if exists "own insert" on public.votes;
drop policy if exists "own update" on public.votes;
drop policy if exists "own delete" on public.votes;
create policy "own select" on public.votes for select to authenticated using (user_id = auth.uid());
create policy "own insert" on public.votes for insert to authenticated with check (user_id = auth.uid());
create policy "own update" on public.votes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own delete" on public.votes for delete to authenticated using (user_id = auth.uid());

create or replace view public.vote_summary as
  select format, pokemon,
         round(avg(score)::numeric, 2) as avg,
         count(*)::int as votes
  from public.votes
  group by format, pokemon;
grant select on public.vote_summary to anon, authenticated;
