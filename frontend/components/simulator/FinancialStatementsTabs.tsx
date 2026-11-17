"use client";

import { CircleCheck, CircleX } from "lucide-react";
import { useState } from "react";

import {
  formatPercent,
  formatSignedThousandsUsd,
  formatThousandsUsd,
} from "@/lib/format";
import type { ActiveProject, BalanceSheet, CompanyState, IncomeStatementQ } from "@/lib/types";
import { cn } from "@/lib/utils";

import { Panel } from "../ui";
import { CATEGORY_LABELS, FINANCING_LABELS } from "./labels";

type TabId = "income" | "balance" | "projects";

const TABS: readonly { id: TabId; label: string }[] = [
  { id: "income", label: "Estado de Resultados Trimestral" },
  { id: "balance", label: "Balance General" },
  { id: "projects", label: "Proyectos Activos" },
];

// Misma tolerancia de presentación que el invariante del motor, llevada a centavos de $k.
const BALANCE_TOLERANCE = 0.01;

interface StatementRow {
  label: string;
  value: number;
  /** Las partidas que restan se muestran entre paréntesis. */
  subtract?: boolean;
  emphasis?: boolean;
}

function StatementTable({ caption, rows }: { caption: string; rows: readonly StatementRow[] }) {
  return (
    <table className="w-full text-sm">
      <caption className="pb-2 text-left text-xs font-semibold tracking-wide text-slate-400 uppercase">
        {caption}
      </caption>
      <tbody className="divide-y divide-slate-800/70">
        {rows.map((row) => (
          <tr key={row.label}>
            <th
              scope="row"
              className={cn(
                "py-2 pr-4 text-left font-normal",
                row.emphasis ? "font-semibold text-white" : "text-slate-300",
              )}
            >
              {row.label}
            </th>
            <td
              className={cn(
                "py-2 text-right tabular-nums",
                row.emphasis ? "font-semibold text-white" : "text-slate-200",
                row.emphasis && row.value < 0 && "text-rose-300",
              )}
            >
              {row.subtract
                ? `(${formatThousandsUsd(row.value)})`
                : formatThousandsUsd(row.value)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IncomeStatement({ income }: { income: IncomeStatementQ }) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <StatementTable
        caption="Resultado operativo (base del FCL)"
        rows={[
          { label: "Ingresos", value: income.revenue },
          { label: "Costo de ventas (COGS)", value: income.cogs, subtract: true },
          { label: "Gastos operativos (Opex)", value: income.opex, subtract: true },
          { label: "EBITDA", value: income.ebitda, emphasis: true },
          { label: "Depreciación y amortización", value: income.depreciation, subtract: true },
          { label: "EBIT", value: income.ebit, emphasis: true },
          { label: "Impuestos operativos", value: income.operating_taxes, subtract: true },
          { label: "NOPAT", value: income.nopat, emphasis: true },
        ]}
      />
      <StatementTable
        caption="Resultado contable (después de intereses)"
        rows={[
          { label: "EBIT", value: income.ebit },
          { label: "Intereses", value: income.interest_expense, subtract: true },
          { label: "Resultado antes de impuestos (EBT)", value: income.ebt, emphasis: true },
          { label: "Impuesto a las ganancias", value: income.actual_taxes, subtract: true },
          { label: "Resultado neto", value: income.net_income, emphasis: true },
        ]}
      />
    </div>
  );
}

function Balance({ balance }: { balance: BalanceSheet }) {
  const gap = balance.total_assets - balance.total_debt_and_equity;
  const balanced = Math.abs(gap) < BALANCE_TOLERANCE;

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-2">
        <StatementTable
          caption="Activos"
          rows={[
            { label: "Caja", value: balance.cash },
            { label: "Capital de trabajo neto (NWC)", value: balance.working_capital_nwc },
            { label: "Activos fijos netos", value: balance.net_fixed_assets },
            { label: "Total activos", value: balance.total_assets, emphasis: true },
          ]}
        />
        <StatementTable
          caption="Deuda y patrimonio neto"
          rows={[
            { label: "Deuda financiera", value: balance.total_debt },
            { label: "Patrimonio neto (PN)", value: balance.shareholders_equity },
            { label: "Total deuda + PN", value: balance.total_debt_and_equity, emphasis: true },
          ]}
        />
      </div>
      <p
        className={cn(
          "mt-5 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium tabular-nums",
          balanced
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
            : "border-rose-500/40 bg-rose-500/10 text-rose-200",
        )}
      >
        {balanced ? (
          <CircleCheck className="h-4 w-4" aria-hidden />
        ) : (
          <CircleX className="h-4 w-4" aria-hidden />
        )}
        {balanced
          ? `Control: Activos = Deuda + PN (${formatThousandsUsd(balance.total_assets)})`
          : `Descuadre: Activos − (Deuda + PN) = ${formatSignedThousandsUsd(gap)}`}
      </p>
    </>
  );
}

function Projects({ projects }: { projects: readonly ActiveProject[] }) {
  if (projects.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-800 px-6 py-10 text-center text-sm text-slate-500">
        Todavía no hay proyectos en ejecución.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-left text-xs tracking-wide text-slate-400 uppercase">
            <th scope="col" className="py-2 pr-4 font-semibold">
              Proyecto
            </th>
            <th scope="col" className="py-2 pr-4 text-right font-semibold">
              Trimestres restantes
            </th>
            <th scope="col" className="py-2 pr-4 text-right font-semibold">
              Boost EBITDA / trim.
            </th>
            <th scope="col" className="py-2 pr-4 text-right font-semibold">
              Depreciación / trim.
            </th>
            <th scope="col" className="py-2 pr-4 text-right font-semibold">
              VAN al aprobar
            </th>
            <th scope="col" className="py-2 text-right font-semibold">
              TIR al aprobar
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {projects.map((project) => (
            <tr key={project.project_id}>
              <th scope="row" className="py-2.5 pr-4 text-left font-normal">
                <span className="block font-medium text-white">{project.name}</span>
                <span className="block text-xs text-slate-500">
                  {CATEGORY_LABELS[project.category]} · {FINANCING_LABELS[project.financing_option]}{" "}
                  · desde Q{project.start_quarter}
                </span>
              </th>
              <td className="py-2.5 pr-4 text-right text-slate-200 tabular-nums">
                {project.remaining_quarters} de {project.duration_quarters}
              </td>
              <td
                className={cn(
                  "py-2.5 pr-4 text-right tabular-nums",
                  project.ebitda_boost_q < 0 ? "text-rose-300" : "text-emerald-300",
                )}
              >
                {formatSignedThousandsUsd(project.ebitda_boost_q)}
              </td>
              <td className="py-2.5 pr-4 text-right text-slate-200 tabular-nums">
                {formatThousandsUsd(project.depreciation_q)}
              </td>
              <td
                className={cn(
                  "py-2.5 pr-4 text-right tabular-nums",
                  project.projected_npv_at_approval < 0 ? "text-rose-300" : "text-slate-200",
                )}
              >
                {formatSignedThousandsUsd(project.projected_npv_at_approval)}
              </td>
              <td className="py-2.5 text-right text-slate-200 tabular-nums">
                {project.projected_irr_at_approval === null
                  ? "—"
                  : formatPercent(project.projected_irr_at_approval, 1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FinancialStatementsTabs({ state }: { state: CompanyState }) {
  const [activeTab, setActiveTab] = useState<TabId>("income");

  return (
    <Panel>
      <div role="tablist" aria-label="Estados financieros" className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`statements-tab-${tab.id}`}
              aria-selected={active}
              aria-controls="statements-panel"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-white",
              )}
            >
              {tab.label}
              {tab.id === "projects" && (
                <span className="ml-1.5 text-xs text-slate-500 tabular-nums">
                  ({state.active_projects.length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        id="statements-panel"
        role="tabpanel"
        aria-labelledby={`statements-tab-${activeTab}`}
        className="mt-5"
      >
        {activeTab === "income" && <IncomeStatement income={state.income_statement_q} />}
        {activeTab === "balance" && <Balance balance={state.balance_sheet} />}
        {activeTab === "projects" && <Projects projects={state.active_projects} />}
      </div>
    </Panel>
  );
}
