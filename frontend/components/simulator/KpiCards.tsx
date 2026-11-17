import type { ReactNode } from "react";

import {
  formatMultiple,
  formatPercent,
  formatPercentagePoints,
  formatSignedThousandsUsd,
  formatThousandsUsd,
} from "@/lib/format";
import type { CompanyState } from "@/lib/types";
import { cn } from "@/lib/utils";

// El motor usa 99.0 como cobertura cuando el trimestre no devengó intereses.
const NO_INTEREST_COVERAGE = 99;

function KpiCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{title}</p>
      {children}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <p className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={cn("font-semibold tabular-nums", tone ?? "text-slate-100")}>{value}</span>
    </p>
  );
}

const signTone = (value: number) => (value > 0 ? "text-emerald-300" : "text-rose-300");

export function KpiCards({ state }: { state: CompanyState }) {
  const kpis = state.valuation_and_risk_kpis;
  const spread = kpis.roic_annualized - kpis.wacc;
  const fcff = state.cash_flow_q.free_cash_flow_firm;
  const cash = state.balance_sheet.cash;
  const coverageTone =
    kpis.interest_coverage >= 3
      ? "text-emerald-300"
      : kpis.interest_coverage >= 1.5
        ? "text-amber-300"
        : "text-rose-300";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard title="ROIC vs. WACC">
        <p className={cn("mt-3 text-3xl font-semibold tracking-tight tabular-nums", signTone(spread))}>
          {formatPercentagePoints(spread)}
        </p>
        <p className="text-xs text-slate-500">Diferencial ROIC − WACC</p>
        <div className="mt-3 space-y-1">
          <Metric label="ROIC anualizado" value={formatPercent(kpis.roic_annualized)} />
          <Metric label="WACC" value={formatPercent(kpis.wacc)} />
        </div>
      </KpiCard>

      <KpiCard title="EVA anualizado ($k)">
        <p
          className={cn(
            "mt-3 text-3xl font-semibold tracking-tight tabular-nums",
            signTone(kpis.eva_annualized),
          )}
        >
          {formatSignedThousandsUsd(kpis.eva_annualized)}
        </p>
        <p className="text-xs text-slate-500">
          {kpis.eva_annualized > 0 ? "Crea valor económico" : "Destruye valor económico"}
        </p>
        <div className="mt-3 space-y-1">
          <Metric label="Capital invertido" value={formatThousandsUsd(kpis.invested_capital)} />
          <Metric label="Ke (CAPM)" value={formatPercent(kpis.ke)} />
        </div>
      </KpiCard>

      <KpiCard title="Caja ($k) y FCL ($k)">
        <p
          className={cn(
            "mt-3 text-3xl font-semibold tracking-tight tabular-nums",
            cash > 0 ? "text-white" : "text-rose-300",
          )}
        >
          {formatThousandsUsd(cash)}
        </p>
        <p className="text-xs text-slate-500">Caja al cierre del trimestre</p>
        <div className="mt-3 space-y-1">
          <Metric
            label="FCL del trimestre"
            value={formatSignedThousandsUsd(fcff)}
            tone={signTone(fcff)}
          />
          <Metric label="Deuda financiera" value={formatThousandsUsd(state.balance_sheet.total_debt)} />
        </div>
      </KpiCard>

      <KpiCard title="Cobertura de intereses (x)">
        <p className={cn("mt-3 text-3xl font-semibold tracking-tight tabular-nums", coverageTone)}>
          {kpis.interest_coverage >= NO_INTEREST_COVERAGE
            ? "Sin intereses"
            : formatMultiple(kpis.interest_coverage)}
        </p>
        <p className="text-xs text-slate-500">EBIT / intereses del trimestre</p>
        <div className="mt-3 space-y-1">
          <Metric
            label="Deuda neta / EBITDA"
            value={formatMultiple(kpis.net_debt_to_ebitda)}
            tone={kpis.net_debt_to_ebitda > 4 ? "text-rose-300" : undefined}
          />
          <Metric label="Kd antes de impuestos" value={formatPercent(kpis.kd_pre_tax)} />
        </div>
      </KpiCard>
    </div>
  );
}
