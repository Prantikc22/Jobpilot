import { Link } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

export default function FinalCTA() {
  const { t } = useTranslation();
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });
  const orbX = useTransform(sx, [-300, 300], [-30, 30]);
  const orbY = useTransform(sy, [-300, 300], [-30, 30]);

  const onMove = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(e.clientX - r.left - r.width / 2);
    my.set(e.clientY - r.top - r.height / 2);
  };

  return (
    <section
      ref={ref}
      onMouseMove={onMove}
      className="relative py-32 md:py-44 overflow-hidden"
      data-testid="final-cta-section"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A0F1C] via-[#0d1530] to-[#040810]" />
      <motion.div style={{ x: orbX, y: orbY }} className="jp-beam bg-blue-500/40 top-10 left-1/4 w-[500px] h-[500px]" />
      <motion.div style={{ x: orbY, y: orbX }} className="jp-beam bg-violet-500/30 bottom-10 right-1/4 w-[500px] h-[500px]" />
      <div className="absolute inset-0 jp-grain" />

      <div className="relative max-w-5xl mx-auto px-6 md:px-8 text-center text-white">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/70 backdrop-blur"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {t("finalCta.badge")}
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-display mt-7 text-[1.85rem] sm:text-6xl md:text-7xl lg:text-[5.6rem] leading-[1.05] sm:leading-[0.98] tracking-[-0.03em] sm:tracking-[-0.035em] font-medium"
        >
          {t("finalCta.title1")}{" "}<span className="jp-gradient-text">{t("finalCta.title2")}</span>
          <br />{t("finalCta.title3")}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-7 text-white/65 text-lg max-w-2xl mx-auto"
        >
          {t("finalCta.sub")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3"
        >
          <Link
            to="/signup"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-[15px] font-medium bg-white text-zinc-900 hover:bg-zinc-100 transition-all whitespace-nowrap"
            data-testid="final-cta-primary"
          >
            {t("finalCta.primary")}
            <ArrowUpRight className="w-4 h-4 shrink-0" />
          </Link>
          <Link
            to="/signin"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-[15px] font-medium border border-white/20 text-white hover:bg-white/5 transition-all whitespace-nowrap"
            data-testid="final-cta-secondary"
          >
            {t("finalCta.secondary")}
          </Link>
        </motion.div>

        <div className="mt-8 text-xs uppercase tracking-[0.2em] text-white/40 font-semibold">
          {t("finalCta.footnote")}
        </div>
      </div>
    </section>
  );
}
