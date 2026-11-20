"use client";

import { ArrowLeft, Check, Lock } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  isModuleUnlocked,
  isPhaseCompleted,
  isPhaseUnlocked,
  useAppState,
  useHydrated,
  type AppState,
} from "@/lib/storage";
import type { CourseModule, PhaseNumber } from "@/lib/types";
import { cn } from "@/lib/utils";

import { Phase1Theory } from "./Phase1Theory";
import { Phase2Cards } from "./Phase2Cards";
import { CFOSimulator } from "./simulator/CFOSimulator";
import { usePublishTutorContext } from "./TutorContextProvider";
import { Badge, Panel, buttonStyles } from "./ui";

const PHASES: readonly { phase: PhaseNumber; title: string; subtitle: string }[] = [
  { phase: 1, title: "Teoría", subtitle: "Conceptos y ejemplo resuelto" },
  { phase: 2, title: "Práctica", subtitle: "Flashcards y quizzes" },
  { phase: 3, title: "Simulación", subtitle: "Caso real de 3 trimestres" },
];

function firstPendingPhase(state: AppState, courseModule: CourseModule): PhaseNumber {
  const moduleId = courseModule.module_id;
  return (
    PHASES.map(({ phase }) => phase).find(
      (phase) =>
        !isPhaseCompleted(state.modules[moduleId], phase) &&
        isPhaseUnlocked(state, moduleId, phase),
    ) ?? 1
  );
}

export function ModuleView({ courseModule }: { courseModule: CourseModule }) {
  const state = useAppState();
  const hydrated = useHydrated();
  const moduleId = courseModule.module_id;
  const unlocked = hydrated && isModuleUnlocked(state, moduleId);
  const tutorContext = useMemo(() => unlocked ? null : ({
    module_id: moduleId, module_title: courseModule.title,
  }), [unlocked, moduleId, courseModule.title]);
  usePublishTutorContext(tutorContext);

  return (
    <div className="space-y-8">
      <header>
        <Link
          href="/curriculum"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Mapa Curricular
        </Link>
        <div className="mt-4">
          <Badge tone="emerald">Módulo {moduleId}</Badge>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          {courseModule.title}
        </h1>
        <p className="mt-2 max-w-3xl text-base text-slate-400">{courseModule.subtitle}</p>
      </header>

      {!hydrated ? (
        // El progreso vive en localStorage: hasta leerlo no se sabe qué fase mostrar.
        <div aria-busy="true" className="space-y-4">
          <div className="h-20 animate-pulse rounded-2xl bg-slate-900" />
          <div className="h-64 animate-pulse rounded-2xl bg-slate-900" />
        </div>
      ) : !unlocked ? (
        <Panel className="text-center">
          <Lock className="mx-auto h-8 w-8 text-slate-500" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold text-white">Módulo bloqueado</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            Se habilita al completar las Fases 1 y 2 del Módulo {moduleId - 1}, o al activar el
            Modo Docente / Demo en la barra superior.
          </p>
          <Link href={`/modules/${moduleId - 1}`} className={cn(buttonStyles.secondary, "mt-5")}>
            Ir al Módulo {moduleId - 1}
          </Link>
        </Panel>
      ) : (
        <ModulePhases courseModule={courseModule} state={state} />
      )}
    </div>
  );
}

/** Se monta con el progreso ya leído, así la fase inicial se elige una sola vez. */
function ModulePhases({ courseModule, state }: { courseModule: CourseModule; state: AppState }) {
  const moduleId = courseModule.module_id;
  const progress = state.modules[moduleId];
  const [selectedPhase, setSelectedPhase] = useState<PhaseNumber>(() =>
    firstPendingPhase(state, courseModule),
  );
  // Si el progreso se reinicia, la fase elegida puede quedar bloqueada.
  const activePhase = isPhaseUnlocked(state, moduleId, selectedPhase) ? selectedPhase : 1;
  const tutorContext = useMemo(() => activePhase === 1 ? {
    phase: activePhase, module_id: moduleId, module_title: courseModule.title,
  } : null, [activePhase, moduleId, courseModule.title]);
  usePublishTutorContext(tutorContext);

  function goToPhase(phase: PhaseNumber) {
    setSelectedPhase(phase);
    window.scrollTo({ top: 0 });
  }

  return (
    <>
      <div
        role="tablist"
        aria-label="Fases del módulo"
        className="grid gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-2 sm:grid-cols-3"
      >
        {PHASES.map(({ phase, title, subtitle }) => {
          const completed = isPhaseCompleted(progress, phase);
          const unlocked = isPhaseUnlocked(state, moduleId, phase);
          const active = phase === activePhase;
          return (
            <button
              key={phase}
              type="button"
              role="tab"
              id={`phase-tab-${phase}`}
              aria-selected={active}
              aria-controls="phase-panel"
              disabled={!unlocked}
              onClick={() => goToPhase(phase)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-colors",
                active ? "bg-slate-800" : "hover:bg-slate-800/50",
                !unlocked && "cursor-not-allowed opacity-50 hover:bg-transparent",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold tabular-nums",
                  completed
                    ? "border-emerald-400 bg-emerald-400 text-slate-950"
                    : active
                      ? "border-emerald-400 text-emerald-300"
                      : "border-slate-600 text-slate-400",
                )}
              >
                {completed ? (
                  <Check className="h-4 w-4" aria-label="Completada" />
                ) : unlocked ? (
                  phase
                ) : (
                  <Lock className="h-3.5 w-3.5" aria-label="Bloqueada" />
                )}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-sm font-semibold",
                    active ? "text-white" : "text-slate-300",
                  )}
                >
                  Fase {phase} · {title}
                </span>
                <span className="block truncate text-xs text-slate-500">{subtitle}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div id="phase-panel" role="tabpanel" aria-labelledby={`phase-tab-${activePhase}`}>
        {activePhase === 1 && (
          <Phase1Theory
            courseModule={courseModule}
            completed={progress.phase1Viewed}
            onContinue={() => goToPhase(2)}
          />
        )}
        {activePhase === 2 && (
          <Phase2Cards
            moduleId={moduleId}
            moduleTitle={courseModule.title}
            cards={courseModule.phase_2_cards}
            onContinue={() => goToPhase(3)}
          />
        )}
        {activePhase === 3 && (
          // Al ganar, `saveSimulation` marca phase3Won en localStorage y el stepper se actualiza.
          <CFOSimulator
            scenarioId={courseModule.phase_3_brief.scenario_id}
            moduleId={courseModule.module_id}
            moduleTitle={courseModule.title}
          />
        )}
      </div>
    </>
  );
}
