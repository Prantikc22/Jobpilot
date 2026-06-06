import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { Lock, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Field } from "./SignIn";

export default function AdminLogin() {
  const [email, setEmail] = useState("admin@jobpilot.ai");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/admin/login`, { email, password: pwd });
      localStorage.setItem("jp_admin_token", data.token);
      toast.success("Welcome, admin");
      nav("/admin");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Invalid credentials");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0A0F1C] to-[#040810] text-white flex items-center justify-center px-6" data-testid="admin-login-page">
      <div className="jp-beam bg-blue-500/30 top-10 left-10 w-[400px] h-[400px]" />
      <div className="jp-beam bg-violet-500/20 bottom-10 right-10 w-[400px] h-[400px]" />
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative w-full max-w-md">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/50 font-semibold mb-3">
          <ShieldCheck className="w-4 h-4" /> Restricted
        </div>
        <h1 className="font-display text-4xl tracking-[-0.03em] font-medium">Admin Console</h1>
        <p className="text-white/60 mt-2">Operations, users, and revenue.</p>
        <form onSubmit={onSubmit} className="mt-7 space-y-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6" data-testid="admin-login-form">
          <FieldDark label="Email" type="email" value={email} onChange={setEmail} testid="admin-email" />
          <FieldDark label="Password" type="password" value={pwd} onChange={setPwd} testid="admin-password" />
          <button disabled={busy} className="w-full bg-white text-zinc-900 hover:bg-zinc-100 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[15px] font-medium" data-testid="admin-login-submit">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign in <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
        <p className="mt-4 text-xs text-white/40 text-center">JobPilot Admin v1 · all access logged</p>
      </motion.div>
    </div>
  );
}

function FieldDark({ label, type = "text", value, onChange, testid }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.16em] text-white/50 font-semibold">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="mt-1.5 w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-white/40 focus:bg-white/10 outline-none transition-all text-[15px]"
        data-testid={testid}
      />
    </label>
  );
}
