import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

const LANGS = [
  { code: "en", label: "English", short: "EN" },
  { code: "hi", label: "हिन्दी", short: "HI" },
  { code: "es", label: "Español", short: "ES" },
];

export default function LanguageSwitcher({ dark = false }) {
  const { i18n } = useTranslation();
  const current = LANGS.find((l) => l.code === i18n.language?.split("-")[0]) || LANGS[0];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] px-2.5 py-1.5 rounded-full transition-all ${
            dark ? "text-white/70 hover:text-white hover:bg-white/10" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
          data-testid="lang-switcher-trigger"
        >
          <Languages className="w-3.5 h-3.5" />
          {current.short}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="min-w-[150px] rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl z-[100]"
          data-testid="lang-switcher-menu"
        >
          {LANGS.map((l) => (
            <DropdownMenu.Item
              key={l.code}
              onSelect={() => i18n.changeLanguage(l.code)}
              className={`flex items-center justify-between px-3 py-2 text-sm rounded-xl cursor-pointer outline-none data-[highlighted]:bg-zinc-100 ${
                current.code === l.code ? "font-semibold text-zinc-900" : "text-zinc-600"
              }`}
              data-testid={`lang-option-${l.code}`}
            >
              <span>{l.label}</span>
              <span className="text-[10px] font-mono text-zinc-400">{l.short}</span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
