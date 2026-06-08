import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Tag } from "lucide-react";
import { api } from "../../lib/api";
import { ToolShell, RunButton, ErrorBanner, EmptyState } from "./_ToolShell";

export default function ResumeOptimizerPage() {
  return (
    <ToolShell
      title="Resume Optimizer"
      subtitle="Targeted, per-role rewrite suggestions. We surface every weak bullet, give you a punchier replacement, and tell you which keywords are missing for your target role."
      icon={Sparkles}
      accent="from-indigo-500 to-violet-500"
      testid="tool-optimize"
    >
      {(ctx) => <OptimizerBody ctx={ctx} />}
    </ToolShell>
  );
}

function OptimizerBody({ ctx }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [targetRole, setTargetRole] = useState("");

  const run = async () => {
    setBusy(true); setError(null);
    try {
      const r = await api.post("/ai/optimize-resume", { target_role: targetRole || undefined });
      setResult(r.data);
      ctx.refreshCredits();
    } catch (e) {
      setError({ status: e.response?.status, detail: e.response?.data?.detail || "Could not optimize" });
    } finally {
      setBusy(false);
    }
  };

  if (!result && !error) {
    return (
      <div>
        <div className="jp-card rounded-3xl p-6 sm:p-8">
          <label className="text-xs uppercase tracking-[0.2em] text-zinc-400 font-semibold">Target role (optional)</label>
          <input
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Senior Backend Engineer at a Series-B SaaS"
            className="mt-2 w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-400"
            data-testid="optimize-target-role"
          />
          <p className="text-xs text-zinc-500 mt-2">Leave blank to use your default target role from onboarding.</p>
          <div className="mt-5">
            <RunButton onRun={run} busy={busy} label="Run AI Optimizer" />
            <span className="text-[11px] text-zinc-400 ml-3">Uses 1 AI credit</span>
          </div>
        </div>
      </div>
    );
  }

  const score = result?.ats_score ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-zinc-500">{targetRole ? `Tailored for: ${targetRole}` : "Tailored for your default target role"}</div>
        <RunButton onRun={run} busy={busy} label="Re-run" />
      </div>

      <ErrorBanner error={error} onRetry={run} />

      {result && (
        <div className="mt-6 space-y-5">
          <div className="grid sm:grid-cols-3 gap-4">
            <StatTile label="ATS uplift score" value={score} suffix="/100" testid="opt-score" />
            <StatTile label="Overall grade" value={result.overall_grade || "—"} testid="opt-grade" />
            <StatTile label="Improvements" value={(result.improvements || []).length} testid="opt-count" />
          </div>

          {result.summary_rewrite && (
            <div className="jp-card rounded-2xl p-5" data-testid="opt-summary-rewrite">
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-semibold">Suggested summary rewrite</div>
              <p className="mt-2 text-zinc-800 leading-relaxed">{result.summary_rewrite}</p>
            </div>
          )}

          {result.keywords_to_add?.length > 0 && (
            <div className="jp-card rounded-2xl p-5" data-testid="opt-keywords">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                <h3 className="font-semibold text-sm text-zinc-900">Keywords to weave in</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.keywords_to_add.map((k, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">{k}</span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-400 font-semibold">Improvements</h2>
            {(result.improvements || []).length === 0 ? (
              <div className="jp-card rounded-2xl p-5 text-sm text-zinc-500">No targeted rewrites — your resume is in good shape.</div>
            ) : (
              result.improvements.map((imp, i) => <ImprovementCard key={i} improvement={imp} index={i} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, suffix, testid }) {
  return (
    <div className="jp-card rounded-2xl p-4 sm:p-5" data-testid={testid}>
      <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-400 font-semibold">{label}</div>
      <div className="font-display text-2xl sm:text-3xl mt-1.5 font-medium tracking-tight">
        {value}{suffix && <span className="text-base text-zinc-400 ml-1">{suffix}</span>}
      </div>
    </div>
  );
}

function ImprovementCard({ improvement, index }) {
  const { section, before, after, reason } = improvement;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="jp-card rounded-2xl p-5"
      data-testid={`opt-improvement-${index}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-400 font-semibold">{section || "Section"}</div>
        <div className="text-[10px] uppercase tracking-[0.16em] text-indigo-600 font-semibold">#{index + 1}</div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-xl bg-rose-50/60 border border-rose-100 p-3">
          <div className="text-[10px] uppercase tracking-[0.16em] text-rose-600 font-semibold mb-1.5">Before</div>
          <p className="text-sm text-zinc-800 leading-relaxed line-through decoration-rose-300/70 decoration-1">{before}</p>
        </div>
        <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-3">
          <div className="text-[10px] uppercase tracking-[0.16em] text-emerald-600 font-semibold mb-1.5 flex items-center gap-1">After <ArrowRight className="w-3 h-3" /></div>
          <p className="text-sm text-zinc-900 leading-relaxed font-medium">{after}</p>
        </div>
      </div>
      {reason && (
        <div className="mt-3 text-xs text-zinc-500 leading-relaxed">
          <span className="font-semibold text-zinc-700">Why:</span> {reason}
        </div>
      )}
    </motion.div>
  );
}
