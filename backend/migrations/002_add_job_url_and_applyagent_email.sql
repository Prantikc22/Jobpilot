-- =====================================================================
-- Migration 002 — job_url on applications, use_applyagent_email on users,
--                 ab_events table
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to re-run (idempotent).
-- =====================================================================

-- Add job_url to applications
alter table public.applications
  add column if not exists job_url text;

-- Add use_applyagent_email flag to users
alter table public.users
  add column if not exists use_applyagent_email boolean default false;

-- A/B events table (needed by /ab/variant and /ab/stats routes)
create table if not exists public.ab_events (
  id          bigserial primary key,
  experiment  text,
  variant     text,
  event       text,
  at          text
);

create index if not exists ab_events_exp_idx on public.ab_events(experiment);

alter table public.ab_events disable row level security;
