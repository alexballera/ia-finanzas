import { BookOpen, Layers, Target, Trophy, type LucideIcon } from "lucide-react";

import { CurriculumGrid, type ModuleSummary } from "@/components/CurriculumGrid";
import { SimulatorBanner } from "@/components/SimulatorBanner";
import { Badge } from "@/components/ui";
import { FUTURE_MODULES, MODULES } from "@/lib/modules";

const METHODOLOGY: readonly { icon: LucideIcon; step: string; title: string; text: string }[] = [
  {
    icon: BookOpen,
    step: "Fase 1",
    title: "Teoría condensada",
    text: "La intuición del CFO, las fórmulas clave, los errores típicos y un ejemplo resuelto paso a paso.",
  },
  {
    icon: Layers,
    step: "Fase 2",
    title: "Flashcards y quizzes",
    text: "Ocho tarjetas por módulo: conceptos para autoevaluar y ejercicios de cálculo con corrección inmediata.",
  },
  {
    icon: Target,
    step: "Fase 3",
    title: "Simulación de caso real",
    text: "Tres trimestres como CFO de una empresa: cada decisión mueve el flujo de caja, el WACC y el EVA.",
  },
  {
    icon: Trophy,
    step: "Evaluación final",
    title: "«Cashflow Corporativo»",
    text: "Simulador integrador de hasta 12 trimestres para lograr un EVA positivo sostenido con solvencia.",
  },
];

const BIBLIOGRAPHY = [
  "Brealey, Myers & Allen",
  "Ross, Westerfield & Jaffe",
  "Berk & DeMarzo",
  "Damodaran",
  "McKinsey (Koller, Goedhart & Wessels)",
];

const MODULE_SUMMARIES: ModuleSummary[] = MODULES.map((courseModule) => ({
  moduleId: courseModule.module_id,
  title: courseModule.title,
  subtitle: courseModule.subtitle,
  conceptCount: courseModule.phase_1_theory.concepts.length,
  cardCount: courseModule.phase_2_cards.length,
  companyName: courseModule.phase_3_brief.company_name,
}));

export default function Home() {
  return (
    <div className="space-y-12">
      <section aria-labelledby="hero-title">
        <Badge tone="emerald">Plataforma educativa de Finanzas Corporativas</Badge>
        <h1
          id="hero-title"
          className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl"
        >
          Aprender a decidir como un CFO: de la fórmula a la creación de valor
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-300">
          Tres módulos progresivos, cada uno en tres fases: teoría condensada, práctica con
          flashcards y quizzes, y la simulación de un caso real. El recorrido cierra con una
          evaluación final integradora, «Cashflow Corporativo».
        </p>

        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {METHODOLOGY.map(({ icon: Icon, step, title, text }) => (
            <li key={step} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-emerald-300">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-xs font-semibold tracking-wide text-emerald-300 uppercase">
                  {step}
                </span>
              </div>
              <h2 className="mt-4 text-base font-semibold text-white">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-slate-400">Bibliografía base:</span>
          {BIBLIOGRAPHY.map((source) => (
            <Badge key={source}>{source}</Badge>
          ))}
        </div>
      </section>

      <section aria-labelledby="curriculum-title">
        <div className="mb-6">
          <h2 id="curriculum-title" className="text-2xl font-semibold tracking-tight text-white">
            Mapa curricular
          </h2>
          <p className="mt-1.5 text-sm text-slate-400">
            Tres módulos disponibles y tres en el roadmap. El progreso se guarda en este navegador.
          </p>
        </div>
        <CurriculumGrid modules={MODULE_SUMMARIES} futureModules={FUTURE_MODULES} />
      </section>

      <SimulatorBanner />
    </div>
  );
}
