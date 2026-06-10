import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Bot, FileEdit, ShieldCheck, FileSearch, Linkedin, ClipboardList, Wand2, Activity,
} from "lucide-react";

export default function BentoFeatures() {
  return (
    <section id="features" className="relative py-28 md:py-36" data-testid="features-section">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
          <div className="max-w-2xl">
            <span className="text-xs uppercase tracking-[0.24em] text-zinc-400 font-semibold">Features</span>
            <h2 className="font-display mt-3 text-4xl md:text-5xl lg:text-6xl tracking-[-0.03em] leading-[1.02] text-zinc-900 font-medium">
              A career team in your pocket.
            </h2>
          </div>
          <p className="text-zinc-500 max-w-md text-lg">
            Auto Apply is the engine. Everything else makes it irresistible to recruiters.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6 auto-rows-[180px]">
          {/* Centerpiece */}
          <CenterpieceAuto />

          <FeatureCard
            cls="col-span-1 md:col-span-4 md:row-span-2"
            icon={FileEdit}
            color="from-rose-500 to-orange-500"
            title="Resume Builder"
            desc="Beautiful ATS-friendly templates generated from your existing resume in seconds."
            testid="feature-resume-builder"
          >
            <ResumeBuilderMini />
          </FeatureCard>

          <FeatureCard
            cls="col-span-1 md:col-span-4"
            icon={Wand2}
            color="from-violet-500 to-fuchsia-500"
            title="Resume Optimizer"
            desc="Per-role rewriting so every keyword matches."
            testid="feature-resume-optimizer"
          />

          <FeatureCard
            cls="col-span-1 md:col-span-4"
            icon={FileSearch}
            color="from-emerald-500 to-teal-500"
            title="ATS Checker"
            desc="Real ATS scoring + line-by-line fixes."
            testid="feature-ats-checker"
          />

          <FeatureCard
            cls="col-span-1 md:col-span-4"
            icon={Linkedin}
            color="from-sky-500 to-indigo-500"
            title="LinkedIn Optimizer"
            desc="Headline, About, Skills — rewritten."
            testid="feature-linkedin"
          />

          <FeatureCard
            cls="col-span-1 md:col-span-6"
            icon={ShieldCheck}
            color="from-amber-500 to-orange-500"
            title="Career Shield"
            desc="We monitor outcomes and pause low-fit roles automatically."
            testid="feature-career-shield"
          />

          <FeatureCard
            cls="col-span-1 md:col-span-6"
            icon={ClipboardList}
            color="from-zinc-700 to-zinc-900"
            title="Application Tracker"
            desc="Every submission, response, and interview in one timeline."
            testid="feature-tracker"
          />
        </div>
      </div>
    </section>
  );
}

function CenterpieceAuto() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7 }}
      className="relative col-span-1 md:col-span-8 md:row-span-2 rounded-3xl overflow-hidden bg-gradient-to-br from-zinc-950 to-zinc-800 text-white p-7 md:p-10 min-h-[340px] md:min-h-0"
      data-testid="feature-auto-apply"
    >
      <div className="absolute -top-32 -right-20 w-[500px] h-[500px] rounded-full bg-blue-500/20 blur-[100px]" />
      <div className="absolute -bottom-40 -left-20 w-[400px] h-[400px] rounded-full bg-violet-500/20 blur-[100px]" />

      <div className="relative grid md:grid-cols-[1.2fr_1fr] gap-6 md:gap-8 items-end h-full">
        {/* Left column: copy + stats */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/50 font-semibold">
            <Bot className="w-4 h-4" />
            The Centerpiece
          </div>
          <h3 className="font-display mt-5 text-3xl md:text-4xl lg:text-[3rem] leading-[1.02] tracking-[-0.03em] font-medium">
            Auto Apply Agent
          </h3>
          <p className="mt-4 text-white/60 text-base md:text-lg max-w-md">
            A 24/7 agent that hunts, tailors and submits applications across LinkedIn, Indeed, Wellfound, Glassdoor and Workday — matched to your skills, location, salary and work authorization.
          </p>

          <div className="mt-7 grid grid-cols-3 gap-3 max-w-md">
            {[
              { l: "Tailored", v: "100%" },
              { l: "Concurrent", v: "5+" },
              { l: "Avg. apply", v: "37s" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 backdrop-blur">
                <div className="text-[10px] uppercase tracking-[0.16em] text-white/40 font-semibold">{s.l}</div>
                <div className="font-display text-xl mt-0.5">{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Terminal */}
        <div className="rounded-2xl bg-black/40 border border-white/10 p-3 backdrop-blur-md font-mono text-[11px] text-emerald-300 shadow-2xl w-full">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-2 h-2 rounded-full bg-rose-400/80" />
            <div className="w-2 h-2 rounded-full bg-amber-400/80" />
            <div className="w-2 h-2 rounded-full bg-emerald-400/80" />
          </div>
          <TerminalStream />
        </div>
      </div>
    </motion.div>
  );
}

function TerminalStream() {
  const lines = [
    "$ pilot --start",
    "Scanning 12 platforms…",
    "Found 47 high-fit roles.",
    "Tailoring application: Stripe / SWE ✓",
    "Submitted: Linear / Product Eng ✓",
    "Submitted: Vercel / Frontend ✓",
    "Recruiter response from Figma ✦",
    "3 interview invites scheduled.",
  ];
  return (
    <div className="space-y-1">
      {lines.map((l, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -6 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ delay: 0.1 * i, duration: 0.4 }}
          className={i === 0 ? "text-white/70" : ""}
        >
          {l}
        </motion.div>
      ))}
    </div>
  );
}

function FeatureCard({ cls, icon: Icon, color, title, desc, children, testid }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -4 }}
      className={`group relative ${cls} jp-card rounded-3xl p-6 overflow-hidden`}
      data-testid={testid}
    >
      <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br ${color} opacity-[0.08] blur-2xl group-hover:opacity-[0.18] transition-opacity duration-500`} />
      <div className="relative flex items-start justify-between">
        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <Activity className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
      </div>
      <h4 className="font-display text-2xl mt-5 text-zinc-900 tracking-[-0.02em] font-medium">{title}</h4>
      <p className="mt-2 text-zinc-500 text-[15px] leading-relaxed">{desc}</p>
      {children}
    </motion.div>
  );
}

function ResumeBuilderMini() {
  return (
    <div className="mt-5 space-y-2">
      {["Header", "Experience", "Skills"].map((s, i) => (
        <motion.div
          key={s}
          animate={{ width: ["72%", "92%", "78%"] }}
          transition={{ duration: 3, delay: i * 0.3, repeat: Infinity, ease: "easeInOut" }}
          className="h-2 rounded-full bg-gradient-to-r from-rose-400 to-orange-400"
          style={{ maxWidth: 220 }}
        />
      ))}
      <div className="text-xs text-zinc-400 font-mono mt-3">$ Generated 4 variants</div>
    </div>
  );
}
