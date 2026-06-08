import { useState } from "react";
import { Linkedin, Copy, Check } from "lucide-react";
import { api } from "../../lib/api";
import { ToolShell, RunButton, ErrorBanner, EmptyState } from "./_ToolShell";

export default function LinkedInOptimizerPage() {
  return (
    <ToolShell
      title="LinkedIn Optimizer"
      subtitle="A new headline that hooks recruiters, a real About section, the 15 skills LinkedIn will actually rank you for, and 5 concrete profile fixes you can ship in 10 minutes."
      icon={Linkedin}
      accent="from-sky-500 to-blue-600"
      testid="tool-linkedin"
    >
      {(ctx) => <LinkedInBody ctx={ctx} />}
    </ToolShell>
  );
}

function LinkedInBody({ ctx }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const run = async () => {
    setBusy(true); setError(null);
    try {
      const r = await api.post("/ai/linkedin-optimize");
      setResult(r.data);
      ctx.refreshCredits();
    } catch (e) {
      setError({ status: e.response?.status, detail: e.response?.data?.detail || "Could not optimize LinkedIn" });
    } finally {
      setBusy(false);
    }
  };

  if (!result && !error) {
    return <EmptyState
      busy={busy}
      onRun={run}
      intro="We’ll read your resume and generate the exact LinkedIn copy you should paste in — headline, about, top 15 skills, plus a punchlist of 5 quick wins."
    />;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-zinc-500">Built from your resume</div>
        <RunButton onRun={run} busy={busy} label="Re-run" />
      </div>

      <ErrorBanner error={error} onRetry={run} />

      {result && (
        <div className="mt-6 space-y-5">
          {result.headline && <HeadlineCard headline={result.headline} />}
          {result.about && <AboutCard about={result.about} />}
          {result.skills?.length > 0 && <SkillsCard skills={result.skills} />}
          {result.recommendations?.length > 0 && <RecsCard recs={result.recommendations} />}
        </div>
      )}
    </div>
  );
}

function CopyButton({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="text-[11px] text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1.5 font-mono"
      data-testid="copy-btn"
    >
      {done ? <><Check className="w-3.5 h-3.5 text-emerald-500" /> copied</> : <><Copy className="w-3.5 h-3.5" /> copy</>}
    </button>
  );
}

function HeadlineCard({ headline }) {
  return (
    <div className="jp-card rounded-2xl p-5" data-testid="li-headline-card">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-semibold">Headline · ≤220 chars</div>
        <CopyButton text={headline} />
      </div>
      <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4">
        <p className="font-display text-xl sm:text-2xl text-zinc-900 leading-snug tracking-tight">{headline}</p>
      </div>
      <div className="text-[11px] text-zinc-500 mt-2 font-mono">{headline.length} / 220</div>
    </div>
  );
}

function AboutCard({ about }) {
  return (
    <div className="jp-card rounded-2xl p-5" data-testid="li-about-card">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-semibold">About section</div>
        <CopyButton text={about} />
      </div>
      <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4">
        <p className="text-zinc-800 leading-relaxed whitespace-pre-line text-[15px]">{about}</p>
      </div>
    </div>
  );
}

function SkillsCard({ skills }) {
  return (
    <div className="jp-card rounded-2xl p-5" data-testid="li-skills-card">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-semibold">Top skills · {skills.length}</div>
        <CopyButton text={skills.join(", ")} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((s, i) => (
          <span
            key={i}
            className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-100 text-sky-800 font-medium"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function RecsCard({ recs }) {
  return (
    <div className="jp-card rounded-2xl p-5" data-testid="li-recs-card">
      <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-semibold mb-3">Action items</div>
      <ol className="space-y-3">
        {recs.map((r, i) => (
          <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-zinc-800">
            <div className="w-6 h-6 rounded-full bg-zinc-900 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">{i + 1}</div>
            <span>{r}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
