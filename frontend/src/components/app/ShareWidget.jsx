import { useState } from "react";
import { motion } from "framer-motion";
import { Share2, Loader2, Copy, Check, Linkedin, Twitter, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";

export default function ShareWidget({ profile }) {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = token ? `${window.location.origin}/share/${token}` : null;

  const create = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/share/create");
      setToken(data.token);
      toast.success("Share card ready ✨");
    } catch {
      toast.error("Couldn't create share card");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 1800);
  };

  const nativeShare = async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My JobPilot dispatch",
          text: "While I sleep — JobPilot applies.",
          url: shareUrl,
        });
      } catch {}
    } else {
      copy();
    }
  };

  const linkedinShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl || "")}`;
  const tweetText = `My JobPilot is flying ✈️ ${profile?.applications_count || 0} applications, ${profile?.interviews_count || 0} interviews, ${profile?.offers_count || 0} offers — all while I slept.`;
  const twitterShare = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl || "")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
      className="relative jp-card rounded-2xl p-5 overflow-hidden"
      data-testid="share-widget"
    >
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 opacity-10 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-400 font-semibold">
          <Share2 className="w-3.5 h-3.5" /> Share your pilot stats
        </div>
        <p className="text-sm text-zinc-600 mt-2">
          Brag a little. Inspire a friend. Each share comes with a beautifully-rendered card built from your real stats.
        </p>

        {!token ? (
          <button
            onClick={create}
            disabled={loading}
            className="mt-4 w-full jp-btn-primary inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium"
            data-testid="share-create-btn"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create my share card <Share2 className="w-4 h-4" /></>}
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <a
              href={`${process.env.REACT_APP_BACKEND_URL}/api/share/${token}/og.png`}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl overflow-hidden border border-zinc-200 group"
              data-testid="share-preview"
            >
              <img
                src={`${process.env.REACT_APP_BACKEND_URL}/api/share/${token}/og.png`}
                alt="Share card preview"
                className="w-full transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </a>
            <div className="flex gap-2">
              <input
                readOnly
                value={shareUrl}
                onClick={(e) => e.currentTarget.select()}
                className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-mono outline-none truncate"
                data-testid="share-url-input"
              />
              <button onClick={copy} className="jp-btn-primary px-3 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5" data-testid="share-copy-btn">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={linkedinShare} target="_blank" rel="noreferrer" className="jp-btn-secondary px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5" data-testid="share-linkedin">
                <Linkedin className="w-3.5 h-3.5" /> LinkedIn
              </a>
              <a href={twitterShare} target="_blank" rel="noreferrer" className="jp-btn-secondary px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5" data-testid="share-twitter">
                <Twitter className="w-3.5 h-3.5" /> Twitter
              </a>
              <button onClick={nativeShare} className="jp-btn-secondary px-3 py-1.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5" data-testid="share-native">
                <ExternalLink className="w-3.5 h-3.5" /> More
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
