import { Sparkles } from "lucide-react";
import { getCategory } from "../lib/categories";

export function CategoryIcon({ id, size = "md" }: { id: number | null; size?: "sm" | "md" }) {
  const c = getCategory(id);
  return (
    <span
      className={size === "md" ? "grid size-10 shrink-0 place-items-center rounded-xl text-lg" : "grid size-8 shrink-0 place-items-center rounded-lg text-sm"}
      style={{ backgroundColor: `${c.color}1a` }}
      aria-hidden
    >
      {c.emoji}
    </span>
  );
}

export function CategoryBadge({ id, ai }: { id: number | null; ai?: boolean }) {
  const c = getCategory(id);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
        style={{ backgroundColor: `${c.color}17`, color: shade(c.color) }}
      >
        <span className="size-1.5 rounded-full" style={{ backgroundColor: c.color }} />
        {c.name}
      </span>
      {ai && <AiBadge />}
    </span>
  );
}

export function AiBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-200/60"
      title="Categorized automatically by Gemini"
    >
      <Sparkles className="size-3" /> AI
    </span>
  );
}

/** Darkens a hex color so badge text stays readable on its tinted background. */
function shade(hex: string, amount = 0.45) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - amount));
  const g = Math.round(((n >> 8) & 255) * (1 - amount));
  const b = Math.round((n & 255) * (1 - amount));
  return `rgb(${r}, ${g}, ${b})`;
}
