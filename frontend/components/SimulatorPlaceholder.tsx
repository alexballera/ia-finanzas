"use client";

import { Lock, Radio } from "lucide-react";
import Link from "next/link";

import { isSimulatorUnlocked, useAppState, useHydrated } from "@/lib/storage";
import { cn } from "@/lib/utils";

import { Badge, Panel, buttonStyles } from "./ui";

/** Contenedor temporal del simulador final: el juego en vivo se integra en el Sprint 3B. */
export function SimulatorPlaceholder() {
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
          Se habilita al completar los 3 módulos, o al activar el Modo Docente / Demo en la barra
          superior.
        </p>
        <Link href="/" className={cn(buttonStyles.secondary, "mt-5")}>
          Volver al Mapa Curricular
        </Link>
      </Panel>
    );
  }

  return (
    <Panel>
      <Badge tone="sky">Andes Tech S.A.</Badge>
      <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">
        Hasta 12 trimestres como CFO
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
        Objetivo: lograr 3 trimestres consecutivos de EVA positivo con caja positiva y cobertura de
        intereses superior a 2,5x.
      </p>
      <div
        role="status"
        className="mt-6 flex items-start gap-3 rounded-xl border border-dashed border-sky-500/40 bg-sky-500/10 p-4"
      >
        <Radio className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" aria-hidden />
        <p className="text-sm font-semibold text-sky-100">
          Simulador CFO en vivo — Se integra en Sprint 3B
        </p>
      </div>
    </Panel>
  );
}
