-- =====================================================================
-- JobPilot — Supabase Postgres schema
-- ---------------------------------------------------------------------
-- Paste this entire file into:
--   Supabase Dashboard → SQL Editor → "New query" → Run.
-- It is idempotent (safe to re-run).
-- ---------------------------------------------------------------------
-- After running this once, the application code automatically migrates
-- the existing MongoDB data into these tables on the next backend start.
-- =====================================================================

-- -----------------------------------------------------------------
-- USERS
-- -----------------------------------------------------------------
create table if not exists public.users (
  supabase_user_id          text primary key,
  email                     text,
  full_name                 text,
  phone                     text,
  linkedin_url              text,

  target_roles              jsonb default '[]'::jsonb,
  target_countries          jsonb default '[]'::jsonb,
  preferred_salary          text,

  job_search_email          text,
  job_search_email_password text,

  plan                      text default 'free',
  pricing_variant           text,
  applications_count        int  default 0,
  interviews_count          int  default 0,
  offers_count              int  default 0,

  resume_url                text,
  resume_path               text,
  resume_filename           text,
  resume_text               text,
  resume_parsed             jsonb,

  onboarding_step           int  default 1,
  onboarding_completed      boolean default false,

  ai_credits_used           int  default 0,
  ai_credits_period         text,
  ai_credits_last_used_at   text,

  last_auto_apply_at        text,

  referral_code             text unique,
  referred_by_code          text,
  referral_credits          int  default 0,

  razorpay_customer_id      text,
  razorpay_subscription_id  text,
  subscription_status       text,
  subscription_active_until text,
  current_period_end        text,
  current_plan_started_at   text,
  downgraded_at             text,

  created_at                text,
  updated_at                text
);

create index if not exists users_plan_idx              on public.users(plan);
create index if not exists users_referral_code_idx     on public.users(referral_code);
create index if not exists users_referred_by_code_idx  on public.users(referred_by_code);
create index if not exists users_email_idx             on public.users(email);


-- -----------------------------------------------------------------
-- APPLICATIONS (autopilot submissions)
-- -----------------------------------------------------------------
create table if not exists public.applications (
  id                  text primary key,
  supabase_user_id    text not null,
  job_id              text,
  company             text,
  role                text,
  platform            text,
  match_score         numeric,
  status              text,
  submitted_by        text,
  submitted_at        text
);

create index if not exists apps_user_idx          on public.applications(supabase_user_id);
create index if not exists apps_submitted_at_idx  on public.applications(submitted_at desc);


-- -----------------------------------------------------------------
-- ORDERS (Razorpay one-time payments)
-- -----------------------------------------------------------------
create table if not exists public.orders (
  razorpay_order_id     text primary key,
  supabase_user_id      text,
  razorpay_payment_id   text,
  razorpay_signature    text,
  amount                int,
  currency              text,
  plan                  text,
  status                text,
  created_at            text,
  updated_at            text,
  raw                   jsonb
);

create index if not exists orders_user_idx    on public.orders(supabase_user_id);
create index if not exists orders_status_idx  on public.orders(status);


-- -----------------------------------------------------------------
-- SUBSCRIPTIONS (Razorpay recurring)
-- -----------------------------------------------------------------
create table if not exists public.subscriptions (
  razorpay_subscription_id  text primary key,
  supabase_user_id          text,
  plan                      text,
  plan_id                   text,
  status                    text,
  short_url                 text,
  current_start             text,
  current_end               text,
  created_at                text,
  updated_at                text,
  raw                       jsonb
);

create index if not exists subs_user_idx    on public.subscriptions(supabase_user_id);
create index if not exists subs_status_idx  on public.subscriptions(status);


-- -----------------------------------------------------------------
-- SHARES (public share links)
-- -----------------------------------------------------------------
create table if not exists public.shares (
  token             text primary key,
  supabase_user_id  text,
  snapshot          jsonb,
  created_at        text
);

create index if not exists shares_user_idx on public.shares(supabase_user_id);


-- -----------------------------------------------------------------
-- ROW LEVEL SECURITY
-- We do all writes from the backend with the service role key, so we
-- DISABLE RLS on these tables. (Service role bypasses RLS, but
-- disabling makes the intent explicit and avoids 401s if anyone
-- accidentally uses the anon key.)
-- -----------------------------------------------------------------
alter table public.users         disable row level security;
alter table public.applications  disable row level security;
alter table public.orders        disable row level security;
alter table public.subscriptions disable row level security;
alter table public.shares        disable row level security;


-- -----------------------------------------------------------------
-- HELPER RPCs used by the backend for atomic increments
-- -----------------------------------------------------------------
create or replace function public.increment_user_counter(
  p_user_id text,
  p_field   text,
  p_by      int default 1
) returns void
language plpgsql
security definer
as $$
begin
  if p_field = 'applications_count' then
    update public.users set applications_count = coalesce(applications_count, 0) + p_by where supabase_user_id = p_user_id;
  elsif p_field = 'interviews_count' then
    update public.users set interviews_count = coalesce(interviews_count, 0) + p_by where supabase_user_id = p_user_id;
  elsif p_field = 'offers_count' then
    update public.users set offers_count = coalesce(offers_count, 0) + p_by where supabase_user_id = p_user_id;
  elsif p_field = 'referral_credits' then
    update public.users set referral_credits = coalesce(referral_credits, 0) + p_by where supabase_user_id = p_user_id;
  elsif p_field = 'ai_credits_used' then
    update public.users set ai_credits_used = coalesce(ai_credits_used, 0) + p_by where supabase_user_id = p_user_id;
  end if;
end;
$$;

grant execute on function public.increment_user_counter(text, text, int) to anon, authenticated, service_role;
