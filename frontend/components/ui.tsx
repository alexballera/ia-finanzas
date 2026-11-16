import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export const buttonStyles = {
  primary: cn(BUTTON_BASE, "bg-emerald-400 text-slate-950 hover:bg-emerald-300"),
  secondary: cn(
    BUTTON_BASE,
    "border border-slate-700 bg-slate-900 text-slate-100 hover:border-slate-500 hover:bg-slate-800",
  ),
  ghost: cn(BUTTON_BASE, "text-slate-300 hover:bg-slate-800 hover:text-white"),
};

const BADGE_TONES = {
  neutral: "border-slate-700 bg-slate-800/70 text-slate-300",
  emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  sky: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  amber: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  rose: "border-rose-500/40 bg-rose-500/10 text-rose-300",
};

export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6", className)}>
      {children}
    </div>
  );
}
