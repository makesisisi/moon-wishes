-- Initial production schema for the public Mid-Autumn wishes wall.
create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nickname text not null default '月下旅人' check (char_length(btrim(nickname)) between 1 and 10),
  content text not null check (char_length(btrim(content)) between 1 and 60),
  status text not null default 'approved' check (status in ('approved', 'hidden')),
  created_at timestamptz not null default now()
);

create index wishes_visible_recent_idx on public.wishes (created_at desc) where status = 'approved';
create index wishes_author_recent_idx on public.wishes (user_id, created_at desc);

alter table public.wishes enable row level security;

create policy "Everyone can read approved wishes" on public.wishes
  for select to anon, authenticated using (status = 'approved');

create policy "A signed-in guest can send only their own approved wish" on public.wishes
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'approved');

-- The client cannot supply user_id, status, id or created_at in an INSERT.
revoke all on public.wishes from anon, authenticated;
grant select on public.wishes to anon, authenticated;
grant insert (nickname, content) on public.wishes to authenticated;

-- Serialize submissions from the same guest and enforce a server-side interval.
create function public.enforce_wish_interval()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.content := btrim(new.content);
  new.nickname := btrim(new.nickname);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text, 0));
  if exists (
    select 1 from public.wishes
    where user_id = new.user_id and created_at > pg_catalog.now() - interval '15 seconds'
  ) then
    raise exception 'Wait 15 seconds before sending another wish';
  end if;
  return new;
end;
$$;

create trigger wishes_interval before insert on public.wishes
for each row execute function public.enforce_wish_interval();

-- This project intentionally uses Postgres Changes for the small public wish wall.
alter publication supabase_realtime add table public.wishes;
