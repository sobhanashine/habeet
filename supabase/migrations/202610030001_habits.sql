create table if not exists public.habits (
  id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  reason text not null default '' check (char_length(reason) <= 500),
  icon text not null check (icon in ('cigarette','phone','moon','coffee','heart','leaf')),
  color text not null check (color in ('green','lavender','peach','blue')),
  goal_days integer not null check (goal_days in (7,14,30,60,90)),
  runs jsonb not null check (jsonb_typeof(runs) = 'array' and jsonb_array_length(runs) between 1 and 1000),
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create index if not exists habits_user_id_idx on public.habits(user_id);
alter table public.habits enable row level security;
revoke all on public.habits from anon;
grant select, insert, update, delete on public.habits to authenticated;

create policy "Users read their own habits" on public.habits for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users create their own habits" on public.habits for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update their own habits" on public.habits for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users delete their own habits" on public.habits for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.habits_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger habits_updated_at before update on public.habits for each row execute function public.habits_updated_at();
