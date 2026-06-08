import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, CheckCircle2, AlertTriangle, Tag, FileWarning } from "lucide-react";
import { api } from "../../lib/api";
import { ToolShell, RunButton, ErrorBanner, EmptyState } from "./_ToolShell";

export default function ATSCheckerPage() {
  return (
    <ToolShell
      title="ATS Checker"
      subtitle="Run your resume through a real ATS lens. We surface what passes, what to fix, missing keywords, and formatting gotchas — so recruiter software actually parses you."
      icon={ShieldCheck}
      accent="from-emerald-500 to-teal-500"
      testid="tool-ats"
    >
      {(ctx) => <ATSBody ctx={ctx} />}
    </ToolShell>
  );
}

function ATSBody({ ctx }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const run = async () => {
    setBusy(true); setError(null);
    try {
      const r = await api.post("/ai/ats-check");
      setResult(r.data);
      ctx.refreshCredits();
    } catch (e) {
      setError({ status: e.response?.status, detail: e.response?.data?.detail || "Could not run ATS check" });
    } finally {
      setBusy(false);
    }
  };

  if (!result && !error) {
    return <EmptyState
      busy={busy}
      onRun={run}
      intro="Hit Run AI and we’ll score your resume across the same heuristics a real Applicant Tracking System uses — keyword density, structure, formatting, parsability."
    />;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-zinc-500">Resume analysed · ATS lens v2</div>
        <RunButton onRun={run} busy={busy} label="Re-run" />
      </div>

      <ErrorBanner error={error} onRetry={run} />

      {result && (
        <div className="mt-6 space-y-5">
          <ScoreGauge score={result.score} />
          <div className="grid md:grid-cols-2 gap-4">
            <SectionCard
              title="What passes"
              icon={CheckCircle2}
              tone="emerald"
              items={result.passes}
              empty="Nothing flagged as a clear win — let’s strengthen the structure."
              testid="ats-passes"
            />
            <SectionCard
              title="Warnings"
              icon={AlertTriangle}
              tone="amber"
              items={result.warnings}
              empty="Clean — no warnings."
              testid="ats-warnings"
            />
            <KeywordCard
              missing={result.missing_keywords || []}
            />
            <SectionCard
              title="Formatting issues"
              icon={FileWarning}
              tone="rose"
              items={result.formatting_issues}
              empty="Formatting looks ATS-friendly."
              testid="ats-formatting"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreGauge({ score = 0 }) {
  const pct = Math.max(0, Math.min(100, score));
  const ringColor = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
  const grade = pct >= 90 ? "A" : pct >= 80 ? "B" : pct >= 70 ? "C" : pct >= 60 ? "D" : "F";
  const verdict = pct >= 80 ? "Strong" : pct >= 60 ? "Decent — fixable" : "Needs work";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="jp-card rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6"
      data-testid="ats-score-gauge"
    >
      <div className="relative w-32 h-32 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#f4f4f5" strokeWidth="10" />
          <motion.circle
            cx="50" cy="50" r="42" fill="none"
            stroke={ringColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 264} 264`}
            initial={{ strokeDasharray: "0 264" }}
            animate={{ strokeDasharray: `${(pct / 100) * 264} 264` }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-display text-4xl font-medium tracking-tight" data-testid="ats-score-value">{pct}</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-semibold">/ 100</div>
        </div>
      </div>
      <div className="flex-1 text-center sm:text-left">
        <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-400 font-semibold">ATS verdict</div>
        <div className="font-display text-2xl sm:text-3xl text-zinc-900 mt-1">{verdict}</div>
        <div className="text-sm text-zinc-600 mt-2 max-w-md">
          Grade <span className="font-semibold text-zinc-900">{grade}</span>. Work through the warnings on the right; each one usually adds 4–8 points.
        </div>
      </div>
    </motion.div>
  );
}

function SectionCard({ title, icon: Icon, tone, items = [], empty, testid }) {
  const toneMap = {
    emerald: "text-emerald-600 bg-emerald-50",
    amber:   "text-amber-700 bg-amber-50",
    rose:    "text-rose-700 bg-rose-50",
  };
  return (
    <div className="jp-card rounded-2xl p-5" data-testid={testid}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg ${toneMap[tone]} flex items-center justify-center`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <h3 className="font-semibold text-zinc-900 text-sm">{title}</h3>
        {items?.length > 0 && <span className="text-[11px] text-zinc-400 font-mono">{items.length}</span>}
      </div>
      {(!items || items.length === 0) ? (
        <div className="text-xs text-zinc-400 italic">{empty}</div>
      ) : (
        <ul className="space-y-2">
          {items.map((s, i) => (
            <li key={i} className="text-sm text-zinc-700 leading-relaxed flex gap-2">
              <span className="text-zinc-300 mt-1.5 w-1 h-1 rounded-full bg-zinc-300 shrink-0" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function KeywordCard({ missing }) {
  return (
    <div className="jp-card rounded-2xl p-5" data-testid="ats-missing-keywords">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Tag className="w-3.5 h-3.5" />
        </div>
        <h3 className="font-semibold text-zinc-900 text-sm">Missing keywords</h3>
        {missing.length > 0 && <span className="text-[11px] text-zinc-400 font-mono">{missing.length}</span>}
      </div>
      {missing.length === 0 ? (
        <div className="text-xs text-zinc-400 italic">Strong keyword coverage.</div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {missing.map((k, i) => (
            <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">{k}</span>
          ))}
        </div>
      )}
      <div className="mt-3 text-[11px] text-zinc-500">Weave 3–5 of these into bullets where they’re actually true. Don’t keyword-stuff.</div>
    </div>
  );
}
