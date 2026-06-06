import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plane, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    nav("/dashboard");
  };

  return (
    <AuthShell title="Welcome back" subtitle="Pick up where you left off." testid="signin-page">
      <form onSubmit={onSubmit} className="space-y-3" data-testid="signin-form">
        <Field label="Email" type="email" value={email} onChange={setEmail} required testid="signin-email" />
        <Field label="Password" type="password" value={pwd} onChange={setPwd} required testid="signin-password" />
        <button
          type="submit"
          disabled={loading}
          className="w-full jp-btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[15px] font-medium"
          data-testid="signin-submit"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign in <ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>
      <p className="mt-6 text-sm text-zinc-500 text-center">
        New here? <Link to="/signup" className="text-zinc-900 jp-link">Create an account</Link>
      </p>
      <p className="mt-2 text-xs text-zinc-400 text-center">
        <Link to="/admin/login" className="jp-link">Admin login</Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children, testid }) {
  return (
    <div className="min-h-screen relative overflow-hidden" data-testid={testid}>
      <div className="jp-mesh" aria-hidden />
      <div className="absolute inset-0 jp-dot-grid opacity-20" />

      <Link to="/" className="absolute top-6 left-6 flex items-center gap-2 group z-10" data-testid="auth-back-home">
        <div className="w-8 h-8 rounded-full jp-conic p-[1.5px]">
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
            <Plane className="w-4 h-4 -rotate-12 text-zinc-900" />
          </div>
        </div>
        <span className="font-display font-bold tracking-tight">JobPilot</span>
      </Link>

      <div className="relative max-w-md mx-auto pt-28 pb-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-display text-4xl md:text-5xl tracking-[-0.03em] leading-tight text-zinc-900 font-medium">{title}</h1>
          <p className="mt-2 text-zinc-500">{subtitle}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-8 jp-glass rounded-3xl p-6"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}

export function Field({ label, type = "text", value, onChange, required, testid, placeholder }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.16em] text-zinc-500 font-semibold">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full px-4 py-3 rounded-2xl bg-white border border-zinc-200 focus:border-zinc-900 focus:ring-4 focus:ring-zinc-900/5 outline-none transition-all text-[15px]"
        data-testid={testid}
      />
    </label>
  );
}
