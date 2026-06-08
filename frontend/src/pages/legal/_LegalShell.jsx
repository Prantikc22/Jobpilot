import { Link } from "react-router-dom";
import { Plane, ArrowLeft } from "lucide-react";

export function LegalShell({ title, updated, children, testid }) {
  return (
    <div className="min-h-screen bg-white" data-testid={testid}>
      <header className="border-b border-zinc-100 bg-white/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full jp-conic p-[1.5px]">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <Plane className="w-4 h-4 -rotate-12 text-zinc-900" />
              </div>
            </div>
            <span className="font-display font-bold text-[17px] tracking-tight">JobPilot</span>
          </Link>
          <Link to="/" className="text-sm text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        <div className="text-xs uppercase tracking-[0.2em] text-zinc-400 font-semibold">Legal</div>
        <h1 className="font-display text-3xl sm:text-5xl tracking-[-0.03em] mt-2 font-medium text-zinc-900">
          {title}
        </h1>
        <div className="text-sm text-zinc-500 mt-2">Last updated: {updated}</div>
        <article className="mt-8 prose-jp space-y-5 text-[15px] leading-relaxed text-zinc-700">
          {children}
        </article>
        <div className="mt-16 pt-6 border-t border-zinc-100 text-xs text-zinc-400">
          Questions? Email <a href="mailto:support@jobpilot.ai" className="underline hover:text-zinc-700">support@jobpilot.ai</a>.
        </div>
      </main>
    </div>
  );
}

export function H2({ children }) {
  return <h2 className="font-display text-xl sm:text-2xl text-zinc-900 mt-8 tracking-tight font-medium">{children}</h2>;
}

export function P({ children }) {
  return <p className="text-zinc-700">{children}</p>;
}

export function UL({ children }) {
  return <ul className="list-disc pl-6 space-y-1.5 text-zinc-700">{children}</ul>;
}
