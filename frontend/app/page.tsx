import {
  ArrowRight, BarChart3, BookOpen, BriefcaseBusiness, Building2, GraduationCap,
  Layers, Lightbulb, ShieldCheck, Sparkles, Target, Trophy, Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { Badge, Panel, buttonStyles } from "@/components/ui";

const BENEFITS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: BookOpen,
    title: "Rigor bibliográfico estándar",
    text: "Fundamentos de Brealey-Myers, Ross-Westerfield, Berk-DeMarzo, Damodaran y McKinsey (Valuation).",
  },
  {
    icon: ShieldCheck,
    title: "Arquitectura determinista + IA",
    text: "Python calcula FCL, Hamada, rating sintético, WACC, ROIC y EVA con rigor contable. Gemini acompaña como Directorio evaluador y tutor socrático, con orientación por reglas si no está disponible.",
  },
  {
    icon: BarChart3,
    title: "Analítica y trazabilidad",
    text: "Explora el waterfall de FCL y la evolución de ROIC vs. WACC; exporta el historial de las partidas en CSV.",
  },
  {
    icon: Target,
    title: "Logro y maestría",
    text: "Domina las palancas reales de creación de valor y aprende a sacar a la empresa de la carrera de la rata operativa.",
  },
  {
    icon: Sparkles,
    title: "Reconocimiento y referencia estratégica",
    text: "Gana confianza para defender inversiones de Capex, estructura de deuda y dividendos ante un Directorio, socios de PyME o una familia empresaria.",
  },
];

const PHASES: { icon: LucideIcon; step: string; title: string; text: string }[] = [
  { icon: BookOpen, step: "01", title: "Teoría", text: "Conceptos y fórmulas en LaTeX para entender las decisiones del CFO." },
  { icon: Layers, step: "02", title: "Práctica", text: "48 tarjetas interactivas: flashcards y ejercicios de cálculo en seis módulos." },
  { icon: BriefcaseBusiness, step: "03", title: "Casos CFO con IA", text: "Decide durante tres trimestres y recibe feedback ejecutivo con IA." },
  { icon: Trophy, step: "Final", title: "Cashflow Corporativo", text: "Integra lo aprendido en un simulador de hasta 12 trimestres." },
];

const AUDIENCES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: GraduationCap,
    title: "Estudiantes y analistas",
    text: "Para estudiantes de grado, posgrado y MBA, y analistas de datos: pasa de fórmulas aisladas a decisiones integradas con datos financieros.",
  },
  {
    icon: Users,
    title: "Capacitación corporativa",
    text: "Equipos de Finanzas y gerentes no financieros entrenan para alinear Operaciones, Comercial y Finanzas con el ROIC y el EVA.",
  },
  {
    icon: Building2,
    title: "PyMEs y empresas familiares",
    text: "Profesionaliza la gestión de liquidez, capital de trabajo y crecimiento rentable.",
  },
];

export default function Home() {
  return (
    <div className="space-y-20 pb-8">
      <section aria-labelledby="hero-title" className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/15 via-slate-900 to-slate-950 px-6 py-10 sm:px-10 sm:py-16">
        <div className="relative max-w-4xl">
          <Badge tone="emerald">Entrenamiento ejecutivo en finanzas corporativas</Badge>
          <h1 id="hero-title" className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Conviértete en el referente financiero que define las decisiones estratégicas
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-300">
            Lidera la creación de valor en una corporación, PyME o empresa familiar. Combina una
            simulación CFO determinista con inteligencia artificial: Python calcula y la IA
            acompaña e interpreta, sin delegarle las matemáticas.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/curriculum" className={buttonStyles.primary}>
              Ingresar a la Plataforma <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/simulator" className={buttonStyles.secondary}>Explorar Simulador Final</Link>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            El simulador final se habilita al completar los seis módulos o con el Modo Docente / Demo.
          </p>
        </div>
      </section>

      <section aria-labelledby="value-title">
        <Badge tone="emerald">Propuesta de valor</Badge>
        <h2 id="value-title" className="mt-3 text-3xl font-semibold tracking-tight text-white">Rigor para decidir. Confianza para liderar.</h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-slate-400">Aprendizaje aplicable que une fundamentos, decisiones y desarrollo profesional.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <Panel key={title}>
              <Icon className="h-6 w-6 text-emerald-300" aria-hidden />
              <h3 className="mt-4 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
            </Panel>
          ))}
        </div>
      </section>

      <section aria-labelledby="method-title">
        <Badge tone="sky">Metodología</Badge>
        <h2 id="method-title" className="mt-3 text-3xl font-semibold tracking-tight text-white">Seis módulos, tres fases, una visión integrada</h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-slate-400">
          De la teoría a las decisiones de negocio, con el Tutor CFO IA disponible durante todo el recorrido.
        </p>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PHASES.map(({ icon: Icon, step, title, text }) => (
            <li key={step} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between text-emerald-300">
                <Icon className="h-6 w-6" aria-hidden />
                <span className="text-xs font-semibold uppercase">{step}</span>
              </div>
              <h3 className="mt-4 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="audience-title">
        <Badge tone="sky">Para personas y organizaciones</Badge>
        <h2 id="audience-title" className="mt-3 text-3xl font-semibold tracking-tight text-white">Finanzas que conectan equipos y decisiones</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {AUDIENCES.map(({ icon: Icon, title, text }) => (
            <Panel key={title}>
              <Icon className="h-6 w-6 text-sky-300" aria-hidden />
              <h3 className="mt-4 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
            </Panel>
          ))}
        </div>
      </section>

      <section aria-labelledby="roadmap-title">
        <Badge tone="amber">Visión de escalabilidad</Badge>
        <h2 id="roadmap-title" className="mt-3 text-3xl font-semibold tracking-tight text-white">El futuro del aprendizaje financiero</h2>
        <p className="mt-3 text-slate-400">Una visión de evolución, todavía no disponible en la plataforma.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Panel>
            <Badge tone="amber">Próximamente</Badge>
            <h3 className="mt-4 text-lg font-semibold text-white">Cuentas multi-rol y certificación</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Acceso persistente en la nube para Administrador, Educador / Capacitador y Alumno / Colaborador,
              con un certificado verificable al completar el recorrido como credencial profesional.
            </p>
          </Panel>
          <Panel>
            <Badge tone="amber">Próximamente</Badge>
            <h3 className="mt-4 text-lg font-semibold text-white">Track II · Finanzas avanzadas y Web3</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Productos derivados y cobertura; finanzas descentralizadas (DeFi) y criptoactivos;
              tokenización de activos (RWA) y securitización estructurada.
            </p>
          </Panel>
        </div>
        <p className="mt-6 flex items-start gap-2 text-sm text-slate-400">
          <Lightbulb className="h-5 w-5 shrink-0 text-amber-300" aria-hidden />
          El recorrido actual conserva su progreso en este navegador.
        </p>
      </section>
    </div>
  );
}
