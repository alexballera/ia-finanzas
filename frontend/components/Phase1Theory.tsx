"use client";

import { ArrowRight, BookMarked, Check, Lightbulb, TriangleAlert } from "lucide-react";

import { markPhase1Viewed } from "@/lib/storage";
import type { CourseModule, TheoryConcept, WorkedExample } from "@/lib/types";

import { MathFormula } from "./MathFormula";
import { Panel, buttonStyles } from "./ui";

function ConceptCard({ concept, index }: { concept: TheoryConcept; index: number }) {
  return (
    <Panel>
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-sm font-semibold text-emerald-300 tabular-nums">
          {index + 1}
        </span>
        <h3 className="text-lg font-semibold tracking-tight text-white">{concept.title}</h3>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">{concept.explanation}</p>

      <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-slate-50">
        <MathFormula formula={concept.formula_latex} displayMode />
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {concept.variables_legend.map((variable) => (
          <div key={variable.symbol} className="flex items-baseline gap-3 text-sm">
            <dt className="shrink-0 text-emerald-200">
              <MathFormula formula={variable.symbol} />
            </dt>
            <dd className="text-slate-400">{variable.meaning}</dd>
          </div>
        ))}
      </dl>

      <div
        role="note"
        className="mt-5 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"
      >
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden />
        <div>
          <p className="text-xs font-semibold tracking-wide text-amber-300 uppercase">
            Error frecuente
          </p>
          <p className="mt-1 text-sm leading-relaxed text-amber-100/90">{concept.common_pitfall}</p>
        </div>
      </div>
    </Panel>
  );
}

function WorkedExampleSection({ example }: { example: WorkedExample }) {
  return (
    <Panel>
      <p className="text-xs font-semibold tracking-wide text-sky-300 uppercase">Ejemplo resuelto</p>
      <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-white">
        {example.scenario_title}
      </h3>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-800">
        <p className="border-b border-slate-800 bg-slate-950/70 px-4 py-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
          Datos
        </p>
        <dl className="divide-y divide-slate-800">
          {example.given_data.map((item) => (
            <div key={item.label} className="grid gap-1 px-4 py-2.5 text-sm sm:grid-cols-5 sm:gap-4">
              <dt className="text-slate-400 sm:col-span-2">{item.label}</dt>
              <dd className="font-medium text-slate-100 tabular-nums sm:col-span-3">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <ol className="mt-6 space-y-4">
        {example.steps.map((step) => (
          <li key={step.step_number} className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-500/40 bg-sky-500/10 text-sm font-semibold text-sky-300 tabular-nums">
              {step.step_number}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-100">{step.description}</p>
              <p className="mt-2 overflow-x-auto rounded-lg bg-slate-950/70 px-3 py-2 font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-300 tabular-nums">
                {step.calculation}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Resultado:{" "}
                <span className="font-semibold text-emerald-300 tabular-nums">{step.result}</span>
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <p className="text-xs font-semibold tracking-wide text-emerald-300 uppercase">Conclusión</p>
        <p className="mt-1 text-sm leading-relaxed text-emerald-50">{example.final_conclusion}</p>
      </div>
    </Panel>
  );
}

export function Phase1Theory({
  courseModule,
  completed,
  onContinue,
}: {
  courseModule: CourseModule;
  completed: boolean;
  onContinue: () => void;
}) {
  const theory = courseModule.phase_1_theory;

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="cfo-intuition-title"
        className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-slate-900/60 p-5 sm:p-6"
      >
        <div className="flex items-center gap-2.5">
          <Lightbulb className="h-5 w-5 text-emerald-300" aria-hidden />
          <h2
            id="cfo-intuition-title"
            className="text-xs font-semibold tracking-wide text-emerald-300 uppercase"
          >
            La intuición del CFO
          </h2>
        </div>
        <p className="mt-3 text-base leading-relaxed text-slate-100">{theory.cfo_intuition}</p>
      </section>

      <section aria-labelledby="concepts-title" className="space-y-5">
        <h2 id="concepts-title" className="text-xl font-semibold tracking-tight text-white">
          Conceptos clave
        </h2>
        {theory.concepts.map((concept, index) => (
          <ConceptCard key={concept.title} concept={concept} index={index} />
        ))}
      </section>

      <WorkedExampleSection example={theory.worked_example} />

      <section aria-labelledby="sources-title" className="px-1">
        <h2
          id="sources-title"
          className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-400 uppercase"
        >
          <BookMarked className="h-4 w-4" aria-hidden />
          Fuentes del módulo
        </h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-400">
          {courseModule.bibliographic_sources.map((source) => (
            <li key={source}>{source}</li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            {completed && <Check className="h-4 w-4 text-emerald-300" aria-hidden />}
            {completed ? "Fase 1 completada" : "¿Teoría leída?"}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            La Fase 2 pone a prueba estos conceptos con flashcards y quizzes.
          </p>
        </div>
        <button
          type="button"
          className={buttonStyles.primary}
          onClick={() => {
            markPhase1Viewed(courseModule.module_id);
            onContinue();
          }}
        >
          {completed ? "Ir a la Fase 2" : "Marcar Fase 1 como completada y pasar a la Fase 2"}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
