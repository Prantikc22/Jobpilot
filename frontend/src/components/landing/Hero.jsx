import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Plane, ArrowUpRight, PlayCircle, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

const BRAND_MARKS = {
  Google: (
    <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A10.97 10.97 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
  ),
  Meta: (
    <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#0866FF" d="M12 1.5a10.5 10.5 0 1 0 0 21 10.5 10.5 0 0 0 0-21Zm5.6 11.4c-.36 1.36-1.4 2.55-2.42 2.55-.79 0-1.4-.55-2.16-2.06l-.97-1.9-1.06 2.04c-.78 1.47-1.36 1.92-2.15 1.92-1.25 0-2.16-1.34-2.41-3.1-.13-.92-.04-1.93.27-2.93.4-1.28 1.18-2.05 2.13-2.05.99 0 1.7.71 2.91 3.13l.61 1.22 1.16-2.23c.99-1.4 1.66-2.12 2.66-2.12.93 0 1.6.74 1.83 1.88.21 1.04.16 2.31-.4 3.65Z"/></svg>
  ),
  Stripe: (
    <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#635BFF" d="M13.48 10.18c0-.7.58-.98 1.54-.98 1.4 0 3.16.43 4.55 1.17V6.27a12.1 12.1 0 0 0-4.55-.84c-3.72 0-6.2 1.95-6.2 5.2 0 5.07 6.97 4.27 6.97 6.45 0 .83-.72 1.1-1.74 1.1-1.52 0-3.47-.62-5-1.46v4.16c1.7.73 3.43 1.05 5 1.05 3.81 0 6.43-1.88 6.43-5.17 0-5.47-7-4.52-7-6.58Z"/></svg>
  ),
  Razorpay: (
    <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#0C2451" d="m6.2 16.93 1.18-4.4-3.42 9.97h3.96l3.95-11.66-5.67 6.09Zm14.84-12.93H14.7L9.65 18.46l1.42-5.29 2.43-7.06h-.01l.03-.11h3.84l-2.04 6 .01.01-2.05 6.16h3.96L21.04 4Z"/></svg>
  ),
  Atlassian: (
    <svg viewBox="0 0 24 24" className="w-5 h-5"><defs><linearGradient id="atl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0052CC"/><stop offset="1" stopColor="#2684FF"/></linearGradient></defs><path fill="url(#atl)" d="M7.12 11.66a.6.6 0 0 0-1.02.1L1.2 21.62a.62.62 0 0 0 .56.89h6.85a.6.6 0 0 0 .54-.34c1.47-3.02.59-7.63-2.03-10.51Z"/><path fill="#2684FF" d="M11.5 1.74a13.6 13.6 0 0 0-.78 13.45l3.27 6.55a.62.62 0 0 0 .56.34h6.85a.62.62 0 0 0 .55-.9S12.7 2.43 12.46 1.94a.55.55 0 0 0-.96-.2Z"/></svg>
  ),
};

// 6 platforms placed AT a single orbital radius using polar coords.
const ORBIT_RADIUS_VW = 240;
const PLATFORMS = [
  { name: "LinkedIn",   color: "#0A66C2", deg:  -60, matches: 12 },
  { name: "Indeed",     color: "#2557A7", deg: -120, matches: 8 },
  { name: "Wellfound",  color: "#FF564B", deg:  180, matches: 4 },
  { name: "Glassdoor",  color: "#0CAA41", deg:  120, matches: 6 },
  { name: "Workday",    color: "#F38B00", deg:    0, matches: 9 },
  { name: "Greenhouse", color: "#21A179", deg:   60, matches: 5 },
];

function polar(deg, r) {
  const rad = (deg * Math.PI) / 180;
  return { x: Math.cos(rad) * r, y: Math.sin(rad) * r };
}

function PlatformChip({ p, index, mx, my }) {
  const { x, y } = polar(p.deg, ORBIT_RADIUS_VW);
  const sign = index % 2 === 0 ? 1 : -1;
  const px = useTransform(mx, (v) => x + v * 0.03 * sign);
  const py = useTransform(my, (v) => y - v * 0.03 * sign);

  return (
    <motion.div
      style={{ left: "50%", top: "50%", x: px, y: py }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.5 + index * 0.08, duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
      className="absolute -translate-x-1/2 -translate-y-1/2 z-30"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4 + index * 0.3, repeat: Infinity, ease: "easeInOut", delay: index * 0.25 }}
        className="jp-glass rounded-2xl px-2.5 py-1.5 sm:px-3 sm:py-2 flex items-center gap-2 shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
      >
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${p.color}1A` }}>
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.16em] text-zinc-400 font-semibold">{p.name}</span>
          <span className="text-[11px] sm:text-[12px] text-zinc-700 font-medium">{p.matches} new matches</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ConnectionLines() {
  return (
    <svg viewBox="-310 -310 620 620" className="absolute inset-0 w-full h-full pointer-events-none z-10" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9ca3af" stopOpacity="0" />
          <stop offset="0.5" stopColor="#9ca3af" stopOpacity="0.35" />
          <stop offset="1" stopColor="#9ca3af" stopOpacity="0" />
        </linearGradient>
      </defs>
      {PLATFORMS.map((p, i) => {
        const { x, y } = polar(p.deg, ORBIT_RADIUS_VW);
        const pathId = `path-${p.name}`;
        return (
          <g key={p.name}>
            <path id={pathId} d={`M 0 0 L ${x} ${y}`} stroke="url(#lineGrad)" strokeWidth="1" fill="none" strokeDasharray="3 4" opacity="0.55" />
            <circle r="3" fill={p.color}>
              <animateMotion dur={`${3.5 + i * 0.4}s`} repeatCount="indefinite" begin={`${i * 0.5}s`} rotate="auto">
                <mpath href={`#${pathId}`} />
              </animateMotion>
              <animate attributeName="opacity" values="0;1;1;0" dur={`${3.5 + i * 0.4}s`} repeatCount="indefinite" begin={`${i * 0.5}s`} />
            </circle>
          </g>
        );
      })}
    </svg>
  );
}

// Eased-in count to a target on mount.
function useEasedCounter(target, duration = 1800) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf, start;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.floor(eased * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

// Slowly cycle a metric through values (visible "alive" feel).
function useTickingMetric(values, intervalMs = 6000, startDelayMs = 2200) {
  const [i, setI] = useState(0);
  useEffect(() => {
    let intervalId;
    const startT = setTimeout(() => {
      intervalId = setInterval(() => setI((x) => (x + 1) % values.length), intervalMs);
    }, startDelayMs);
    return () => {
      clearTimeout(startT);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);
  return values[i];
}

export default function Hero() {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 60, damping: 18 });
  const smoothY = useSpring(mouseY, { stiffness: 60, damping: 18 });

  const baseApps = useEasedCounter(1247);
  const interviews = useEasedCounter(38);
  const baseResponse = useEasedCounter(34);
  const baseOffers = useEasedCounter(7);

  // After the initial ease, slowly tick the metrics so the dashboard feels alive.
  const appsTick = useTickingMetric([1247, 1248, 1249], 6000);
  const responseTick = useTickingMetric([34, 35, 34], 7500);
  const offersTick = useTickingMetric([7, 7, 8], 9000);

  // Until the eased counter finishes, use the eased value. After (>1247), use ticker.
  const apps = baseApps >= 1247 ? appsTick : baseApps;
  const responseRate = baseResponse >= 34 ? responseTick : baseResponse;
  const offers = baseOffers >= 7 ? offersTick : baseOffers;

  const onMove = (e) => {
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return;
    mouseX.set(e.clientX - r.left - r.width / 2);
    mouseY.set(e.clientY - r.top - r.height / 2);
  };

  const dashTilt = useTransform(smoothX, [-400, 400], [3, -3]);
  const dashTiltY = useTransform(smoothY, [-300, 300], [-2, 2]);

  return (
    <section
      ref={containerRef}
      onMouseMove={onMove}
      className="relative pt-28 pb-16 sm:pt-32 sm:pb-20 md:pt-40 md:pb-28 overflow-hidden"
      data-testid="hero-section"
    >
      <div className="jp-mesh" aria-hidden />
      <div className="absolute inset-0 jp-dot-grid opacity-30 pointer-events-none" aria-hidden />

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 md:px-8 grid lg:grid-cols-[1fr_1.05fr] gap-10 lg:gap-10 items-center">
        {/* Left: Copy */}
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/70 backdrop-blur px-3 py-1.5 text-xs text-zinc-600"
            data-testid="hero-badge"
          >
            <span className="relative flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
              <span className="relative w-2 h-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-medium">{t("hero.badge")}</span>
          </motion.div>

          <h1 className="font-display mt-5 sm:mt-6 text-[2.4rem] sm:text-5xl lg:text-[3.8rem] xl:text-[4.4rem] leading-[1.02] sm:leading-[0.98] tracking-[-0.035em] font-medium text-zinc-900">
            <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05 }} className="block">
              {t("hero.title1")}
            </motion.span>
            <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.18 }} className="block">
              <span className="jp-gradient-text">{t("hero.title2")}</span>
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.32 }}
            className="mt-5 sm:mt-6 text-[15px] sm:text-base lg:text-[17px] text-zinc-500 max-w-xl leading-relaxed"
          >
            {t("hero.sub")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-7 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3"
          >
            <Link to="/signup" className="jp-btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[15px] font-medium" data-testid="hero-cta-primary">
              {t("hero.primary")}
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <a href="#story" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[15px] font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100/70 transition-colors" data-testid="hero-cta-secondary">
              <PlayCircle className="w-4 h-4" />
              {t("hero.secondary")}
            </a>
          </motion.div>

          {/* Trust microcopy */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-zinc-500"
            data-testid="hero-microcopy"
          >
            {["hero.micro1", "hero.micro2", "hero.micro3"].map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={3} />
                {t(k)}
              </span>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mt-9"
            data-testid="trusted-by"
          >
            <div className="text-[11px] uppercase tracking-[0.22em] text-zinc-400 font-semibold mb-3">
              {t("hero.trustline")}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 sm:gap-x-6 gap-y-3">
              {Object.entries(BRAND_MARKS).map(([name, mark]) => (
                <div key={name} className="flex items-center gap-2 text-zinc-700 hover:text-zinc-900 transition-colors" title={name}>
                  {mark}
                  <span className="text-sm font-semibold tracking-tight">{name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right: Living dashboard with orbital platforms */}
        <div className="relative w-full mx-auto" style={{ maxWidth: 620 }} data-testid="hero-dashboard-wrap">
          <div className="relative aspect-square">
            {/* Soft halo behind */}
            <div className="absolute inset-10 rounded-full bg-gradient-to-br from-blue-100/35 via-violet-100/30 to-rose-100/25 blur-2xl" />

            {/* Rotating orbital ring — almost invisible */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full"
              style={{ padding: "40px" }}
            >
              <div className="w-full h-full rounded-full border border-dashed border-zinc-300/25" />
            </motion.div>

            <ConnectionLines />

            {PLATFORMS.map((p, i) => (
              <PlatformChip key={p.name} p={p} index={i} mx={smoothX} my={smoothY} />
            ))}

            {/* Orbiting paper airplane */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 z-20 pointer-events-none"
            >
              <div className="absolute left-1/2 top-1/2" style={{ transform: `translate(-50%, -50%) translate(${ORBIT_RADIUS_VW}px, 0)` }}>
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center border border-zinc-200"
                >
                  <Plane className="w-3 h-3 text-zinc-900 -rotate-45" />
                </motion.div>
              </div>
            </motion.div>

            {/* Central dashboard — ~20% bigger, centered via wrapper to avoid transform clash with framer-motion */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.9, delay: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
                style={{ rotateY: dashTilt, rotateX: dashTiltY, transformStyle: "preserve-3d", transformPerspective: 1200 }}
                className="w-[240px] sm:w-[270px] md:w-[290px] jp-glass rounded-3xl p-4 sm:p-5 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.25)]"
                data-testid="hero-dashboard-card"
              >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <span className="font-mono text-[9px] text-zinc-400">jobpilot.ai</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-semibold mb-2">This Month</div>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Apps" value={apps.toLocaleString()} accent="from-blue-500 to-indigo-500" testid="stat-apps" />
                <Stat label="Interviews" value={interviews} accent="from-violet-500 to-fuchsia-500" />
                <Stat label="Response" value={`${responseRate}%`} accent="from-emerald-500 to-teal-500" testid="stat-response" />
                <Stat label="Offers" value={offers} accent="from-amber-500 to-orange-500" testid="stat-offers" />
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-zinc-200/60 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-zinc-500">Pilot active</span>
                </div>
                <span className="font-mono text-[10px] text-zinc-600">14:32</span>
              </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, accent, testid }) {
  return (
    <div className="bg-white/80 rounded-xl p-2.5 border border-zinc-100" data-testid={testid}>
      <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-400 font-semibold">{label}</div>
      <motion.div
        key={String(value)}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className={`mt-0.5 font-display text-xl bg-gradient-to-br ${accent} bg-clip-text text-transparent font-bold`}
      >
        {value}
      </motion.div>
    </div>
  );
}
