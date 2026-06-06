import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Gift, Copy, Check, Loader2, Users, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";

export default function ReferralWidget() {
  const [ref, setRef] = useState(null);
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get("/referrals/mine").then(({ data }) => setRef(data)).catch(() => {});
  }, []);

  const inviteUrl = ref?.referral_code
    ? `${window.location.origin}/signup?ref=${ref.referral_code}`
    : "";

  const copy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Invite link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const apply = async () => {
    setApplying(true);
    try {
      await api.post("/referrals/apply", { code: code.trim().toUpperCase() });
      toast.success("Referral applied! Your referrer earned credits.");
      setCode("");
      const { data } = await api.get("/referrals/mine");
      setRef(data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Couldn't apply code");
    } finally {
      setApplying(false);
    }
  };

  if (!ref) {
    return (
      <div className="jp-card rounded-2xl p-5 flex items-center justify-center min-h-[180px]">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative jp-card rounded-2xl p-5 overflow-hidden"
      data-testid="referral-widget"
    >
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 opacity-10 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-400 font-semibold">
          <Gift className="w-3.5 h-3.5" /> Refer friends · earn applications
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="font-display text-3xl font-medium" data-testid="referral-credits">+{ref.referral_credits || 0}</div>
            <div className="text-xs text-zinc-500">bonus applications earned</div>
          </div>
          <div className="text-right">
            <div className="font-display text-xl font-medium flex items-center gap-1.5 justify-end" data-testid="referral-invited">
              <Users className="w-4 h-4 text-zinc-400" />
              {ref.invited_count || 0}
            </div>
            <div className="text-xs text-zinc-500">friends joined</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs uppercase tracking-[0.16em] text-zinc-400 font-semibold mb-1.5">Your invite link</div>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteUrl}
              className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-mono outline-none truncate"
              data-testid="referral-link-input"
              onClick={(e) => e.currentTarget.select()}
            />
            <button
              onClick={copy}
              className="jp-btn-primary px-3 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5"
              data-testid="referral-copy"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1.5 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Each friend who signs up gives you +{ref.credit_per_invite} applications
          </div>
        </div>

        {/* Apply someone else's code */}
        <div className="mt-4 pt-4 border-t border-zinc-100">
          <div className="text-xs uppercase tracking-[0.16em] text-zinc-400 font-semibold mb-1.5">Have a friend's code?</div>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="PILOT-XXXX"
              className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 text-xs font-mono outline-none uppercase tracking-wider"
              data-testid="referral-apply-input"
            />
            <button
              onClick={apply}
              disabled={!code.trim() || applying}
              className="jp-btn-secondary px-3 py-2 rounded-xl text-xs font-medium disabled:opacity-50"
              data-testid="referral-apply-btn"
            >
              {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
