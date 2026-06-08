import { useState } from "react";
import { ShieldCheck, Mail, Phone, MapPin, Linkedin, Briefcase, GraduationCap, Award, Tag } from "lucide-react";
import { api } from "../../lib/api";
import { ToolShell, RunButton, ErrorBanner, EmptyState } from "./_ToolShell";

export default function ResumeParserPage() {
  return (
    <ToolShell
      title="Resume Parser"
      subtitle="See exactly how an ATS parses your resume — name, contact, summary, skills, every role and education entry, normalised and structured."
      icon={ShieldCheck}
      accent="from-rose-500 to-pink-500"
      testid="tool-parse"
    >
      {(ctx) => <ParserBody ctx={ctx} />}
    </ToolShell>
  );
}

function ParserBody({ ctx }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const run = async () => {
    setBusy(true); setError(null);
    try {
      const r = await api.post("/resumes/parse");
      setResult(r.data);
      ctx.refreshCredits();
    } catch (e) {
      setError({ status: e.response?.status, detail: e.response?.data?.detail || "Could not parse resume" });
    } finally {
      setBusy(false);
    }
  };

  if (!result && !error) {
    return <EmptyState
      busy={busy}
      onRun={run}
      intro="Run the parser to see your resume reconstructed as the structured profile an Applicant Tracking System would extract."
    />;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-zinc-500">Structured extraction</div>
        <RunButton onRun={run} busy={busy} label="Re-parse" />
      </div>

      <ErrorBanner error={error} onRetry={run} />

      {result && (
        <div className="mt-6 space-y-5">
          <HeaderCard result={result} />
          {result.summary && (
            <div className="jp-card rounded-2xl p-5" data-testid="parse-summary">
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-semibold mb-2">Summary</div>
              <p className="text-zinc-800 leading-relaxed">{result.summary}</p>
            </div>
          )}
          {result.skills?.length > 0 && (
            <div className="jp-card rounded-2xl p-5" data-testid="parse-skills">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-3.5 h-3.5 text-rose-600" />
                <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-semibold">Skills · {result.skills.length}</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.skills.map((s, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}
          {result.experience?.length > 0 && <ExperienceList items={result.experience} />}
          {result.education?.length > 0 && <EducationList items={result.education} />}
          {result.certifications?.length > 0 && <CertList items={result.certifications} />}
        </div>
      )}
    </div>
  );
}

function HeaderCard({ result }) {
  return (
    <div className="jp-card rounded-3xl p-6 sm:p-8" data-testid="parse-header">
      <div className="font-display text-3xl sm:text-4xl text-zinc-900 tracking-[-0.02em] font-medium">{result.name || "—"}</div>
      <div className="text-sm text-zinc-600 mt-1">{result.title || result.headline || ""}</div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-600">
        {result.email && <span className="inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-zinc-400" /> {result.email}</span>}
        {result.phone && <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-zinc-400" /> {result.phone}</span>}
        {result.location && <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-zinc-400" /> {result.location}</span>}
        {result.linkedin && <span className="inline-flex items-center gap-1.5"><Linkedin className="w-3.5 h-3.5 text-zinc-400" /> {result.linkedin}</span>}
      </div>
    </div>
  );
}

function ExperienceList({ items }) {
  return (
    <div data-testid="parse-experience">
      <div className="text-xs uppercase tracking-[0.2em] text-zinc-400 font-semibold mb-3 inline-flex items-center gap-2">
        <Briefcase className="w-3.5 h-3.5" /> Experience
      </div>
      <div className="space-y-3">
        {items.map((x, i) => (
          <div key={i} className="jp-card rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="font-semibold text-zinc-900">{x.title || x.role || "Role"}</div>
                <div className="text-sm text-zinc-600 mt-0.5">{x.company}{x.location ? ` · ${x.location}` : ""}</div>
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">{x.start_date || x.start} {x.end_date || x.end ? `– ${x.end_date || x.end}` : x.start_date ? "– Present" : ""}</div>
            </div>
            {Array.isArray(x.bullets) && x.bullets.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {x.bullets.map((b, j) => (
                  <li key={j} className="text-sm text-zinc-700 leading-relaxed flex gap-2">
                    <span className="text-zinc-300 mt-2 w-1 h-1 rounded-full bg-zinc-300 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {x.description && !x.bullets && (
              <p className="mt-2 text-sm text-zinc-700 leading-relaxed">{x.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EducationList({ items }) {
  return (
    <div data-testid="parse-education">
      <div className="text-xs uppercase tracking-[0.2em] text-zinc-400 font-semibold mb-3 inline-flex items-center gap-2">
        <GraduationCap className="w-3.5 h-3.5" /> Education
      </div>
      <div className="space-y-3">
        {items.map((e, i) => (
          <div key={i} className="jp-card rounded-2xl p-5 flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold text-zinc-900">{e.degree || e.qualification || "Degree"}</div>
              <div className="text-sm text-zinc-600 mt-0.5">{e.institution || e.school}{e.field ? ` · ${e.field}` : ""}</div>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono">{e.start_date || e.year || ""}{e.end_date ? ` – ${e.end_date}` : ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CertList({ items }) {
  return (
    <div data-testid="parse-certs">
      <div className="text-xs uppercase tracking-[0.2em] text-zinc-400 font-semibold mb-3 inline-flex items-center gap-2">
        <Award className="w-3.5 h-3.5" /> Certifications & awards
      </div>
      <div className="jp-card rounded-2xl p-5">
        <ul className="space-y-2">
          {items.map((c, i) => (
            <li key={i} className="text-sm text-zinc-700 flex items-start gap-2">
              <Award className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
              <span>{typeof c === "string" ? c : (c.name || c.title)}{c.issuer ? <span className="text-zinc-400"> · {c.issuer}</span> : null}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
