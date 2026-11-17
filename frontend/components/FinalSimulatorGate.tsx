"use client";

import { Lock } from "lucide-react";
import Link from "next/link";

import { isSimulatorUnlocked, useAppState, useHydrated } from "@/lib/storage";
import { cn } from "@/lib/utils";

import { CFOSimulator } from "./simulator/CFOSimulator";
import { Panel, buttonStyles } from "./ui";

/** Simulador final: se habilita con los 3 módulos completos o con el Modo Docente / Demo. */
export function FinalSimulatorGate() {
  const state = useAppState();
  const hydrated = useHydrated();

  if (!hydrated) {
    return <div aria-busy="true" className="h-64 animate-pulse rounded-2xl bg-slate-900" />;
  }

  if (!isSimulatorUnlocked(state)) {
    return (
      <Panel className="text-center">
        <Lock className="mx-auto h-8 w-8 text-slate-500" aria-hidden />
        <h2 className="mt-4 text-lg font-semibold text-white">Simulador final bloqueado</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
          Se habilita al completar los 3 módulos (teoría, práctica y simulación ganada), o al
          activar el Modo Docente / Demo en la barra superior.
        </p>
        <Link href="/" className={cn(buttonStyles.secondary, "mt-5")}>
          Volver al Mapa Curricular
        </Link>
      </Panel>
    );
  }

  return <CFOSimulator scenarioId="final_game" />;
}
