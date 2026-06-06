import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plane, LogOut, Upload, Rocket, FileText, Sparkles, ShieldCheck, Linkedin, Loader2, Briefcase, CheckCircle2, ArrowUpRight, Activity } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState([]);
  const [loadingAI, setLoadingAI] = useState(null);
  const [aiPanel, setAiPanel] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { nav("/signin"); return; }
    refresh();
  }, [user, authLoading]);

  async function refresh() {
    try {
      const [me, rec, history] = await Promise.all([
        api.get("/users/me"),
        api.get("/jobs/recommendations"),
        api.get("/jobs/applications"),
      ]);
      setProfile(me.data);
      setJobs(rec.data.jobs || []);
      setApps(history.data.applications || []);
    } catch (e) {
      toast.error("Failed to load dashboard");
    }
  }

  const runAI = async (key, fn, label) => {
    setLoadingAI(key);
    setAiPanel(null);
    try {
      const result = await fn();
      setAiPanel({ key, label, result });
    } catch (e) {
      toast.error(e.response?.data?.detail || "AI failed");
    } finally {
      setLoadingAI(null);
    }
  };

  const apply = async (job) => {
    try {
      await api.post("/jobs/apply", { job_id: job.id });
      toast.success(`Applied to ${job.company}`);
      refresh();
    } catch (e) {
      const detail = e.response?.data?.detail || "Apply failed";
      if (String(detail).includes("Starter or Pro")) {
        toast.error("Auto-apply requires Starter or Pro. Redirecting…");
        setTimeout(() => nav("/pricing-checkout"), 1200);
      } else {
        toast.error(detail);
      }
    }
  };

  if (authLoading || !profile) {
    return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;
  }

  const plan = profile.plan || "free";
  const planLimit = { free: 10, starter: 100, pro: 300 }[plan];

  return (
    <div className="min-h-screen bg-zinc-50/40" data-testid="dashboard-page">
      {/* Top */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-zinc-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full jp-conic p-[1.5px]">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <Plane className="w-4 h-4 -rotate-12 text-zinc-900" />
              </div>
            </div>
            <span className="font-display font-bold tracking-tight">JobPilot</span>
            <span className="ml-3 text-xs uppercase tracking-[0.18em] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-semibold" data-testid="dashboard-plan-badge">{plan}</span>
          </Link>
          <div className="flex items-center gap-3">
            {plan === "free" && (
              <Link to="/pricing-checkout" className="hidden sm:inline-flex jp-btn-primary text-sm px-4 py-2 rounded-full" data-testid="dashboard-upgrade">
                Upgrade · ₹499
              </Link>
            )}
            <button onClick={async () => { await signOut(); nav("/"); }} className="text-sm text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1.5" data-testid="dashboard-signout">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 md:px-8 py-10">
        {/* Greeting + hero KPIs */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] text-zinc-400 font-semibold">Welcome back</span>
            <h1 className="font-display text-4xl md:text-5xl tracking-[-0.03em] text-zinc-900 font-medium mt-1">
              Hi, {(profile.full_name || user.email || "").split(" ")[0] || "there"}.
            </h1>
            <p className="text-zinc-500 mt-1.5">Your pilot is {plan === "free" ? "in recon mode" : "actively flying"} · {planLimit} applications / month</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <KPI label="Applications" value={profile.applications_count || 0} testid="kpi-apps" />
            <KPI label="Interviews" value={profile.interviews_count || 0} testid="kpi-interviews" />
            <KPI label="Offers" value={profile.offers_count || 0} testid="kpi-offers" />
          </div>
        </div>

        {/* Free tier banner */}
        {plan === "free" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-gradient-to-r from-zinc-950 to-zinc-800 text-white p-5 md:p-6 mb-8 flex items-center justify-between gap-4" data-testid="free-tier-banner">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><Rocket className="w-5 h-5" /></div>
              <div>
                <div className="font-semibold">Auto-apply is locked on Free</div>
                <div className="text-sm text-white/60">You can run AI resume update, ATS check, LinkedIn optimizer and see 10 matched jobs. Unlock auto-apply with Starter.</div>
              </div>
            </div>
            <Link to="/pricing-checkout" className="bg-white text-zinc-900 text-sm px-4 py-2 rounded-full font-medium hover:bg-zinc-100 inline-flex items-center gap-2 shrink-0" data-testid="free-tier-upgrade">Upgrade <ArrowUpRight className="w-4 h-4" /></Link>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* AI Tools */}
          <div className="lg:col-span-1 space-y-4">
            <SectionLabel>AI tools</SectionLabel>
            <AITool icon={Sparkles} title="AI Resume Optimizer" desc="Per-role rewrite + ATS uplift" busy={loadingAI === "opt"} onRun={() => runAI("opt", () => api.post("/ai/optimize-resume", {}).then(r => r.data), "Resume Optimizer")} testid="ai-resume-optimizer" />
            <AITool icon={FileText} title="ATS Checker" desc="Real ATS score + fixes" busy={loadingAI === "ats"} onRun={() => runAI("ats", () => api.post("/ai/ats-check").then(r => r.data), "ATS Checker")} testid="ai-ats-checker" />
            <AITool icon={Linkedin} title="LinkedIn Optimizer" desc="Headline + About + Skills" busy={loadingAI === "li"} onRun={() => runAI("li", () => api.post("/ai/linkedin-optimize").then(r => r.data), "LinkedIn Optimizer")} testid="ai-linkedin" />
            <AITool icon={ShieldCheck} title="Parse Resume" desc="Structured extraction" busy={loadingAI === "parse"} onRun={() => runAI("parse", () => api.post("/resumes/parse").then(r => r.data), "Resume Parser")} testid="ai-parse" />

            {aiPanel && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="jp-card rounded-2xl p-5 mt-2" data-testid="ai-result-panel">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{aiPanel.label} · result</h3>
                  <button onClick={() => setAiPanel(null)} className="text-xs text-zinc-400 hover:text-zinc-700">close</button>
                </div>
                <pre className="text-xs bg-zinc-50 rounded-xl p-3 overflow-auto max-h-80 leading-relaxed text-zinc-700 font-mono">{JSON.stringify(aiPanel.result, null, 2)}</pre>
              </motion.div>
            )}
          </div>

          {/* Matched jobs */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between">
              <SectionLabel>Matched jobs · {jobs.length}</SectionLabel>
              <span className="text-xs text-zinc-400 font-mono">refreshed just now</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mt-3">
              {jobs.map((j, i) => (
                <JobCard key={j.id} job={j} index={i} onApply={() => apply(j)} plan={plan} />
              ))}
            </div>
          </div>
        </div>

        {/* Application history */}
        {apps.length > 0 && (
          <div className="mt-12">
            <SectionLabel>Application timeline</SectionLabel>
            <div className="mt-3 jp-card rounded-2xl divide-y divide-zinc-100 overflow-hidden">
              {apps.map((a) => (
                <div key={a.id} className="px-5 py-3.5 flex items-center justify-between text-sm" data-testid={`app-row-${a.id}`}>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold text-zinc-900">{a.company}</span>
                    <span className="text-zinc-400">·</span>
                    <span className="text-zinc-600">{a.role}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-400 font-mono">
                    <span>{a.platform}</span>
                    <span>{new Date(a.submitted_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div className="text-xs uppercase tracking-[0.2em] text-zinc-400 font-semibold">{children}</div>;
}

function KPI({ label, value, testid }) {
  return (
    <div className="jp-card rounded-2xl px-5 py-3.5" data-testid={testid}>
      <div className="text-xs uppercase tracking-[0.16em] text-zinc-400 font-semibold">{label}</div>
      <div className="font-display text-2xl mt-0.5 font-medium">{value}</div>
    </div>
  );
}

function AITool({ icon: Icon, title, desc, busy, onRun, testid }) {
  return (
    <button onClick={onRun} className="w-full text-left jp-card rounded-2xl p-4 hover:border-zinc-300 transition-all group" data-testid={testid}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-zinc-900 text-sm">{title}</div>
          <div className="text-xs text-zinc-500">{desc}</div>
        </div>
        <ArrowUpRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-700 transition-colors" />
      </div>
    </button>
  );
}

function JobCard({ job, index, onApply, plan }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4 }}
      whileHover={{ y: -3 }}
      className="jp-card rounded-2xl p-5"
      data-testid={`job-card-${job.id}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-[0.18em] text-zinc-400 font-semibold">{job.platform}</div>
        <div className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono">{Math.round(job.match_score * 100)}% match</div>
      </div>
      <h3 className="font-display text-xl text-zinc-900 leading-tight tracking-[-0.02em]">{job.role}</h3>
      <div className="mt-1 text-sm text-zinc-600 font-medium">{job.company}</div>
      <div className="mt-1.5 text-xs text-zinc-400">{job.location} · {job.salary}</div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {job.tags?.slice(0, 3).map((t) => (
          <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">{t}</span>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[11px] text-zinc-400 font-mono">{job.posted_days_ago === 0 ? "today" : `${job.posted_days_ago}d ago`}</span>
        <button onClick={onApply} className={`text-xs px-3 py-1.5 rounded-full font-medium ${plan === "free" ? "bg-zinc-200 text-zinc-500" : "jp-btn-primary"}`} data-testid={`apply-${job.id}`}>
          {plan === "free" ? "Locked · Upgrade" : "Apply now"}
        </button>
      </div>
    </motion.div>
  );
}
