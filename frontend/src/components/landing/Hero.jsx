import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Plane, Briefcase, Linkedin, Building2, Globe, Sparkles, ArrowUpRight, PlayCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

const PLATFORMS = [
  { name: "LinkedIn", icon: Linkedin, color: "#0A66C2", angle: 0 },
  { name: "Indeed", icon: Briefcase, color: "#2557A7", angle: 72 },
  { name: "Wellfound", icon: Sparkles, color: "#000000", angle: 144 },
  { name: "Glassdoor", icon: Building2, color: "#0CAA41", angle: 216 },
  { name: "Workday", icon: Globe, color: "#F38B00", angle: 288 },
];

function useCounter(target, duration = 1800) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let start;
    let raf;
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

function FloatingPlatformCard({ platform, index, radius, mx, my }) {
  const Icon = platform.icon;
  const angleRad = (platform.angle * Math.PI) / 180;
  const x = Math.cos(angleRad) * radius;
  const y = Math.sin(angleRad) * radius * 0.55;

  const px = useTransform(mx, (v) => x + v * (index % 2 === 0 ? 0.04 : -0.04));
  const py = useTransform(my, (v) => y + v * (index % 2 === 0 ? -0.04 : 0.04));

  return (
    <motion.div
      style={{ left: "50%", top: "50%", x: px, y: py }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.6 + index * 0.12, duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
      className="absolute -translate-x-1/2 -translate-y-1/2"
    >
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 4 + index * 0.4, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }}
        className="jp-glass rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 min-w-[160px]"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${platform.color}14` }}>
          <Icon className="w-4 h-4" style={{ color: platform.color }} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] uppercase tracking-[0.16em] text-zinc-400 font-semibold">{platform.name}</span>
          <span className="text-[13px] text-zinc-700 font-medium">3 new matches</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Hero() {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 60, damping: 18 });
  const smoothY = useSpring(mouseY, { stiffness: 60, damping: 18 });

  const apps = useCounter(1247);
  const interviews = useCounter(38);
  const responseRate = useCounter(34);
  const offers = useCounter(7);

  const onMove = (e) => {
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    mouseX.set(e.clientX - cx);
    mouseY.set(e.clientY - cy);
  };

  const dashTilt = useTransform(smoothX, [-400, 400], [4, -4]);
  const dashTiltY = useTransform(smoothY, [-300, 300], [-3, 3]);

  return (
    <section
      ref={containerRef}
      onMouseMove={onMove}
      className="relative pt-40 pb-24 md:pt-48 md:pb-32 overflow-hidden"
      data-testid="hero-section"
    >
      <div className="jp-mesh" aria-hidden />
      <div className="absolute inset-0 jp-dot-grid opacity-30 pointer-events-none" aria-hidden />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-8 grid lg:grid-cols-[1.05fr_1fr] gap-16 items-center">
        {/* Left: Copy */}
        <div className="relative">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/70 backdrop-blur px-3 py-1.5 text-xs text-zinc-600"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t("hero.badge")}
          </motion.div>

          <h1 className="font-display mt-6 text-[2.75rem] sm:text-6xl lg:text-[5.2rem] leading-[0.98] tracking-[-0.035em] font-medium text-zinc-900">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05 }}
              className="block"
            >
              {t("hero.title1")}
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.18 }}
              className="block"
            >
              <span className="jp-gradient-text">{t("hero.title2")}</span>
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.32 }}
            className="mt-7 text-lg md:text-xl text-zinc-500 max-w-xl leading-relaxed"
          >
            {t("hero.sub")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Link
              to="/signup"
              className="jp-btn-primary inline-flex items-center gap-2 px-5 py-3 rounded-full text-[15px] font-medium"
              data-testid="hero-cta-primary"
            >
              {t("hero.primary")}
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <a
              href="#story"
              className="jp-btn-secondary inline-flex items-center gap-2 px-5 py-3 rounded-full text-[15px] font-medium"
              data-testid="hero-cta-secondary"
            >
              <PlayCircle className="w-4 h-4" />
              {t("hero.secondary")}
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mt-10 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-zinc-400 font-semibold"
          >
            <span>{t("hero.trustline")}</span>
            <span className="text-zinc-700">Google · Meta · Stripe · Razorpay · Atlassian</span>
          </motion.div>
        </div>

        {/* Right: Living dashboard */}
        <div className="relative h-[520px] lg:h-[600px]">
          {/* Orbit ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            className="absolute inset-8 rounded-full border border-dashed border-zinc-200/80"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
            className="absolute inset-16 rounded-full border border-dashed border-zinc-200/60"
          />

          {/* Floating platform cards */}
          {PLATFORMS.map((p, i) => (
            <FloatingPlatformCard key={p.name} platform={p} index={i} radius={230} mx={smoothX} my={smoothY} />
          ))}

          {/* Animated paper airplane */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.4 }}
            className="absolute inset-0 pointer-events-none"
          >
            <motion.div
              animate={{
                x: [0, 180, 60, -160, -40, 0],
                y: [0, -140, -200, -110, 60, 0],
                rotate: [0, 35, 70, 140, 200, 360],
              }}
              transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
              style={{ left: "50%", top: "50%" }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
            >
              <div className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center border border-zinc-200">
                <Plane className="w-4 h-4 text-zinc-900 -rotate-45" />
              </div>
            </motion.div>
          </motion.div>

          {/* Central dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
            style={{ rotateY: dashTilt, rotateX: dashTiltY, transformStyle: "preserve-3d", transformPerspective: 1200 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[330px] sm:w-[380px] jp-glass rounded-3xl p-5 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.25)]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-400" />
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <span className="font-mono text-[10px] text-zinc-400">jobpilot.ai</span>
            </div>
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-400 font-semibold mb-2">This Month</div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Applications" value={apps.toLocaleString()} accent="from-blue-500 to-indigo-500" />
              <Stat label="Interviews" value={interviews} accent="from-violet-500 to-fuchsia-500" />
              <Stat label="Response Rate" value={`${responseRate}%`} accent="from-emerald-500 to-teal-500" />
              <Stat label="Offers" value={offers} accent="from-amber-500 to-orange-500" />
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-200/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-zinc-500">Pilot active · auto-applying</span>
              </div>
              <span className="font-mono text-[11px] text-zinc-600">14:32</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="bg-white/80 rounded-2xl p-3 border border-zinc-100">
      <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-400 font-semibold">{label}</div>
      <div className={`mt-1 font-display text-2xl bg-gradient-to-br ${accent} bg-clip-text text-transparent font-bold`}>{value}</div>
    </div>
  );
}
