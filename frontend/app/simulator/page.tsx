import type { Metadata } from "next";

import { SimulatorPlaceholder } from "@/components/SimulatorPlaceholder";

export const metadata: Metadata = {
  title: "Simulador Final: Cashflow Corporativo",
};

export default function SimulatorPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Simulador Integrador Final: «Cashflow Corporativo»
        </h1>
        <p className="mt-2 max-w-3xl text-base text-slate-400">
          La evaluación final del recorrido: sacar a la empresa de la «carrera de la rata
          operativa».
        </p>
      </header>
      <SimulatorPlaceholder />
    </div>
  );
}
