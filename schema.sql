-- schema.sql — run in Supabase SQL editor to create tables for the MVP

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Subjects table
create table if not exists subjects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  color text,
  created_at timestamptz default now()
);

-- Tasks table
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  title text not null,
  description text,
  due_at timestamptz,
  priority smallint default 2, -- 1 high, 2 medium, 3 low
  status text default 'todo', -- todo, in-progress, done
  external_source text, -- e.g., 'canvas'
  external_id text, -- id from external system
  created_at timestamptz default now()
);

-- Notes table
create table if not exists notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  title text,
  content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Grades table
create table if not exists grades (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  title text,
  score numeric,
  max_score numeric,
  date timestamptz default now()
);

-- LMS tokens (store minimal info; consider encryption or server-only storage)
create table if not exists lti_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  provider text,
  token text,
  created_at timestamptz default now()
);

-- Sample policy (very permissive) — you MUST add fine-grained RLS policies before production.
-- Enable RLS
alter table tasks enable row level security;
-- Example policy: allow authenticated users to select/insert/update/delete their own tasks
create policy "users can manage their tasks" on tasks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Repeat RLS for other tables as needed
alter table subjects enable row level security;
create policy "users can manage their subjects" on subjects
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);