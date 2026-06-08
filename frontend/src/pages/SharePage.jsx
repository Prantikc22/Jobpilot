import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plane, Trophy, ArrowUpRight, Sparkles } from "lucide-react";
import axios from "axios";

export default function SharePage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_BACKEND_URL}/api/share/${token}`)
      .then((r) => {
        setData(r.data);
        // Update OG meta tags dynamically
        const ogImg = `${process.env.REACT_APP_BACKEND_URL}/api/share/${token}/og.png`;
        const setMeta = (prop, content) => {
          let m = document.querySelector(`meta[property="${prop}"]`);
          if (!m) {
            m = document.createElement("meta");
            m.setAttribute("property", prop);
            document.head.appendChild(m);
          }
          m.setAttribute("content", content);
        };
        const setName = (n, c) => {
          let m = document.querySelector(`meta[name="${n}"]`);
          if (!m) {
            m = document.createElement("meta");
            m.setAttribute("name", n);
            document.head.appendChild(m);
          }
          m.setAttribute("content", c);
        };
        const title = `${r.data.first_name}'s ApplyAgent dispatch`;
        const desc = `${r.data.applications_count} applications · ${r.data.interviews_count} interviews · ${r.data.offers_count} offers. While I sleep — ApplyAgent applies.`;
        document.title = title;
        setMeta("og:title", title);
        setMeta("og:description", desc);
        setMeta("og:image", ogImg);
        setMeta("og:type", "website");
        setName("twitter:card", "summary_large_image");
        setName("twitter:title", title);
        setName("twitter:description", desc);
        setName("twitter:image", ogImg);
      })
      .catch(() => setErr("Share not found"));
  }, [token]);

  const ogImg = `${process.env.REACT_APP_BACKEND_URL}/api/share/${token}/og.png`;

  if (err) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-500" data-testid="share-error">
        {err} · <Link to="/" className="ml-2 text-zinc-900 jp-link">Go home</Link>
      </div>
    );
  }
  if (!data) return <div className="min-h-screen bg-white" />;

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0A0F1C] via-[#0d1530] to-[#040810] text-white" data-testid="share-page">
      <div className="jp-beam bg-blue-500/30 top-10 left-20 w-[500px] h-[500px]" />
      <div className="jp-beam bg-violet-500/20 bottom-10 right-20 w-[500px] h-[500px]" />

      <Link to="/" className="absolute top-6 left-6 flex items-center gap-2 z-10">
        <div className="w-8 h-8 rounded-full jp-conic p-[1.5px]">
          <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
            <Plane className="w-4 h-4 -rotate-12 text-zinc-900" />
          </div>
        </div>
        <span className="font-display font-bold tracking-tight">ApplyAgent</span>
      </Link>

      <div className="relative max-w-3xl mx-auto pt-24 pb-20 px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/70 backdrop-blur">
            <Sparkles className="w-3 h-3" /> Pilot dispatch · while they slept
          </span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="font-display mt-6 text-5xl md:text-6xl lg:text-7xl tracking-[-0.03em] leading-[1.02] font-medium"
        >
          {data.first_name}'s pilot is{" "}
          <span className="jp-gradient-text">flying.</span>
        </motion.h1>
        <p className="mt-5 text-white/65 text-lg max-w-2xl mx-auto">
          {data.applications_count} targeted applications submitted. {data.interviews_count} interview requests received. {data.offers_count} offers — and counting.
        </p>

        <motion.img
          initial={{ opacity: 0, scale: 0.95, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          src={ogImg}
          alt="ApplyAgent dispatch card"
          className="mt-10 mx-auto rounded-3xl border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] max-w-full"
          data-testid="share-og-image"
        />

        <div className="mt-10 grid grid-cols-3 gap-4 max-w-xl mx-auto">
          <Stat label="Applications" value={data.applications_count} />
          <Stat label="Interviews" value={data.interviews_count} />
          <Stat label="Offers" value={data.offers_count} />
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Link to="/signup" className="bg-white text-zinc-900 hover:bg-zinc-100 inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[15px] font-medium" data-testid="share-cta">
            Get my own pilot <ArrowUpRight className="w-4 h-4" />
          </Link>
          <Link to="/" className="border border-white/20 text-white hover:bg-white/5 inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[15px] font-medium">
            See how it works
          </Link>
        </div>

        <div className="mt-12 text-xs uppercase tracking-[0.2em] text-white/40">
          Posted {new Date(data.created_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-semibold">{label}</div>
      <div className="font-display text-3xl font-medium mt-1">{value}</div>
    </div>
  );
}
