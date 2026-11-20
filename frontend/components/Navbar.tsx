"use client";

import { Landmark, Lock, RotateCcw } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { isSimulatorUnlocked, resetProgress, setDemoMode, useAppState } from "@/lib/storage";
import { cn } from "@/lib/utils";

const NAV_LINK =
  "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors";

export function Navbar() {
  const state = useAppState();
  const pathname = usePathname();
  const [confirmingReset, setConfirmingReset] = useState(false);

  const simulatorUnlocked = isSimulatorUnlocked(state);
  const onCurriculum =
    pathname === "/curriculum" || pathname.startsWith("/modules");
  const onSimulator = pathname.startsWith("/simulator");

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400 text-slate-950">
            <Landmark className="h-5 w-5" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight text-white">
              Finanzas Corporativas
            </span>
            <span className="block text-xs text-slate-400">Simulador CFO</span>
          </span>
        </Link>

        <nav aria-label="Principal" className="flex items-center gap-1">
          <Link
            href="/curriculum"
            aria-current={onCurriculum ? "page" : undefined}
            className={cn(
              NAV_LINK,
              onCurriculum ? "bg-slate-800 text-white" : "text-slate-300 hover:text-white",
            )}
          >
            Mapa Curricular
          </Link>
          {simulatorUnlocked ? (
            <Link
              href="/simulator"
              aria-current={onSimulator ? "page" : undefined}
              className={cn(
                NAV_LINK,
                onSimulator ? "bg-slate-800 text-white" : "text-slate-300 hover:text-white",
              )}
            >
              Simulador Final
            </Link>
          ) : (
            <span
              aria-disabled="true"
              title="Se habilita al completar los 6 módulos o al activar el Modo Docente / Demo"
              className={cn(NAV_LINK, "cursor-not-allowed text-slate-500")}
            >
              <Lock className="h-3.5 w-3.5" aria-hidden />
              Simulador Final
            </span>
          )}
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-300">
            <span>Modo Docente / Demo</span>
            <button
              type="button"
              role="switch"
              aria-checked={state.demoMode}
              onClick={() => setDemoMode(!state.demoMode)}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                state.demoMode ? "bg-emerald-400" : "bg-slate-700",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  state.demoMode && "translate-x-5",
                )}
              />
            </button>
          </label>

          {confirmingReset ? (
            <span className="flex items-center gap-2 text-xs">
              <span className="text-slate-300">¿Borrar todo el progreso?</span>
              <button
                type="button"
                onClick={() => {
                  resetProgress();
                  setConfirmingReset(false);
                }}
                className="rounded-md bg-rose-500 px-2.5 py-1.5 font-semibold text-white hover:bg-rose-400"
              >
                Borrar
              </button>
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="rounded-md px-2.5 py-1.5 font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingReset(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reiniciar progreso
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
