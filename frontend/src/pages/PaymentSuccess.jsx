import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plane, CheckCircle2, Rocket, Zap, ShieldCheck, Sparkles,
  ArrowRight, Bot, FileSearch, Globe2, BarChart3,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

const PERKS = [
  {
    icon: Bot,
    color: "bg-violet-50 text-violet-600",
    title: "Autopilot is live",
    desc: "ApplyAgent sends tailored applications every day — while you sleep, eat, or binge Netflix.",
  },
  {
    icon: FileSearch,
    color: "bg-sky-50 text-sky-600",
    title: "AI resume tailoring",
    desc: "Every application comes with a resume rewritten to match the job — no copy-pasting needed.",
  },
  {
    icon: Globe2,
    color: "bg-emerald-50 text-emerald-600",
    title: "Multi-platform reach",
    desc: "LinkedIn, Naukri, Instahyre and more — your profile lands where the right recruiters look.",
  },
  {
    icon: BarChart3,
    color: "bg-amber-50 text-amber-600",
    title: "Live tracker dashboard",
    desc: "Every application, every status, every interview invite — tracked and shown in one place.",
  },
];

const STEPS = [
  "Upload or confirm your resume",
  "We tailor it for each role",
  "Applications go out daily",
  "You get notified on every interview invite",
];

export default function PaymentSuccess() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [plan, setPlan] = useState(null);
  const [countdown, setCountdown] = useState(8);

  const planFromState = location.state?.plan;

  useEffect(() => {
    if (!authLoading && !user) { nav("/signin"); return; }
    api.get("/users/me").then(r => setPlan(r.data?.plan)).catch(() => {});
  }, [user, authLoading, nav]);

  useEffect(() => {
    if (countdown <= 0) { nav("/dashboard"); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, nav]);

  const displayPlan = planFromState || plan || "starter";

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <div className="jp-mesh" aria-hidden />
      <div className="absolute inset-0 jp-dot-grid opacity-20" />

      <div className="relative max-w-2xl mx-auto px-6 pt-14 pb-24">

        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-full jp-conic p-[1.5px]">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <Plane className="w-4 h-4 -rotate-12 text-zinc-900" />
            </div>
          </div>
          <span className="font-display font-bold tracking-tight">ApplyAgent</span>
        </div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 mb-6"
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-500" strokeWidth={1.5} />
          </motion.div>

          <h1 className="font-display text-4xl md:text-5xl tracking-[-0.03em] text-zinc-900 font-medium mb-3">
            You're on <span className="capitalize">{displayPlan}</span>. 🎉
          </h1>
          <p className="text-zinc-500 text-lg max-w-md mx-auto">
            Your autopilot is armed. ApplyAgent will now work around the clock to land you interviews.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 text-zinc-500 text-sm">
            <Rocket className="w-3.5 h-3.5" />
            Going to your dashboard in {countdown}s…
          </div>
        </motion.div>

        {/* Value props */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="grid sm:grid-cols-2 gap-4 mb-10"
        >
          {PERKS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.07 }}
              className="rounded-2xl border border-zinc-100 bg-white p-5 flex gap-4 shadow-sm"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${p.color}`}>
                <p.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-zinc-900 text-sm">{p.title}</p>
                <p className="text-zinc-500 text-sm mt-0.5 leading-relaxed">{p.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className="rounded-3xl bg-gradient-to-br from-zinc-950 to-zinc-800 text-white p-8 mb-8"
        >
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-sm tracking-wide uppercase text-zinc-300">How your autopilot works</span>
          </div>
          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-white/85 text-sm leading-relaxed">{s}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white/70 text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>All applications are sent from your verified profile — never spammy, always targeted.</span>
          </div>
        </motion.div>

        {/* Stat strip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="flex flex-wrap justify-center gap-6 text-center mb-10"
        >
          {[
            { value: "3×", label: "more interviews on average" },
            { value: "40min", label: "saved per application" },
            { value: "24 / 7", label: "autopilot runs non-stop" },
          ].map(s => (
            <div key={s.label}>
              <p className="font-display text-3xl font-semibold text-zinc-900">{s.value}</p>
              <p className="text-zinc-400 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="text-center"
        >
          <button
            onClick={() => nav("/dashboard")}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-zinc-900 text-white text-[15px] font-medium hover:bg-zinc-700 transition-colors"
          >
            Open my dashboard <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-zinc-400 text-xs mt-4 flex items-center justify-center gap-1.5">
            <Zap className="w-3 h-3" /> Your first batch of applications will go out within 24 hours.
          </p>
        </motion.div>

      </div>
    </div>
  );
}
