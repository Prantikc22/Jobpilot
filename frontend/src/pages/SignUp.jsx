import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { AuthShell, Field } from "./SignIn";

export default function SignUp() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifySent, setVerifySent] = useState(false);
  const nav = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pwd,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    if (data?.session) {
      setLoading(false);
      toast.success("Welcome to JobPilot");
      nav("/onboarding");
      return;
    }
    // No session — Supabase project requires email confirm. Try direct sign-in once (if confirm is OFF this works).
    const { error: e2 } = await supabase.auth.signInWithPassword({ email, password: pwd });
    setLoading(false);
    if (!e2) {
      nav("/onboarding");
    } else {
      // Show verify-email screen
      setVerifySent(true);
    }
  };

  if (verifySent) {
    return (
      <AuthShell title="Check your inbox" subtitle="One last step before takeoff." testid="signup-verify-page">
        <div className="text-center" data-testid="signup-verify-card">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <MailCheck className="w-7 h-7 text-emerald-600" />
          </div>
          <p className="text-zinc-700">
            We sent a confirmation link to <span className="font-semibold text-zinc-900">{email}</span>.
          </p>
          <p className="text-sm text-zinc-500 mt-2">
            Click the link to verify, then sign in. You'll go straight to onboarding.
          </p>
          <Link
            to="/signin"
            className="mt-6 inline-flex items-center gap-2 jp-btn-primary px-5 py-3 rounded-full text-sm font-medium"
            data-testid="signup-verify-signin"
          >
            Go to sign in <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={() => setVerifySent(false)}
            className="block mx-auto mt-4 text-xs text-zinc-400 hover:text-zinc-700"
            data-testid="signup-verify-back"
          >
            Use a different email
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your pilot" subtitle="60 seconds. No credit card required." testid="signup-page">
      <form onSubmit={onSubmit} className="space-y-3" data-testid="signup-form">
        <Field label="Full name" value={fullName} onChange={setFullName} required testid="signup-name" />
        <Field label="Work email" type="email" value={email} onChange={setEmail} required testid="signup-email" />
        <Field label="Password" type="password" value={pwd} onChange={setPwd} required testid="signup-password" />
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
