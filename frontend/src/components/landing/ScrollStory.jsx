import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { FileText, Sparkles, Layers, CalendarCheck, Trophy, Cpu, Send } from "lucide-react";

const ACTS = [
  {
    n: "01",
    title: "You upload your resume — once.",
    sub: "PDF or DOCX. We extract every signal: skills, seniority, domains, and verified experience.",
    icon: FileText,
  },
  {
    n: "02",
    title: "Our AI reads it like a recruiter.",
    sub: "Skills, achievements, salary fit and location preferences become structured intelligence.",
    icon: Cpu,
  },
  {
    n: "03",
    title: "Tailored applications go out.",
    sub: "Every job is matched against your experience, then a unique cover letter is generated and submitted.",
    icon: Send,
  },
  {
    n: "04",
    title: "Recruiters reach out.",
    sub: "Interview invites land in your inbox while you focus on prep — not the application grind.",
    icon: CalendarCheck,
  },
  {
    n: "05",
    title: "You close the offer.",
    sub: "The dream role you didn't have time to apply to? It just found you.",
    icon: Trophy,
  },
];

export default function ScrollStory() {
  const wrapperRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: wrapperRef, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 28 });

  // Map progress 0..1 to one of 5 sections
  const activeIndex = useTransform(progress, (p) => Math.min(ACTS.length - 1, Math.floor(p * ACTS.length * 0.9999)));

  return (
    <section id="story" ref={wrapperRef} className="relative" data-testid="scroll-story">
      {/* Mobile: simple stacked acts. Desktop: sticky scroll storytelling. */}
      <div className="lg:hidden max-w-2xl mx-auto px-6 py-20 space-y-12" data-testid="scroll-story-mobile">
        <div>
          <span className="text-xs uppercase tracking-[0.24em] text-zinc-400 font-semibold">The story</span>
          <h2 className="font-display mt-3 text-3xl tracking-[-0.03em] leading-[1.05] text-zinc-900 font-medium">
            Five steps. <span className="text-zinc-400">Zero applications by you.</span>
          </h2>
        </div>
        {ACTS.map((a, i) => {
          const Icon = a.icon;
          return (
            <div key={a.n} className="flex gap-4">
              <div className="font-mono text-xs text-zinc-400 w-8 shrink-0 mt-1.5">{a.n}</div>
              <div>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-zinc-700" />
                  <h3 className="font-display text-lg text-zinc-900 font-medium">{a.title}</h3>
                </div>
                <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed">{a.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden lg:block h-[500vh]">
        <div className="sticky top-0 h-screen overflow-hidden">
          <div className="absolute inset-0 jp-dot-grid opacity-20 pointer-events-none" aria-hidden />
          <div className="max-w-7xl mx-auto px-6 md:px-8 h-full grid lg:grid-cols-2 items-center gap-12">
            {/* Left: narrative */}
            <div className="relative">
              <span className="text-xs uppercase tracking-[0.24em] text-zinc-400 font-semibold">The story</span>
              <h2 className="font-display mt-3 text-4xl md:text-5xl lg:text-6xl tracking-[-0.03em] leading-[1.02] text-zinc-900 font-medium">
                Five steps. <br />
                <span className="text-zinc-400">Zero applications by you.</span>
              </h2>

              <div className="relative mt-10 space-y-2">
                {ACTS.map((a, i) => (
                  <ActLine key={a.n} act={a} index={i} activeIndex={activeIndex} />
                ))}
              </div>
            </div>

            {/* Right: animated visual */}
            <div className="relative h-[560px]">
              {ACTS.map((a, i) => (
                <ActVisual key={a.n} act={a} index={i} activeIndex={activeIndex} />
              ))}

              {/* progress rail */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-72 w-px bg-zinc-200">
                <motion.div
                  style={{ height: useTransform(progress, [0, 1], ["0%", "100%"]) }}
                  className="absolute top-0 left-0 right-0 bg-zinc-900"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ActLine({ act, index, activeIndex }) {
  const Icon = act.icon;
  const isActive = useTransform(activeIndex, (v) => v === index);
  const opacity = useTransform(activeIndex, (v) => (v === index ? 1 : v > index ? 0.5 : 0.35));
  const x = useTransform(activeIndex, (v) => (v === index ? 0 : -4));

  return (
    <motion.div
      style={{ opacity, x }}
      className="flex items-start gap-4 py-3"
      data-testid={`act-line-${index}`}
    >
      <div className="font-mono text-[11px] text-zinc-400 mt-2 w-8">{act.n}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-zinc-700" />
          <h3 className="font-display text-xl md:text-2xl text-zinc-900 font-medium tracking-[-0.02em]">
            {act.title}
          </h3>
        </div>
        <motion.p
          className="mt-1.5 text-zinc-500 text-[15px] max-w-md leading-relaxed"
        >
          {act.sub}
        </motion.p>
      </div>
    </motion.div>
  );
}

function ActVisual({ act, index, activeIndex }) {
  const opacity = useTransform(activeIndex, (v) => (v === index ? 1 : 0));
  const scale = useTransform(activeIndex, (v) => (v === index ? 1 : 0.94));
  const y = useTransform(activeIndex, (v) => (v === index ? 0 : 16));
  return (
    <motion.div
      style={{ opacity, scale, y }}
      className="absolute inset-0 flex items-center justify-center"
    >
      {index === 0 && <ResumeUploadVisual />}
      {index === 1 && <AIScanVisual />}
      {index === 2 && <PipelineVisual />}
      {index === 3 && <CalendarVisual />}
      {index === 4 && <OfferVisual />}
    </motion.div>
  );
}

function ResumeUploadVisual() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <motion.div
        animate={{ y: [12, -8, 12] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="jp-card rounded-2xl p-5 w-[320px] shadow-[0_30px_80px_-20px_rgba(15,23,42,0.2)]"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-12 rounded-md bg-gradient-to-br from-rose-100 to-rose-200 flex items-center justify-center">
            <FileText className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-900">Resume_2026_Final.pdf</div>
            <div className="text-xs text-zinc-500">312 KB · PDF · Uploaded just now</div>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="h-full bg-gradient-to-r from-blue-500 to-violet-500"
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {["Skills", "Roles", "Salary"].map((k, i) => (
            <motion.div
              key={k}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.8, delay: i * 0.2, repeat: Infinity }}
              className="px-2 py-1.5 rounded-lg bg-zinc-50 text-[11px] text-zinc-600 text-center"
            >
              {k}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function AIScanVisual() {
  const skills = [
    { name: "Python",     color: "#3b82f6" },
    { name: "React",      color: "#06b6d4" },
    { name: "AWS",        color: "#f59e0b" },
    { name: "Kubernetes", color: "#8b5cf6" },
    { name: "TypeScript", color: "#0ea5e9" },
    { name: "GraphQL",    color: "#ec4899" },
    { name: "Postgres",   color: "#10b981" },
    { name: "ML Ops",     color: "#f43f5e" },
  ];
  const SIZE = 420;
  const CENTER = SIZE / 2;
  const RING_R = 165;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative" style={{ width: SIZE, height: SIZE, flexShrink: 0 }}>
        {/* Static halo behind */}
        <div
          className="absolute rounded-full bg-gradient-to-br from-blue-100/50 via-violet-100/40 to-rose-100/30"
          style={{ inset: 40, filter: "blur(40px)" }}
          aria-hidden
        />

        {/* SVG with ring, single rotating beam, and connection lines */}
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="absolute inset-0"
          style={{ pointerEvents: "none" }}
        >
          {/* Dashed orbit ring */}
          <circle cx={CENTER} cy={CENTER} r={RING_R} fill="none" stroke="#d4d4d8" strokeWidth="1" strokeDasharray="4 6" opacity="0.6" />

          {/* Connection lines from center to each skill (static, no SMIL) */}
          {skills.map((s, i) => {
            const a = (i / skills.length) * Math.PI * 2 - Math.PI / 2;
            const ex = CENTER + Math.cos(a) * RING_R;
            const ey = CENTER + Math.sin(a) * RING_R;
            return (
              <line
                key={s.name}
                x1={CENTER} y1={CENTER} x2={ex} y2={ey}
                stroke="#e4e4e7" strokeWidth="1" strokeDasharray="2 4" opacity="0.55"
              />
            );
          })}

          {/* Single rotating scan beam (CSS-driven on the <g> via class) */}
          <g className="jp-scan-beam" style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}>
            <defs>
              <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#3b82f6" stopOpacity="0.7" />
                <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <rect x={CENTER} y={CENTER - 1} width={RING_R} height="2" fill="url(#beam)" />
          </g>
        </svg>

        {/* Central AI brain — guaranteed centered via translate */}
        <div
          className="absolute"
          style={{ left: "50%", top: "50%", width: 96, height: 96, transform: "translate(-50%, -50%)", zIndex: 30 }}
        >
          <div className="jp-conic-slow absolute inset-0 rounded-full p-[2px]">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center shadow-[0_18px_50px_-12px_rgba(15,23,42,0.25)]">
              <Sparkles className="w-8 h-8 text-zinc-900" />
            </div>
          </div>
        </div>

        {/* Skill chips placed on the ring via top/left percentages of the inner box */}
        {skills.map((s, i) => {
          const a = (i / skills.length) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(a) * RING_R;
          const y = Math.sin(a) * RING_R;
          return (
            <div
              key={s.name}
              className="absolute"
              style={{
                left: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                zIndex: 20,
              }}
            >
              <div className="bg-white border border-zinc-200 shadow-md px-2.5 py-1 rounded-full text-xs font-medium text-zinc-800 whitespace-nowrap flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                {s.name}
              </div>
            </div>
          );
        })}

        {/* Status pill at bottom — positioned relative to the SIZE box */}
        <div
          className="absolute"
          style={{ left: "50%", bottom: 6, transform: "translateX(-50%)", zIndex: 30 }}
        >
          <div className="bg-white border border-zinc-200 shadow-sm rounded-full px-3 py-1.5 flex items-center gap-2 text-[11px] font-medium text-zinc-700 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-mono">8 skills · 12 keywords · ATS 94</span>
          </div>
        </div>
      </div>
    </div>
  );
}

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
        {/* Soft halo behind */}
        <div className="absolute inset-12 rounded-full bg-gradient-to-br from-blue-100/60 via-violet-100/50 to-rose-100/40 blur-2xl" aria-hidden />

        {/* SVG: orbital ring + radar pulses + connection lines + traveling skill particles */}
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="scanGlow" r="50%">
              <stop offset="0" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="0.6" stopColor="#8b5cf6" stopOpacity="0.1" />
              <stop offset="1" stopColor="#ec4899" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="scanLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#9ca3af" stopOpacity="0" />
              <stop offset="0.5" stopColor="#9ca3af" stopOpacity="0.5" />
              <stop offset="1" stopColor="#9ca3af" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Central glow */}
          <circle cx={CENTER} cy={CENTER} r="90" fill="url(#scanGlow)" />

          {/* Static dashed orbit (no rotation - keeps it visually stable & centered) */}
          <circle cx={CENTER} cy={CENTER} r={RING_RADIUS} fill="none" stroke="#d4d4d8" strokeWidth="1" strokeDasharray="4 6" opacity="0.7" />

          {/* Radar pulse rings emanating from center */}
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={CENTER} cy={CENTER} r="50" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0">
              <animate attributeName="r" from="50" to={RING_RADIUS} dur="3s" begin={`${i * 1}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.4;0" dur="3s" begin={`${i * 1}s`} repeatCount="indefinite" />
            </circle>
          ))}

          {/* Rotating scan beam (single sweep line) */}
          <g style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}>
            <animateTransform attributeName="transform" type="rotate" from={`0 ${CENTER} ${CENTER}`} to={`360 ${CENTER} ${CENTER}`} dur="6s" repeatCount="indefinite" />
            <line x1={CENTER} y1={CENTER} x2={CENTER + RING_RADIUS} y2={CENTER} stroke="#3b82f6" strokeWidth="2" opacity="0.5" />
          </g>

          {/* Connection lines + traveling skill particles from center to each skill on the ring */}
          {skills.map((s, i) => {
            const angle = (i / skills.length) * Math.PI * 2 - Math.PI / 2;
            const ex = CENTER + Math.cos(angle) * RING_RADIUS;
            const ey = CENTER + Math.sin(angle) * RING_RADIUS;
            const pathId = `scan-path-${i}`;
            return (
              <g key={s.name}>
                <path id={pathId} d={`M ${CENTER} ${CENTER} L ${ex} ${ey}`} stroke="url(#scanLine)" strokeWidth="1" fill="none" />
                <circle r="3" fill={s.color}>
                  <animateMotion dur={`${3 + i * 0.2}s`} repeatCount="indefinite" begin={`${i * 0.4}s`}>
                    <mpath href={`#${pathId}`} />
                  </animateMotion>
                  <animate attributeName="opacity" values="0;1;1;0" dur={`${3 + i * 0.2}s`} repeatCount="indefinite" begin={`${i * 0.4}s`} />
                </circle>
              </g>
            );
          })}
        </svg>

        {/* Central AI brain — perfectly centered with translate */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="absolute left-1/2 top-1/2 z-20"
          style={{ transform: "translate(-50%, -50%)", width: 110, height: 110 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full jp-conic p-[2px]"
          />
          <div className="absolute inset-[3px] rounded-full bg-white flex items-center justify-center shadow-[0_20px_60px_-12px_rgba(15,23,42,0.25)]">
            <motion.div
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="w-9 h-9 text-zinc-900" />
            </motion.div>
          </div>
        </motion.div>

        {/* Skill chips placed ON the orbital ring */}
        {skills.map((s, i) => {
          const angle = (i / skills.length) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(angle) * RING_RADIUS;
          const y = Math.sin(angle) * RING_RADIUS;
          return (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.08, duration: 0.5 }}
              className="absolute left-1/2 top-1/2 z-30"
              style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
            >
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 3, delay: i * 0.2, repeat: Infinity, ease: "easeInOut" }}
                className="jp-glass px-2.5 py-1.5 rounded-full text-xs font-medium text-zinc-800 whitespace-nowrap flex items-center gap-1.5 shadow-md"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                {s.name}
              </motion.div>
            </motion.div>
          );
        })}

        {/* Status pill at bottom (positioned relative to outer container so it doesn't break the centered ring) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="absolute left-1/2 -translate-x-1/2 z-30 whitespace-nowrap"
          style={{ bottom: -8 }}
        >
          <div className="jp-glass rounded-full px-3 py-1.5 flex items-center gap-2 text-[11px] font-medium text-zinc-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono">8 skills · 12 keywords · ATS 94</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function PipelineVisual() {
  const cards = [
    { c: "Stripe", r: "SWE", color: "from-violet-500 to-indigo-500" },
    { c: "Linear", r: "Product Eng", color: "from-rose-500 to-orange-500" },
    { c: "Vercel", r: "Frontend", color: "from-emerald-500 to-teal-500" },
  ];
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative w-full max-w-[420px]">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-4 font-mono">
          <span>SOURCED</span>
          <Layers className="w-3 h-3" />
          <span>TAILORED</span>
          <Layers className="w-3 h-3" />
          <span>SUBMITTED</span>
        </div>
        {cards.map((c, i) => (
          <motion.div
            key={c.c}
            animate={{ x: [0, 130, 260], opacity: [1, 1, 0] }}
            transition={{ duration: 4, delay: i * 0.8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-12"
            style={{ top: 40 + i * 80 }}
          >
            <div className="jp-card rounded-xl px-4 py-2.5 shadow-md flex items-center gap-2.5">
              <div className={`w-2 h-8 rounded-full bg-gradient-to-b ${c.color}`} />
              <div>
                <div className="text-sm font-semibold text-zinc-900">{c.c}</div>
                <div className="text-[11px] text-zinc-500">{c.r}</div>
              </div>
            </div>
          </motion.div>
        ))}
        <div className="h-[280px]" />
      </div>
    </div>
  );
}

function CalendarVisual() {
  const invites = [
    { c: "Notion", d: "Tomorrow · 11:00", color: "bg-rose-50 text-rose-700 border-rose-100" },
    { c: "Figma", d: "Wed · 14:30", color: "bg-violet-50 text-violet-700 border-violet-100" },
    { c: "Airbnb", d: "Thu · 09:00", color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  ];
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="space-y-3">
        {invites.map((i, idx) => (
          <motion.div
            key={i.c}
            initial={{ opacity: 0, x: 30, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 14, delay: idx * 0.3 }}
            className={`jp-card rounded-2xl p-4 w-[300px] border-2 ${i.color}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4" />
                <span className="font-semibold text-sm">Interview · {i.c}</span>
              </div>
              <span className="text-xs">Accept</span>
            </div>
            <div className="text-xs mt-1 opacity-80">{i.d}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const CONFETTI_OFFSETS = [-90, 60, -40, 100, -75, 30, -110, 80, -25, 95, -60, 50];
const CONFETTI_COLORS = ["bg-blue-500", "bg-violet-500", "bg-pink-500", "bg-amber-500", "bg-emerald-500"];

function OfferVisual() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0, rotateZ: -4 }}
        animate={{ scale: 1, opacity: 1, rotateZ: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 12 }}
        className="jp-card rounded-2xl p-6 w-[340px] shadow-[0_40px_100px_-20px_rgba(15,23,42,0.3)]"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase tracking-[0.2em] text-amber-600 font-semibold">Offer Letter</span>
          <Trophy className="w-5 h-5 text-amber-500" />
        </div>
        <h4 className="font-display text-2xl text-zinc-900 leading-tight">Senior Software Engineer</h4>
        <p className="text-sm text-zinc-500 mt-1">Stripe · Bengaluru / Remote</p>
        <div className="mt-4 pt-4 border-t border-zinc-100 flex items-end justify-between">
          <div>
            <div className="text-xs text-zinc-400">Total Compensation</div>
            <div className="font-display text-3xl text-zinc-900 font-bold">₹58 LPA</div>
          </div>
          <div className="text-emerald-600 text-sm font-semibold">Accepted</div>
        </div>
        {CONFETTI_OFFSETS.map((dx, i) => {
          const colorClass = CONFETTI_COLORS[i % 5];
          return (
            <motion.span
              key={i}
              initial={{ y: 0, x: 0, opacity: 0 }}
              animate={{ y: -200, x: dx, opacity: [0, 1, 0] }}
              transition={{ duration: 2.5, delay: i * 0.1, repeat: Infinity, repeatDelay: 1.5 }}
              className={`absolute left-1/2 bottom-1/2 w-1.5 h-1.5 rounded-full ${colorClass}`}
            />
          );
        })}
      </motion.div>
    </div>
  );
}
