import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2, Gift } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { supabase } from "../lib/supabase";
import { api } from "../lib/api";
import { AuthShell, Field } from "./SignIn";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function SignUp() {
  const [searchParams] = useSearchParams();
  const refCodeFromUrl = (searchParams.get("ref") || "").toUpperCase();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [refCode] = useState(refCodeFromUrl);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const applyReferralIfAny = async () => {
    if (!refCode.trim()) return;
    try {
      await api.post("/referrals/apply", { code: refCode.trim().toUpperCase() });
      toast.success("Referral code applied 🎁");
    } catch { /* silent */ }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1) Create + auto-confirm user via backend (uses Supabase admin API)
      await axios.post(`${BACKEND}/api/auth/signup`, {
        email,
        password: pwd,
        full_name: fullName,
      });

      // 2) Sign in immediately
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: pwd });
      if (signInError) {
        toast.error(signInError.message);
        setLoading(false);
        return;
      }

      await applyReferralIfAny();
      toast.success("Welcome to ApplyAgent ✈️");
      nav("/onboarding");
    } catch (err) {
      const detail = err.response?.data?.detail || "Sign-up failed";
      if (err.response?.status === 409) {
        toast.error("Account already exists. Try signing in.");
        setTimeout(() => nav("/signin"), 1200);
      } else {
        toast.error(detail);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create your pilot" subtitle="60 seconds. No credit card required." testid="signup-page">
      <form onSubmit={onSubmit} className="space-y-3" data-testid="signup-form">
        <Field label="Full name" value={fullName} onChange={setFullName} required testid="signup-name" />
        <Field label="Work email" type="email" value={email} onChange={setEmail} required testid="signup-email" />
        <Field label="Password" type="password" value={pwd} onChange={setPwd} required testid="signup-password" />
        {refCode && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs" data-testid="signup-ref-banner">
            <Gift className="w-3.5 h-3.5" />
            <span>Referral code <span className="font-mono font-semibold">{refCode}</span> will be applied</span>
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full jp-btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[15px] font-medium"
          data-testid="signup-submit"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create account <ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>
      <p className="mt-6 text-sm text-zinc-500 text-center">
        Already piloting? <Link to="/signin" className="text-zinc-900 jp-link">Sign in</Link>
      </p>
    </AuthShell>
  );
}
