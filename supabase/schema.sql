-- Pixel Blast - centralizovana data v Supabase.
-- Spust cely skript v Supabase SQL editoru (Dashboard > SQL Editor > New query).
-- POZOR: skript zaroven resetuje leaderboard, protoze tabulky nejdriv zahodi.

drop view if exists public.leaderboard;
drop table if exists public.scores;
drop table if exists public.players;

-- Profil hrace: jeden radek na instalaci (device_id), v nem penezenka a nakupy.
create table public.players (
  id uuid primary key default gen_random_uuid(),
  device_id text not null unique,
  name text not null,
  coins integer not null default 0,
  owned text[] not null default '{}',
  skin text,
  best_score integer not null default 0,
  daily_date date,
  daily_streak integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Jeden dohrany beh = jeden radek.
create table public.scores (
  id bigint generated always as identity primary key,
  player_id uuid references public.players(id) on delete set null,
  name text not null,
  score integer not null,
  level integer not null default 1,
  coins integer not null default 0,
  created_at timestamptz not null default now()
);

create index scores_score_idx on public.scores (score desc);

-- Nejlepsi beh kazdeho jmena; klient si uz jen vezme top N.
create view public.leaderboard
with (security_invoker = on) as
select distinct on (name) name, score, level, coins, created_at
from public.scores
order by name, score desc, created_at asc;

grant select on public.leaderboard to anon, authenticated;

-- Hra bezi na verejnem anon klici, takze zapis je otevreny, ale osetreny limity.
alter table public.players enable row level security;
alter table public.scores enable row level security;

create policy "players select" on public.players
  for select to anon, authenticated using (true);

create policy "players insert" on public.players
  for insert to anon, authenticated
  with check (char_length(name) between 1 and 12 and coins >= 0 and best_score >= 0);

create policy "players update" on public.players
  for update to anon, authenticated
  using (true)
  with check (char_length(name) between 1 and 12 and coins >= 0 and best_score >= 0);

create policy "scores select" on public.scores
  for select to anon, authenticated using (true);

create policy "scores insert" on public.scores
  for insert to anon, authenticated
  with check (
    score >= 0 and score <= 1000000
    and level between 1 and 9
    and coins >= 0
    and char_length(name) between 1 and 12
  );
