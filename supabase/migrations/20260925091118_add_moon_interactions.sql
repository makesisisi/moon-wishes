create table public.moon_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('mooncake', 'moonwatch')),
  created_at timestamptz not null default now(),
  unique (user_id, kind)
);

create index moon_interactions_kind_created_idx
  on public.moon_interactions (kind, created_at desc);

alter table public.moon_interactions enable row level security;

create policy "Everyone can count moon interactions" on public.moon_interactions
  for select to anon, authenticated using (true);

create policy "A signed-in guest can join each ritual once" on public.moon_interactions
  for insert to authenticated
  with check (user_id = (select auth.uid()));

revoke all on public.moon_interactions from anon, authenticated;
grant select (id, kind, created_at) on public.moon_interactions to anon, authenticated;
grant insert (kind) on public.moon_interactions to authenticated;
