"use client";

import { ArrowRight, Lock, Trophy } from "lucide-react";
import Link from "next/link";

import {
  MODULE_IDS,
  isModuleCompleted,
  isSimulatorUnlocked,
  useAppState,
} from "@/lib/storage";

import { Badge, buttonStyles } from "./ui";

export function SimulatorBanner() {
  const state = useAppState();
  const unlocked = isSimulatorUnlocked(state);
  const completedModules = MODULE_IDS.filter((moduleId) =>
    isModuleCompleted(state.modules[moduleId]),
  ).length;

  return (
    <section
      aria-labelledby="simulator-banner-title"
      className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 via-slate-900 to-slate-900 p-6 sm:p-8"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <Badge tone="emerald">
            <Trophy className="h-3 w-3" aria-hidden />
            Evaluación final integradora
          </Badge>
          <h2
            id="simulator-banner-title"
            className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl"
          >
            Simulador Integrador Final: «Cashflow Corporativo»
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
            Hasta 12 trimestres al mando de las finanzas de Andes Tech S.A. El objetivo es sacar a
            la empresa de la «carrera de la rata operativa»: sostener un EVA positivo durante 3
            trimestres consecutivos, con caja positiva y cobertura de intereses superior a 2,5x.
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
          {unlocked ? (
            <Link href="/simulator" className={buttonStyles.primary}>
              Ir al simulador final
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-400"
            >
              <Lock className="h-4 w-4" aria-hidden />
              Bloqueado
            </span>
          )}
          <p className="text-xs text-slate-400 tabular-nums lg:text-right">
            {state.demoMode
              ? "Habilitado por el Modo Docente / Demo"
              : `${completedModules} de ${MODULE_IDS.length} módulos completos`}
            {!unlocked && (
              <span className="block">
                Se habilita al completar los 3 módulos o con el Modo Docente / Demo.
              </span>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
