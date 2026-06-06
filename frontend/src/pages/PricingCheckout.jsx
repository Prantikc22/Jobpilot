import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Sparkles, ArrowLeft, Loader2, Plane } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

const PLANS = [
  { id: "starter", name: "Starter", price: 499, features: ["100 targeted applications / mo", "AI resume tailoring", "Application tracker"] },
  { id: "pro", name: "Pro", price: 999, features: ["300 targeted applications / mo", "Priority processing", "Career Shield", "1:1 onboarding"], highlight: true },
];

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function PricingCheckout() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) nav("/signin");
  }, [user, authLoading, nav]);

  const buy = async (planId) => {
    setBusy(planId);
    const ok = await loadRazorpayScript();
    if (!ok) { toast.error("Couldn't load Razorpay"); setBusy(null); return; }
    try {
      const { data: order } = await api.post("/payments/create-order", { plan: planId });
      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "JobPilot",
        description: `${planId.toUpperCase()} subscription`,
        order_id: order.order_id,
        prefill: { email: user?.email },
        theme: { color: "#09090b" },
        handler: async (resp) => {
          try {
            await api.post("/payments/verify", {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
              plan: planId,
            });
            toast.success(`${planId.toUpperCase()} activated!`);
            setTimeout(() => nav("/dashboard"), 800);
          } catch (e) {
            toast.error("Payment verify failed");
          }
        },
        modal: { ondismiss: () => setBusy(null) },
      });
      rzp.open();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Couldn't start checkout");
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-white relative" data-testid="pricing-checkout-page">
      <div className="jp-mesh" aria-hidden />
      <div className="absolute inset-0 jp-dot-grid opacity-20" />
      <div className="relative max-w-3xl mx-auto px-6 pt-16 pb-20">
        <button onClick={() => nav(-1)} className="text-sm text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1.5 mb-8" data-testid="checkout-back">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full jp-conic p-[1.5px]">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <Plane className="w-4 h-4 -rotate-12 text-zinc-900" />
            </div>
          </div>
          <span className="font-display font-bold tracking-tight">JobPilot</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl tracking-[-0.03em] text-zinc-900 font-medium">Pick your pilot tier</h1>
        <p className="text-zinc-500 mt-2">You can switch or cancel anytime.</p>

        <div className="grid sm:grid-cols-2 gap-5 mt-10">
          {PLANS.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={`relative rounded-3xl p-7 ${p.highlight ? "bg-gradient-to-br from-zinc-950 to-zinc-800 text-white" : "bg-white text-zinc-900 border border-zinc-200"}`}
              data-testid={`checkout-plan-${p.id}`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-7 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.18em] bg-gradient-to-r from-amber-400 to-orange-500 text-zinc-900">
                  <Sparkles className="w-3 h-3" /> Recommended
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-2xl">{p.name}</h3>
                <div>
                  <span className="font-display text-4xl font-medium">₹{p.price}</span>
                  <span className={`${p.highlight ? "text-white/50" : "text-zinc-400"} text-sm ml-1`}>/mo</span>
                </div>
              </div>
              <ul className="mt-5 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className={`w-4 h-4 mt-0.5 ${p.highlight ? "text-emerald-400" : "text-emerald-600"}`} />
                    <span className={p.highlight ? "text-white/85" : "text-zinc-700"}>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => buy(p.id)}
                disabled={busy === p.id}
                className={`mt-6 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[15px] font-medium ${p.highlight ? "bg-white text-zinc-900 hover:bg-zinc-100" : "jp-btn-primary"}`}
                data-testid={`checkout-pay-${p.id}`}
              >
                {busy === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : `Pay ₹${p.price}`}
              </button>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-center text-sm text-zinc-400">
          Not ready? <Link to="/dashboard" className="text-zinc-700 jp-link">Continue on Free tier</Link>
        </div>
      </div>
    </div>
  );
}
