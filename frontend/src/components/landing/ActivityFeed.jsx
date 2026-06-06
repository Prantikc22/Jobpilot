import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Trophy, Send, MessageCircle } from "lucide-react";
import { api } from "../../lib/api";
import axios from "axios";

const ICONS = {
  interview: Calendar,
  offer: Trophy,
  submitted: Send,
  response: MessageCircle,
};

const COLORS = {
  interview: "from-violet-500 to-fuchsia-500",
  offer: "from-amber-500 to-orange-500",
  submitted: "from-blue-500 to-indigo-500",
  response: "from-emerald-500 to-teal-500",
};

export default function ActivityFeed() {
  const [items, setItems] = useState([]);
  const [stack, setStack] = useState([]);

  useEffect(() => {
    const url = `${process.env.REACT_APP_BACKEND_URL}/api/activity/feed`;
    const fetchOnce = async () => {
      try {
        const { data } = await axios.get(url);
        setItems((prev) => [...data.items, ...prev].slice(0, 60));
      } catch {}
    };
    fetchOnce();
    const id = setInterval(fetchOnce, 9000);
    return () => clearInterval(id);
  }, []);

  // Rotate visible stack from items every 2s
  useEffect(() => {
    if (!items.length) return;
    let idx = 0;
    setStack(items.slice(0, 4));
    const id = setInterval(() => {
      idx = (idx + 1) % Math.max(items.length, 1);
      const next = items[idx];
      if (!next) return;
      setStack((prev) => [{ ...next, _k: Date.now() + Math.random() }, ...prev].slice(0, 4));
    }, 2200);
    return () => clearInterval(id);
  }, [items]);

  return (
    <section id="activity" className="relative py-24 md:py-32" data-testid="activity-section">
      <div className="max-w-7xl mx-auto px-6 md:px-8 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <span className="text-xs uppercase tracking-[0.24em] text-zinc-400 font-semibold">Live · right now</span>
          <h2 className="font-display mt-3 text-4xl md:text-5xl lg:text-6xl tracking-[-0.03em] leading-[1.02] text-zinc-900 font-medium">
            People getting hired,<br /> <span className="text-zinc-400">while you read this.</span>
          </h2>
          <p className="mt-6 text-zinc-500 max-w-md text-lg">
            Real outcomes streaming from our active pilots. No screenshots, no scripts — just receipts.
          </p>
          <div className="mt-8 flex items-center gap-3 text-sm text-zinc-500">
            <div className="flex -space-x-2">
              {["https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=80",
                "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=80",
                "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=80",
              ].map((u, i) => (
                <img key={i} src={u} alt="" className="w-8 h-8 rounded-full border-2 border-white object-cover" />
              ))}
            </div>
            <span>3,200+ pilots active this week</span>
          </div>
        </div>

        {/* Right: animated stack */}
        <div className="relative h-[440px]">
          <div className="absolute inset-0 jp-dot-grid opacity-30" />
          <AnimatePresence>
            {stack.map((it, idx) => {
              const Icon = ICONS[it.kind] || MessageCircle;
              return (
                <motion.div
                  key={it._k || `${it.name}-${idx}`}
                  layout
                  initial={{ opacity: 0, y: -30, scale: 0.9 }}
                  animate={{ opacity: 1, y: idx * 84, scale: 1 - idx * 0.04 }}
                  exit={{ opacity: 0, y: 460, scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 130, damping: 18 }}
                  style={{ zIndex: 10 - idx }}
                  className="absolute left-0 right-4 jp-glass rounded-2xl p-4 flex items-center gap-4"
                  data-testid={`activity-item-${idx}`}
                >
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${COLORS[it.kind] || "from-zinc-500 to-zinc-700"} flex items-center justify-center shadow-md shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] text-zinc-900 leading-snug">
                      <span className="font-semibold">{it.name}</span>{" "}
                      <span className="text-zinc-500">{it.text}</span>{" "}
                      {it.company && <span className="font-semibold">{it.company}</span>}
                      {it.role && <span className="text-zinc-400"> — {it.role}</span>}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 font-mono">just now</div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
