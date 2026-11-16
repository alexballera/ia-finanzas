import { Building2, Radio, Target, UserRound } from "lucide-react";

import type { Phase3Brief } from "@/lib/types";

import { Badge, Panel } from "./ui";

/** Contenedor temporal de la Fase 3: el simulador en vivo se integra en el Sprint 3B. */
export function Phase3Placeholder({ brief }: { brief: Phase3Brief }) {
  return (
    <Panel>
      <Badge tone="sky">Caso de simulación</Badge>
      <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">{brief.case_title}</h2>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-3">
          <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
          <div>
            <dt className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Empresa</dt>
            <dd className="mt-0.5 text-sm font-medium text-white">{brief.company_name}</dd>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
          <div>
            <dt className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Rol</dt>
            <dd className="mt-0.5 text-sm font-medium text-white">{brief.your_role}</dd>
          </div>
        </div>
        <div className="flex items-start gap-3 sm:col-span-2">
          <Target className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
          <div>
            <dt className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
              Objetivo de la misión
            </dt>
            <dd className="mt-0.5 text-sm leading-relaxed text-slate-200">
              {brief.mission_objective}
            </dd>
          </div>
        </div>
      </dl>

      <div
        role="status"
        className="mt-6 flex items-start gap-3 rounded-xl border border-dashed border-sky-500/40 bg-sky-500/10 p-4"
      >
        <Radio className="mt-0.5 h-5 w-5 shrink-0 text-sky-300" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-sky-100">
            Simulador CFO en vivo — Se integra en Sprint 3B
          </p>
          <p className="mt-1 text-sm text-sky-100/80">
            Aquí se jugarán los 3 trimestres del caso, con el motor financiero del backend y el
            feedback del Directorio.
          </p>
        </div>
      </div>
    </Panel>
  );
}
