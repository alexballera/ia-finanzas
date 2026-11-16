"use client";

import { ArrowRight, Check, Clock, Lock } from "lucide-react";
import Link from "next/link";

import {
  countCompletedPhases,
  isModuleUnlocked,
  isPhaseCompleted,
  useAppState,
  type ModuleProgress,
} from "@/lib/storage";
import type { FutureModule, ModuleId, PhaseNumber } from "@/lib/types";
import { cn } from "@/lib/utils";

import { Badge } from "./ui";

/** Datos mínimos de un módulo para la grilla; evita enviar el JSON completo al cliente. */
export interface ModuleSummary {
  moduleId: ModuleId;
  title: string;
  subtitle: string;
  conceptCount: number;
  cardCount: number;
  companyName: string;
}

const PHASES: readonly { phase: PhaseNumber; label: string }[] = [
  { phase: 1, label: "Teoría" },
  { phase: 2, label: "Flashcards y quizzes" },
  { phase: 3, label: "Simulación de caso" },
];

function phaseDetail(summary: ModuleSummary, progress: ModuleProgress, phase: PhaseNumber): string {
  if (phase === 1) {
    return `${summary.conceptCount} conceptos`;
  }
  if (phase === 2) {
    return progress.phase2BestScore !== null && progress.phase2Total !== null
      ? `Mejor puntaje ${progress.phase2BestScore}/${progress.phase2Total}`
      : `${summary.cardCount} tarjetas`;
  }
  return summary.companyName;
}

function ActiveModuleCard({ summary }: { summary: ModuleSummary }) {
  const state = useAppState();
  const progress = state.modules[summary.moduleId];
  const unlocked = isModuleUnlocked(state, summary.moduleId);
  const completed = countCompletedPhases(progress);
  const callToAction = completed === 0 ? "Comenzar" : completed === 3 ? "Repasar" : "Continuar";

  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <Badge tone={unlocked ? "emerald" : "neutral"}>Módulo {summary.moduleId}</Badge>
        <span className="text-xs font-medium text-slate-400 tabular-nums">
          {completed}/3 fases
        </span>
      </div>

      <h3 className="mt-4 text-lg font-semibold tracking-tight text-white">{summary.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{summary.subtitle}</p>

      <ul className="mt-5 space-y-2.5">
        {PHASES.map(({ phase, label }) => {
          const done = isPhaseCompleted(progress, phase);
          return (
            <li key={phase} className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                  done
                    ? "border-emerald-400 bg-emerald-400 text-slate-950"
                    : "border-slate-700 text-slate-400",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : phase}
              </span>
              <span className={cn("font-medium", done ? "text-white" : "text-slate-300")}>
                {label}
              </span>
              <span className="ml-auto truncate text-xs text-slate-500 tabular-nums">
                {phaseDetail(summary, progress, phase)}
              </span>
              {done && <span className="sr-only">(completada)</span>}
            </li>
          );
        })}
      </ul>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-emerald-400 transition-all"
          style={{ width: `${(completed / 3) * 100}%` }}
        />
      </div>

      <div className="mt-auto flex items-center gap-2 pt-5 text-sm font-semibold">
        {unlocked ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-300">
            {callToAction}
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-500">
            <Lock className="h-4 w-4" aria-hidden />
            Se habilita al completar las Fases 1 y 2 del Módulo {summary.moduleId - 1}
          </span>
        )}
      </div>
    </>
  );

  const cardClass = "flex h-full flex-col rounded-2xl border p-5 sm:p-6";
  if (!unlocked) {
    return (
      <div className={cn(cardClass, "border-slate-800 bg-slate-900/30 opacity-75")}>{body}</div>
    );
  }
  return (
    <Link
      href={`/modules/${summary.moduleId}`}
      className={cn(
        cardClass,
        "group border-slate-800 bg-slate-900/60 transition-colors hover:border-emerald-500/60 hover:bg-slate-900",
      )}
    >
      {body}
    </Link>
  );
}

function FutureModuleCard({ futureModule }: { futureModule: FutureModule }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <Badge>Módulo {futureModule.module_id}</Badge>
        <Badge tone="amber">
          <Clock className="h-3 w-3" aria-hidden />
          Próximamente (Roadmap V2)
        </Badge>
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-300">
        {futureModule.title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{futureModule.summary}</p>
      <p className="mt-auto flex items-center gap-1.5 pt-5 text-sm font-medium text-slate-600">
        <Lock className="h-4 w-4" aria-hidden />
        Contenido en preparación
      </p>
    </div>
  );
}

export function CurriculumGrid({
  modules,
  futureModules,
}: {
  modules: readonly ModuleSummary[];
  futureModules: readonly FutureModule[];
}) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {modules.map((summary) => (
        <li key={summary.moduleId}>
          <ActiveModuleCard summary={summary} />
        </li>
      ))}
      {futureModules.map((futureModule) => (
        <li key={futureModule.module_id}>
          <FutureModuleCard futureModule={futureModule} />
        </li>
      ))}
    </ul>
  );
}
