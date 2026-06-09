import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Plane } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import LanguageSwitcher from "../LanguageSwitcher";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
      className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4"
      data-testid="site-navbar"
    >
      <div
        className={`jp-glass flex items-center justify-between gap-6 rounded-full pl-4 pr-2 py-2 transition-all duration-500 ${
          scrolled ? "w-[min(960px,96%)] shadow-xl" : "w-[min(1080px,98%)]"
        }`}
      >
        <Link to="/" className="flex items-center gap-2 group" data-testid="nav-logo">
          <div className="w-8 h-8 rounded-full jp-conic p-[1.5px]">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <Plane className="w-4 h-4 -rotate-12 text-zinc-900" />
            </div>
          </div>
          <span className="font-display font-bold text-[17px] tracking-tight">ApplyAgent</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm text-zinc-600">
          <a href="#story" className="jp-link" data-testid="nav-story">{t("nav.story")}</a>
          <a href="#features" className="jp-link" data-testid="nav-features">{t("nav.features")}</a>
          <a href="#pricing" className="jp-link" data-testid="nav-pricing">{t("nav.pricing")}</a>
        </nav>

        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          {user ? (
            <>
              <button
                onClick={() => navigate("/dashboard")}
                className="hidden sm:inline-flex items-center text-sm px-3 py-2 rounded-full text-zinc-700 hover:text-zinc-900"
                data-testid="nav-dashboard"
              >
                {t("nav.dashboard")}
              </button>
              <button
                onClick={async () => { await signOut(); navigate("/"); }}
                className="text-sm px-4 py-2 rounded-full jp-btn-primary"
                data-testid="nav-signout"
              >
                {t("nav.signout")}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/signin"
                className="hidden sm:inline-flex items-center text-sm px-3 py-2 rounded-full text-zinc-700 hover:text-zinc-900"
                data-testid="nav-signin"
              >
                {t("nav.signin")}
              </Link>
              <Link
                to="/signup"
                className="text-sm px-4 py-2 rounded-full jp-btn-primary whitespace-nowrap"
                data-testid="nav-get-started"
              >
                {t("nav.start")}
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}
