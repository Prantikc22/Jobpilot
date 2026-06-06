# JobPilot - Product Requirements Document

## Original Problem Statement
Build JobPilot - a premium, cinematic landing page + full SaaS for an autonomous Job Search Agent that uploads-once, matches, tailors, and auto-applies on behalf of users. Must rival Stripe/Linear/Arc/Apple/Vercel design quality. Must include dashboard, admin panel, onboarding wizard, Razorpay subscriptions, and AI via OpenRouter.

## Stack & Integrations
- **Frontend**: React (CRA) + Tailwind + Shadcn UI + Framer Motion + Sonner toasts
- **Backend**: FastAPI + MongoDB (env-mandated) + Motor async driver
- **Auth**: Supabase (email/password) — frontend uses @supabase/supabase-js, backend validates JWTs via supabase-py
- **Storage**: Supabase Storage `resumes` bucket (PDF/DOCX, signed URLs)
- **AI**: OpenRouter (meta-llama/llama-3.3-70b-instruct:free) for resume parse/optimize/ATS/LinkedIn/cover-letter
- **Payments**: Razorpay test mode (rzp_test_SyENxR5DvcJ1N6) for Starter ₹499 / Pro ₹999 monthly
- **Admin**: Separate JWT auth (HS256), seeded via env

## User Personas
1. **Job seeker (free)** — sees AI tools + 10 matched jobs/month, no auto-apply
2. **Starter** — 100 targeted auto-applications/month
3. **Pro** — 300 + Career Shield + priority
4. **Admin** — Operations console for user/plan/order/application management

## What's been implemented (2026-02-06)

### Landing page (world-class)

### Auth + Onboarding
- Supabase email/password sign up & sign in
- 8-step onboarding wizard (Personal → Resume → LinkedIn → Roles → Countries → Salary → Job-search email → Plan)

### User Dashboard
- KPIs (apps/interviews/offers), free-tier upgrade banner, AI tool buttons (Optimize / ATS / LinkedIn / Parse), matched jobs grid, application timeline, real auto-apply with quota enforcement

### Payments
- Full Razorpay checkout (order create → checkout.js → signature verify → plan upgrade)

### Admin
- Separate `/admin/login`, JWT-based, dashboard with KPIs (users / revenue / orders / applications), 4 tabs (Overview / Users / Orders / Apps), plan-change for any user

### Backend API
- `/api/users/me` (GET/PUT), `/api/resumes/upload + /parse + /signed-url`
- `/api/jobs/recommendations + /apply + /applications + /tailor-letter`
- `/api/payments/create-order + /verify`
- `/api/ai/optimize-resume + /ats-check + /linkedin-optimize`
- `/api/activity/feed + /stats`
- `/api/admin/login + /me + /stats + /users + /orders + /applications + /users/{id}/plan`

## Architecture decision (constraint reconciliation)
User asked for "Supabase for DB and auth". Environment mandates MongoDB-only as the database. Hybrid: **MongoDB = primary DB** (users, applications, orders), **Supabase = Auth + Storage**. Backend validates Supabase JWT and maps `supabase_user_id` into Mongo documents.

## Prioritized backlog

### P0 (still open)
- Email confirmation flow polish (depends on Supabase project config)
- Encrypt `job_search_email_password` at rest (currently stored plaintext in Mongo — never exposed via API but should be encrypted)

### P1
- Real LinkedIn/Indeed scrapers (currently seed catalogue of 12 high-quality jobs)
- Actual auto-apply workers (currently records intent in DB)
- Webhook from Razorpay for renewal / failed payment
- Resume builder UI (mini animation present; full builder deferred)

### P2
- Referrals + share links
- Multi-language support
- A/B test pricing copy
- Email recruiter relay inbox

## Test credentials
See `/app/memory/test_credentials.md`.
