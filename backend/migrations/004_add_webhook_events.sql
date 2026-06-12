-- =====================================================================
-- Migration 004 — create webhook_events table used by /payments/webhook
--                 for idempotency + admin observability.
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to re-run (idempotent).
-- =====================================================================

create table if not exists public.webhook_events (
  id             uuid primary key default gen_random_uuid(),
  raw_event_id   text,
  event          text,
  entity_id      text,
  received_at    text,
  processed      boolean default false,
  summary        jsonb
);

create unique index if not exists webhook_events_raw_event_id_uidx on public.webhook_events(raw_event_id) where raw_event_id is not null;
create index if not exists webhook_events_event_idx        on public.webhook_events(event);
create index if not exists webhook_events_processed_idx    on public.webhook_events(processed);
create index if not exists webhook_events_received_at_idx  on public.webhook_events(received_at desc);
