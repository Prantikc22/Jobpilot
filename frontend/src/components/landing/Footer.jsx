import { Link } from "react-router-dom";
import { Plane } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white py-14" data-testid="site-footer">
      <div className="max-w-7xl mx-auto px-6 md:px-8 grid md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full jp-conic p-[1.5px]">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <Plane className="w-4 h-4 -rotate-12 text-zinc-900" />
              </div>
            </div>
            <span className="font-display font-bold text-lg tracking-tight">ApplyAgent</span>
          </div>
          <p className="mt-4 text-sm text-zinc-500 max-w-xs">
            The autonomous job search agent that applies on your behalf — to roles that actually fit.
          </p>
        </div>
        {[
          {
            h: "Product",
            l: [
              { label: "Features", to: "/#features" },
              { label: "Pricing", to: "/#pricing" },
              { label: "Dashboard", to: "/dashboard" },
            ],
          },
          {
            h: "Company",
            l: [
              { label: "About", to: "/about-us" },
              { label: "Contact", to: "/contact-us" },
            ],
          },
          {
            h: "Legal",
            l: [
              { label: "Terms of Service", to: "/terms" },
              { label: "Privacy Policy", to: "/privacy" },
              { label: "Refund Policy", to: "/refund-policy" },
              { label: "Shipping Policy", to: "/shipping" },
            ],
          },
        ].map((col) => (
          <div key={col.h}>
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-400 font-semibold">{col.h}</div>
            <ul className="mt-4 space-y-2.5 text-sm text-zinc-600">
              {col.l.map((i) => (
                <li key={i.label}>
                  {i.to.startsWith("/#") ? (
                    <a href={i.to.replace("/", "")} className="jp-link">{i.label}</a>
                  ) : (
                    <Link to={i.to} className="jp-link">{i.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto px-6 md:px-8 mt-10 pt-6 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="text-xs text-zinc-400">© 2026 ApplyAgent. All rights reserved.</span>
        <span className="text-xs text-zinc-400 font-mono">v1.0 · made with focus</span>
      </div>
    </footer>
  );
}
