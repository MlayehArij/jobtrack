-- JobTrack : table des candidatures + sécurité par utilisateur
-- À coller dans Supabase > SQL Editor, puis "Run".

create table public.applications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company     text not null,
  link        text not null default '',
  position    text not null default '',
  city        text not null default '',
  date        date not null default current_date,
  status      text not null default 'Applied' check (status in ('Applied','Interview','Accepted','Rejected')),
  notes       text not null default '',
  offer_text  text not null default '',          -- pour l'IA plus tard
  match_score int check (match_score between 0 and 100), -- pour l'IA plus tard
  created_at  timestamptz not null default now()
);

-- Sécurité : chaque utilisateur ne voit et ne modifie QUE ses lignes (Row Level Security)
alter table public.applications enable row level security;

create policy "read own"   on public.applications for select using (auth.uid() = user_id);
create policy "insert own" on public.applications for insert with check (auth.uid() = user_id);
create policy "update own" on public.applications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on public.applications for delete using (auth.uid() = user_id);
