import { BookMarked, Cog, Sparkles, TriangleAlert } from "lucide-react";

import type { AIFeedback, ExecutiveVerdict } from "@/lib/types";
import { cn } from "@/lib/utils";

import { Badge, Panel, type BadgeTone } from "../ui";

const VERDICTS: Record<ExecutiveVerdict, { label: string; tone: BadgeTone; bar: string }> = {
  EXCELENTE: { label: "Excelente", tone: "emerald", bar: "bg-emerald-400" },
  ACEPTABLE: { label: "Aceptable", tone: "sky", bar: "bg-sky-400" },
  RIESGOSO: { label: "Riesgoso", tone: "amber", bar: "bg-amber-400" },
  CRITICO: { label: "Crítico", tone: "rose", bar: "bg-rose-400" },
};

export function AIFeedbackCard({ feedback, title }: { feedback: AIFeedback; title: string }) {
  const verdict = VERDICTS[feedback.executive_verdict];
  const fromGemini = feedback.ai_source === "gemini";

  return (
    <Panel className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{title}</p>
          <Badge tone={verdict.tone} className="mt-2 px-3 py-1 text-sm font-semibold">
            {verdict.label}
          </Badge>
        </div>
        <p className="shrink-0 text-right">
          <span className="text-3xl font-semibold tracking-tight text-white tabular-nums">
            {feedback.strategic_score}
          </span>
          <span className="text-sm text-slate-500 tabular-nums"> / 100</span>
          <span className="block text-xs text-slate-400">Puntaje estratégico</span>
        </p>
      </div>

      <div
        className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800"
        role="img"
        aria-label={`Puntaje estratégico: ${feedback.strategic_score} de 100`}
      >
        <div
          className={cn("h-full rounded-full", verdict.bar)}
          style={{ width: `${Math.min(100, Math.max(0, feedback.strategic_score))}%` }}
        />
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-100">{feedback.board_diagnosis}</p>

      {feedback.risk_alert !== null && (
        <div
          role="alert"
          className="mt-4 flex gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5"
        >
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" aria-hidden />
          <div>
            <p className="text-xs font-semibold tracking-wide text-rose-300 uppercase">
              Alerta de riesgo
            </p>
            <p className="mt-1 text-sm leading-relaxed text-rose-50">{feedback.risk_alert}</p>
          </div>
        </div>
      )}

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-400">
        <BookMarked className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{feedback.bibliographic_anchor}</span>
      </p>

      <div className="mt-auto pt-4">
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          {fromGemini ? (
            <Sparkles className="h-3.5 w-3.5 text-sky-400" aria-hidden />
          ) : (
            <Cog className="h-3.5 w-3.5" aria-hidden />
          )}
          {fromGemini ? "Gemini AI" : "Motor Reglas (Fallback)"}
        </span>
      </div>
    </Panel>
  );
}
