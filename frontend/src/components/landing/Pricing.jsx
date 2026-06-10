import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import axios from "axios";

function detectCurrency() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.startsWith("Asia/Kolkata") || tz.startsWith("Asia/Calcutta")) return "INR";
    const locale = navigator.language || "";
    if (locale === "en-IN") return "INR";
    return "USD";
  } catch {
    return "INR";
  }
}

export default function Pricing() {
  const { t } = useTranslation();
  const [variant, setVariant] = useState("A");
  const [currency, setCurrency] = useState(detectCurrency);

  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_BACKEND_URL}/api/ab/variant/pricing_copy`, { withCredentials: true })
      .then((r) => setVariant(r.data.variant || "A"))
      .catch(() => setVariant("A"));
  }, []);

  const trackClick = () => {
    axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/ab/track`, {
      experiment: "pricing_copy",
      variant,
      event: "click",
    }).catch(() => {});
  };

  const headline = variant === "B" ? t("pricing.headline_b") : t("pricing.headline_a");
  const subhead = variant === "B" ? t("pricing.subhead_b") : t("pricing.subhead_a");
  const tagline = variant === "B" ? t("pricing.tagline_b") : t("pricing.tagline_a");

  const isUSD = currency === "USD";

  const PLANS = [
    {
      id: "starter",
      name: t("pricing.starter.name"),
      priceINR: "₹499",
      priceUSD: "$19",
      cadence: "/month",
      desc: t("pricing.starter.desc"),
      features: [
        "Up to 100 targeted applications per month",
        "AI resume tailoring for every job",
        "Smart matching to your skills + locations",
        "Application tracker & email alerts",
      ],
      cta: t("pricing.starter.cta"),
    },
    {
      id: "pro",
      name: t("pricing.pro.name"),
      priceINR: "₹999",
      priceUSD: "$39",
      cadence: "/month",
      desc: t("pricing.pro.desc"),
      features: [
        "Up to 300 targeted applications per month",
        "Priority processing & faster submission",
        "Career Shield — automatic low-fit pause",
        "LinkedIn optimizer + ATS check unlimited",
        "1:1 onboarding session",
      ],
      cta: t("pricing.pro.cta"),
      highlight: true,
    },
  ];

  return (
    <section id="pricing" className="relative py-28 md:py-36" data-testid="pricing-section" data-ab-variant={variant}>
      <div className="absolute inset-0 jp-dot-grid opacity-20 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6 md:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-xs uppercase tracking-[0.24em] text-zinc-400 font-semibold">{t("pricing.label")}</span>
          <h2 className="font-display mt-3 text-4xl md:text-5xl lg:text-6xl tracking-[-0.03em] leading-[1.02] text-zinc-900 font-medium" data-testid="pricing-headline">
            {headline}<br /><span className="text-zinc-400">{subhead}</span>
          </h2>
          <p className="mt-5 text-zinc-500 text-lg">{tagline}</p>

          {/* Currency toggle */}
          <div className="mt-7 inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 p-1 gap-0.5">
            <button
              onClick={() => setCurrency("INR")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                !isUSD ? "bg-white shadow-sm text-zinc-900 border border-zinc-200/80" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              ₹ INR
            </button>
            <button
              onClick={() => setCurrency("USD")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                isUSD ? "bg-white shadow-sm text-zinc-900 border border-zinc-200/80" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              $ USD
            </button>
          </div>
        </div>

        <div className="mt-12 grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {PLANS.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className={`relative rounded-3xl p-8 md:p-10 ${
                p.highlight
                  ? "bg-gradient-to-br from-zinc-950 to-zinc-800 text-white border border-white/10 shadow-2xl"
                  : "bg-white text-zinc-900 border border-zinc-200/70 shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
              }`}
              data-testid={`pricing-card-${p.id}`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.18em] bg-gradient-to-r from-amber-400 to-orange-500 text-zinc-900">
                  <Sparkles className="w-3 h-3" /> {t("pricing.popular")}
                </div>
              )}

              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-2xl md:text-3xl tracking-tight">{p.name}</h3>
                <div className="text-right">
                  <motion.span
                    key={`${p.id}-${currency}`}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="font-display text-4xl md:text-5xl font-medium block"
                  >
                    {isUSD ? p.priceUSD : p.priceINR}
                  </motion.span>
                  <span className={`${p.highlight ? "text-white/50" : "text-zinc-400"} text-sm`}>{p.cadence}</span>
                </div>
              </div>
              <p className={`mt-3 max-w-md ${p.highlight ? "text-white/60" : "text-zinc-500"}`}>{p.desc}</p>

              <ul className="mt-7 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[15px]">
                    <Check className={`w-4 h-4 mt-1 shrink-0 ${p.highlight ? "text-emerald-400" : "text-emerald-600"}`} />
                    <span className={p.highlight ? "text-white/85" : "text-zinc-700"}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/signup"
                onClick={trackClick}
                className={`mt-8 inline-flex items-center gap-2 px-5 py-3 rounded-full text-[15px] font-medium whitespace-nowrap ${
                  p.highlight ? "bg-white text-zinc-900 hover:bg-zinc-100" : "jp-btn-primary"
                }`}
                data-testid={`pricing-cta-${p.id}`}
              >
                {p.cta} <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-zinc-400 max-w-2xl mx-auto">
          {t("pricing.free")}{" "}
          <Link to="/signup" onClick={trackClick} className="text-zinc-700 underline underline-offset-2 jp-link">
            Start free
          </Link>
        </p>
      </div>
    </section>
  );
}
