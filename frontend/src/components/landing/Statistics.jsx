import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate } from "framer-motion";
import { useTranslation } from "react-i18next";
import axios from "axios";

function AnimatedNumber({ to }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 2.2,
      ease: [0.2, 0.7, 0.2, 1],
      onUpdate: (val) => setV(Math.floor(val)),
    });
    return () => controls.stop();
  }, [inView, to]);
  return <span ref={ref}>{v.toLocaleString()}</span>;
}

export default function Statistics() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ applications_submitted: 50000, job_seekers: 8500, interviews: 2400, offers: 1200 });
  useEffect(() => {
    axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/activity/stats`).then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  const items = [
    { v: stats.applications_submitted, l: t("stats.apps"), s: "+" },
    { v: stats.job_seekers, l: t("stats.seekers"), s: "+" },
    { v: stats.interviews, l: t("stats.interviews"), s: "+" },
    { v: stats.offers, l: t("stats.offers"), s: "+" },
  ];

  return (
    <section className="relative py-28 md:py-36 overflow-hidden" data-testid="stats-section">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0F1C] to-[#040810]" />
      <div className="jp-beam bg-blue-500/30 -top-20 -left-20" />
      <div className="jp-beam bg-violet-500/20 -bottom-20 -right-20" />
      <div className="absolute inset-0 jp-grain" />

      <div className="relative max-w-7xl mx-auto px-6 md:px-8 text-white">
        <div className="max-w-3xl">
          <span className="text-xs uppercase tracking-[0.24em] text-white/40 font-semibold">{t("stats.label")}</span>
          <h2 className="font-display mt-3 text-4xl md:text-5xl lg:text-6xl tracking-[-0.03em] leading-[1.02] font-medium">
            {t("stats.title")}
          </h2>
          <p className="mt-5 text-white/60 text-lg max-w-xl">
            {t("stats.sub")}
          </p>
        </div>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
          {items.map((it, i) => (
            <motion.div
              key={it.l}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="relative pl-5 border-l border-white/10"
              data-testid={`stat-${i}`}
            >
              <div className="font-display text-[2.6rem] md:text-[4rem] leading-none tracking-[-0.04em] font-medium">
                <AnimatedNumber to={it.v} />
                <span className="text-blue-400">{it.s}</span>
              </div>
              <div className="mt-3 text-xs uppercase tracking-[0.2em] text-white/50 font-semibold">{it.l}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
