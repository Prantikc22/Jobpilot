import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { AuthShell, Field } from "./SignIn";

export default function SignUp() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pwd,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data?.session) {
      toast.success("Welcome to JobPilot");
      nav("/onboarding");
    } else {
      // Auto sign in (no email confirm if disabled)
      const { error: e2 } = await supabase.auth.signInWithPassword({ email, password: pwd });
      if (e2) {
        toast.info("Check your email to confirm your account.");
        nav("/signin");
      } else {
        nav("/onboarding");
      }
    }
  };

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
