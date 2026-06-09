import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plane } from "lucide-react";
import { supabase } from "../lib/supabase";
import { api } from "../lib/api";

export default function AuthCallback() {
  const nav = useNavigate();

  useEffect(() => {
    const handle = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        nav("/signin");
        return;
      }
      try {
        const { data: profile } = await api.get("/users/me");
        if (!profile || !profile.onboarding_completed) {
          nav("/onboarding", { replace: true });
        } else {
          nav("/dashboard", { replace: true });
        }
      } catch {
        nav("/onboarding", { replace: true });
      }
    };
    handle();
  }, [nav]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
      <div className="w-10 h-10 rounded-full jp-conic p-[1.5px]">
        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
          <Plane className="w-5 h-5 -rotate-12 text-zinc-900" />
        </div>
      </div>
      <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
      <p className="text-sm text-zinc-400">Signing you in…</p>
    </div>
  );
}
