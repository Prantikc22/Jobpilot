-- =====================================================================
-- Migration 003 — add columns written by /payments/verify and
--                 /payments/webhook that were missing from the schema.
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to re-run (idempotent).
-- =====================================================================

-- orders table
alter table public.orders
  add column if not exists paid_at text;

-- users table
alter table public.users
  add column if not exists subscription_started_at         text,
  add column if not exists last_renewal_at                 text,
  add column if not exists last_payment_failed_at          text,
  add column if not exists subscription_billing            text,
  add column if not exists subscription_will_cancel_at_cycle_end boolean default false,
  add column if not exists use_applyagent_email            boolean default false;
