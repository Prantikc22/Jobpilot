import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plane, ArrowLeft, Loader2, Zap, AlertTriangle, RotateCw } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";

export function ToolShell({ title, subtitle, icon: Icon, accent = "from-indigo-500 to-violet-500", children, testid }) {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [credits, setCredits] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { nav("/signin"); return; }
    api.get("/ai/credits").then(r => setCredits(r.data)).catch(() => {});
  }, [user, authLoading, nav]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/40" data-testid={testid}>
      <header className="bg-white/80 backdrop-blur-xl border-b border-zinc-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 h-14 sm:h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full jp-conic p-[1.5px]">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <Plane className="w-3.5 h-3.5 -rotate-12 text-zinc-900" />
              </div>
            </div>
            <span className="font-display font-bold tracking-tight text-sm">JobPilot</span>
          </Link>
          <Link to="/dashboard" className="text-xs sm:text-sm text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12">
        <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
          <div>
            <div className={`inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r ${accent}`}>
              <Icon className="w-3.5 h-3.5" /> AI tool
            </div>
            <h1 className="font-display text-3xl sm:text-5xl tracking-[-0.03em] text-zinc-900 font-medium mt-3">{title}</h1>
            <p className="text-zinc-600 mt-2 max-w-2xl">{subtitle}</p>
          </div>
          {credits && (
            <div className="jp-card rounded-2xl px-4 py-3 shrink-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-400 font-semibold inline-flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-500" /> Credits
              </div>
              <div className="mt-1.5 flex items-center gap-1.5" aria-label={`${credits.remaining} of ${credits.total} AI credits remaining`}>
                {Array.from({ length: credits.total }).map((_, i) => {
                  const filled = i < credits.remaining;
                  return (
                    <div
                      key={i}
                      className={`w-6 h-7 rounded-md transition-colors ${filled ? "bg-gradient-to-b from-amber-300 to-amber-500" : "bg-zinc-100 border border-dashed border-zinc-200"}`}
                    />
                  );
                })}
              </div>
              <div className="mt-1 text-[10px] text-zinc-500">{credits.remaining} of {credits.total} this month</div>
            </div>
          )}
        </div>

        <div className="mt-8">
          {children({ credits, refreshCredits: () => api.get("/ai/credits").then(r => setCredits(r.data)).catch(() => {}) })}
        </div>
      </main>
    </div>
  );
}

export function RunButton({ onRun, busy, disabled, label = "Run AI" }) {
  return (
    <button
      onClick={onRun}
      disabled={busy || disabled}
      className="jp-btn-primary px-6 py-3 rounded-full inline-flex items-center gap-2 disabled:opacity-50"
      data-testid="run-ai-btn"
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
      {busy ? "Thinking…" : label}
    </button>
  );
}

export function ErrorBanner({ error, onRetry }) {
  if (!error) return null;
  const isRate = error.status === 503;
  const isQuota = error.status === 402;
  const Icon = isRate ? RotateCw : AlertTriangle;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-4 sm:p-5 mt-4 border ${isQuota ? "bg-rose-50 border-rose-100" : "bg-amber-50 border-amber-100"}`}
      data-testid="ai-error-banner"
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 ${isQuota ? "text-rose-600" : "text-amber-700"} shrink-0`} />
        <div className="flex-1">
          <div className={`font-semibold text-sm ${isQuota ? "text-rose-900" : "text-amber-900"}`}>
            {isQuota ? "You’re out of AI credits" : isRate ? "AI briefly busy" : "AI failed"}
          </div>
          <div className={`text-xs mt-0.5 ${isQuota ? "text-rose-800" : "text-amber-800"}`}>
            {error.detail || "Try again in 30 seconds."}
            {isRate && " Your credit was NOT charged."}
          </div>
          {!isQuota && onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-900 text-white hover:bg-amber-800"
              data-testid="ai-retry-btn"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function EmptyState({ onRun, busy, intro }) {
  return (
    <div className="jp-card rounded-3xl p-8 sm:p-12 text-center" data-testid="tool-empty-state">
      <div className="text-sm text-zinc-600 max-w-md mx-auto">{intro}</div>
      <div className="mt-5">
        <RunButton onRun={onRun} busy={busy} />
      </div>
      <div className="text-[11px] text-zinc-400 mt-3">Uses 1 AI credit</div>
    </div>
  );
}
