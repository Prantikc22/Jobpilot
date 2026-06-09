import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plane, LogOut, FileText, Sparkles, ShieldCheck, Linkedin, Loader2,
  Briefcase, CheckCircle2, ArrowUpRight, Rocket, Zap, Activity,
  Radar, Clock, Mail, Eye, EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import ResumeManager from "../components/app/ResumeManager";
import ShareWidget from "../components/app/ShareWidget";
import ReferralWidget from "../components/app/ReferralWidget";

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState(null);
  const [apps, setApps] = useState([]);
  const [queue, setQueue] = useState([]);
  const [status, setStatus] = useState(null);
  const [credits, setCredits] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { nav("/signin"); return; }
    refresh();
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, [user, authLoading, nav]); // eslint-disable-line react-hooks/exhaustive-deps

  async function refresh() {
    try {
      const [me, q, hist, st, cr] = await Promise.all([
        api.get("/users/me"),
        api.get("/jobs/queue"),
        api.get("/jobs/applications"),
        api.get("/jobs/autopilot-status"),
        api.get("/ai/credits"),
      ]);
      setProfile(me.data);
      setQueue(q.data.queue || []);
      setApps(hist.data.applications || []);
      setStatus(st.data);
      setCredits(cr.data);
    } catch (e) {
      // silent — dashboard re-polls
    }
  }

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  const plan = profile.plan || "free";
  const planLimit = { free: 0, starter: 100, pro: 300 }[plan];
  const submittedThisMonth = status?.applications_count ?? profile.applications_count ?? 0;
  const remaining = status?.remaining ?? Math.max(0, planLimit - submittedThisMonth);
  const hasEmailCreds = profile.job_search_email || profile.use_applyagent_email;

  return (
    <div className="min-h-screen bg-zinc-50/40" data-testid="dashboard-page">
      <header className="bg-white/80 backdrop-blur-xl border-b border-zinc-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full jp-conic p-[1.5px] shrink-0">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <Plane className="w-3.5 h-3.5 sm:w-4 sm:h-4 -rotate-12 text-zinc-900" />
              </div>
            </div>
            <span className="font-display font-bold tracking-tight text-sm sm:text-base">ApplyAgent</span>
            <span className="ml-2 sm:ml-3 text-[10px] sm:text-xs uppercase tracking-[0.18em] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-semibold" data-testid="dashboard-plan-badge">{plan}</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {plan === "free" && (
              <Link to="/pricing-checkout" className="jp-btn-primary text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full whitespace-nowrap" data-testid="dashboard-upgrade">
                <span className="hidden sm:inline">Upgrade · </span>₹499
              </Link>
            )}
            <button
              onClick={async () => { await signOut(); nav("/"); }}
              className="text-xs sm:text-sm text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1.5"
              data-testid="dashboard-signout"
            >
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-10">
        <AutopilotHero profile={profile} status={status} plan={plan} remaining={remaining} />

        <div className="grid md:grid-cols-4 gap-4 mt-6">
          <CreditsCard credits={credits} />
          <KPI icon={Briefcase} label="Applications" value={submittedThisMonth} sub={`of ${planLimit || "—"} this month`} testid="kpi-apps" />
          <KPI icon={Activity} label="Interviews" value={profile.interviews_count || 0} sub="tracked" testid="kpi-interviews" />
          <KPI icon={Rocket} label="Offers" value={profile.offers_count || 0} sub="🎉" testid="kpi-offers" />
        </div>

        {plan === "free" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-gradient-to-r from-zinc-950 to-zinc-800 text-white p-4 sm:p-5 md:p-6 mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
            data-testid="free-tier-banner"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Rocket className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm sm:text-base">Autopilot is paused on Free</div>
                <div className="text-xs sm:text-sm text-white/60">You still get 3 AI credits/month and can preview jobs. Upgrade to unlock the autopilot — we'll apply on your behalf.</div>
              </div>
            </div>
            <Link to="/pricing-checkout" className="bg-white text-zinc-900 text-sm px-4 py-2 rounded-full font-medium hover:bg-zinc-100 inline-flex items-center gap-2 shrink-0 self-start sm:self-auto" data-testid="free-tier-upgrade">
              Upgrade <ArrowUpRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-5 sm:gap-6 mt-6 sm:mt-8">
          <div className="lg:col-span-1 space-y-4">
            <SectionLabel>Your resume</SectionLabel>
            <ResumeManager profile={profile} onUpdated={refresh} />

            {hasEmailCreds && (
              <>
                <SectionLabel>Job search email</SectionLabel>
                <EmailCredsCard profile={profile} />
              </>
            )}

            <div className="flex items-center justify-between mt-2">
              <SectionLabel>AI tools</SectionLabel>
              {credits && (
                <span className="text-[11px] text-zinc-500 font-mono">
                  {credits.remaining}/{credits.total} credits left
                </span>
              )}
            </div>
            <AIToolLink
              to="/tools/optimize"
              icon={Sparkles}
              title="AI Resume Optimizer"
              desc="Per-role rewrite + ATS uplift"
              outOfCredits={credits && credits.remaining <= 0}
              testid="ai-resume-optimizer"
            />
            <AIToolLink
              to="/tools/ats"
              icon={FileText}
              title="ATS Checker"
              desc="Real ATS score + fixes"
              outOfCredits={credits && credits.remaining <= 0}
              testid="ai-ats-checker"
            />
            <AIToolLink
              to="/tools/linkedin"
              icon={Linkedin}
              title="LinkedIn Optimizer"
              desc="Headline + About + Skills"
              outOfCredits={credits && credits.remaining <= 0}
              testid="ai-linkedin"
            />
            <AIToolLink
              to="/tools/parse"
              icon={ShieldCheck}
              title="Parse Resume"
              desc="Structured extraction"
              outOfCredits={credits && credits.remaining <= 0}
              testid="ai-parse"
            />

            <SectionLabel>Share & invite</SectionLabel>
            <ShareWidget profile={profile} />
            <ReferralWidget />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <SectionLabel>Autopilot queue · next up</SectionLabel>
                <span className="text-[11px] text-zinc-400 font-mono inline-flex items-center gap-1.5">
                  <Radar className="w-3.5 h-3.5" />
                  live · updates every 30s
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                These are the jobs ApplyAgent will submit on your behalf next. You don't need to apply — sit back.
              </p>

              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                {queue.length === 0 && (
                  <div className="jp-card rounded-2xl p-5 col-span-full text-sm text-zinc-500">
                    {plan === "free"
                      ? "Upgrade to Starter or Pro to put the autopilot in flight. We'll line up matching roles here."
                      : "Queue is being built — refresh in a minute."}
                  </div>
                )}
                {queue.map((j, i) => (
                  <QueueCard key={j.id} job={j} index={i} />
                ))}
              </div>
            </div>

            <div>
              <SectionLabel>Submitted by autopilot</SectionLabel>
              {apps.length === 0 ? (
                <div className="jp-card rounded-2xl p-5 mt-3 text-sm text-zinc-500" data-testid="empty-applications">
                  No applications yet. {plan === "free"
                    ? "Upgrade to put the autopilot in flight."
                    : "Your autopilot will submit applications steadily — first one usually within a minute or two."}
                </div>
              ) : (
                <div className="mt-3 jp-card rounded-2xl divide-y divide-zinc-100 overflow-hidden">
                  {apps.map((a) => (
                    <div
                      key={a.id}
                      className="px-4 sm:px-5 py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 text-sm"
                      data-testid={`app-row-${a.id}`}
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-semibold text-zinc-900 truncate">{a.company}</span>
                          <span className="text-zinc-400 hidden sm:inline"> · </span>
                          <span className="text-zinc-600 truncate">{a.role}</span>
                        </div>
                        {a.submitted_by === "autopilot" && (
                          <span className="text-[10px] uppercase tracking-[0.16em] px-1.5 py-0.5 rounded bg-zinc-900 text-white font-semibold shrink-0">auto</span>
                        )}
                        {a.submitted_by === "admin" && (
                          <span className="text-[10px] uppercase tracking-[0.16em] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold shrink-0">added</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs text-zinc-400 font-mono pl-6 sm:pl-0">
                        {a.job_url && (
                          <a href={a.job_url} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-900 underline underline-offset-2 truncate max-w-[120px]" onClick={(e) => e.stopPropagation()}>
                            View job ↗
                          </a>
                        )}
                        <span>{a.platform}</span>
                        <span>{new Date(a.submitted_at).toLocaleDateString()} · {new Date(a.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmailCredsCard({ profile }) {
  const [showPwd, setShowPwd] = useState(false);
  const pending = profile.use_applyagent_email && !profile.job_search_email;

  if (pending) {
    return (
      <div className="jp-card rounded-2xl p-4" data-testid="email-creds-pending">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-zinc-400 font-semibold mb-2">
          <Mail className="w-3.5 h-3.5" /> Autopilot email
        </div>
        <div className="flex items-start gap-2.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-300 mt-0.5 shrink-0" />
          <p className="text-xs text-zinc-500 leading-relaxed">
            Your dedicated ApplyAgent email will appear here after your first batch of applications is submitted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="jp-card rounded-2xl p-4" data-testid="email-creds-card">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-zinc-400 font-semibold mb-3">
        <Mail className="w-3.5 h-3.5" /> Autopilot email
      </div>
      <div className="space-y-2">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-400 mb-0.5">Email</div>
          <div className="text-sm font-mono text-zinc-900 break-all">{profile.job_search_email}</div>
        </div>
        {profile.job_search_email_password && (
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-400 mb-0.5">Password</div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-zinc-700 tracking-widest">
                {showPwd ? profile.job_search_email_password : "●".repeat(Math.min(10, profile.job_search_email_password.length))}
              </span>
              <button
                onClick={() => setShowPwd(!showPwd)}
                className="text-zinc-400 hover:text-zinc-900 transition-colors"
                title={showPwd ? "Hide password" : "Show password"}
              >
                {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}
        <div className="text-[11px] text-zinc-400 pt-1">Used by your autopilot to receive recruiter replies</div>
      </div>
    </div>
  );
}

function AutopilotHero({ profile, status, plan, remaining }) {
  const active = status?.active;
  const lastApp = status?.last_application;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="jp-card rounded-3xl p-6 sm:p-8 relative overflow-hidden"
      data-testid="autopilot-hero"
    >
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br from-indigo-200/40 via-pink-100/30 to-emerald-100/30 blur-3xl pointer-events-none" />
      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row relative">
        <div className="min-w-0">
          <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-400 font-semibold inline-flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`} />
            {active ? "Autopilot in flight" : "Autopilot paused"}
          </span>
          <h1 className="font-display text-3xl sm:text-5xl tracking-[-0.03em] text-zinc-900 font-medium mt-2">
            Hi, {(profile.full_name || "there").split(" ")[0]}.
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 mt-2 max-w-xl">
            {active
              ? <>Your pilot is quietly applying to high-match roles on your behalf. <strong>{remaining}</strong> applications left this month.</>
              : plan === "free"
                ? "You're on the Free plan. Upgrade to put the autopilot in flight — we'll apply on your behalf."
                : "You've hit your monthly cap. Your quota resets at the start of next month."}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {lastApp && (
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-400 font-semibold">Last submitted</div>
              <div className="text-sm font-medium text-zinc-900">{lastApp.company} · {lastApp.role}</div>
              <div className="text-[11px] text-zinc-400 font-mono inline-flex items-center gap-1">
                <Clock className="w-3 h-3" /> {timeAgo(lastApp.submitted_at)}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function timeAgo(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function CreditsCard({ credits }) {
  const total = credits?.total ?? 3;
  const remaining = credits?.remaining ?? 3;
  return (
    <div className="jp-card rounded-2xl p-4 sm:p-5" data-testid="ai-credits-card">
      <div className="flex items-center justify-between">
        <div className="text-[10px] sm:text-xs uppercase tracking-[0.18em] text-zinc-400 font-semibold">AI Credits</div>
        <Zap className="w-3.5 h-3.5 text-amber-500" />
      </div>
      <div className="mt-2 flex items-center gap-1.5" aria-label={`${remaining} of ${total} AI credits remaining`}>
        {Array.from({ length: total }).map((_, i) => {
          const filled = i < remaining;
          return (
            <div
              key={i}
              className={`relative w-7 h-9 rounded-md transition-colors ${
                filled
                  ? "bg-gradient-to-b from-amber-300 to-amber-500 shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)]"
                  : "bg-zinc-100 border border-dashed border-zinc-200"
              }`}
              data-testid={`credit-crest-${i}-${filled ? "on" : "off"}`}
              title={filled ? "Available" : "Used"}
            >
              <div className={`absolute inset-0 flex items-center justify-center ${filled ? "text-white" : "text-zinc-300"}`}>
                <Zap className="w-3 h-3" />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2.5 text-[11px] text-zinc-500">
        <span className="font-semibold text-zinc-900">{remaining}</span> of {total} left · resets monthly
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div className="text-xs uppercase tracking-[0.2em] text-zinc-400 font-semibold">{children}</div>;
}

function KPI({ icon: Icon, label, value, sub, testid }) {
  return (
    <div className="jp-card rounded-2xl p-4 sm:p-5" data-testid={testid}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] sm:text-xs uppercase tracking-[0.18em] text-zinc-400 font-semibold">{label}</div>
        <Icon className="w-3.5 h-3.5 text-zinc-400" />
      </div>
      <div className="font-display text-2xl sm:text-3xl mt-1.5 font-medium tracking-tight">{value}</div>
      {sub && <div className="text-[11px] text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function AIToolLink({ icon: Icon, title, desc, to, outOfCredits, testid }) {
  return (
    <Link
      to={to}
      className={`block jp-card rounded-2xl p-4 transition-all group hover:border-zinc-300 ${
        outOfCredits ? "opacity-60" : ""
      }`}
      data-testid={testid}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-zinc-900 text-sm">{title}</div>
          <div className="text-xs text-zinc-500 truncate">{desc}{outOfCredits ? " · out of credits" : ""}</div>
        </div>
        <ArrowUpRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-700 transition-colors" />
      </div>
    </Link>
  );
}

function QueueCard({ job, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className="jp-card rounded-2xl p-4 sm:p-5"
      data-testid={`queue-card-${job.id}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-400 font-semibold">{job.platform}</div>
        <div className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono">
          {Math.round((job.match_score || 0.7) * 100)}% match
        </div>
      </div>
      <h3 className="font-display text-lg sm:text-xl text-zinc-900 leading-tight tracking-[-0.02em]">{job.role}</h3>
      <div className="mt-1 text-sm text-zinc-600 font-medium">{job.company}</div>
      <div className="mt-1 text-xs text-zinc-400">{job.location} · {job.salary}</div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(job.tags || []).slice(0, 3).map((t) => (
          <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">{t}</span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-500">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Queued · autopilot will submit soon
      </div>
    </motion.div>
  );
}
