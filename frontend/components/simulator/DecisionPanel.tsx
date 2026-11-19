"use client";

import { Ban, LoaderCircle, Play, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { describeApiError, previewDividends } from "@/lib/api";
import {
  formatMultiple,
  formatPercent,
  formatSignedThousandsUsd,
  formatThousandsUsd,
} from "@/lib/format";
import type {
  CompanyState,
  DividendPreviewResponse,
  FinancingOption,
  ProjectCard,
} from "@/lib/types";
import { cn } from "@/lib/utils";

import { Badge, Panel, buttonStyles } from "../ui";
import { CATEGORY_LABELS, FINANCING_LABELS, FINANCING_ORDER } from "./labels";

const NO_PROJECT = "__none__";
const DIVIDEND_OPTIONS = [0, 25, 50] as const;
const CRITICAL_COVERAGE = 1.5;

interface FinancingChoice {
  option: FinancingOption;
  disabled: boolean;
}

/**
 * Opciones de financiamiento de una carta. En zona CCC el backend ya quita DEBT_100 de las
 * cartas de inversión; se vuelve a listar deshabilitada para explicar por qué no está.
 */
function financingChoices(card: ProjectCard, debt100Blocked: boolean): FinancingChoice[] {
  const allowed = new Set(card.financing_options);
  const isInvestment = card.category === "GROWTH_CAPEX" || card.category === "EFFICIENCY_CAPEX";
  return FINANCING_ORDER.filter(
    (option) => allowed.has(option) || (option === "DEBT_100" && debt100Blocked && isInvestment),
  ).map((option) => ({ option, disabled: option === "DEBT_100" && debt100Blocked }));
}

function nwcDetail(card: ProjectCard): string {
  if (card.nwc_required < 0) {
    return "Libera caja";
  }
  if (card.nwc_required === 0) {
    return "No requiere";
  }
  return card.nwc_recovered_at_end ? "Se recupera al final" : "No se recupera";
}

// Las cartas son botones: su contenido usa <span> porque un botón solo admite contenido de frase.
function CardMetric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <span className="block">
      <span className="block text-xs text-slate-500">{label}</span>
      <span className="mt-0.5 block text-sm font-semibold text-slate-100 tabular-nums">{value}</span>
      {detail !== undefined && <span className="block text-xs text-slate-500">{detail}</span>}
    </span>
  );
}

function ProjectOption({
  card,
  selected,
  disabled,
  onSelect,
}: {
  card: ProjectCard;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const isDebtRepayment = card.category === "DEBT_REPAYMENT";
  const npv = card.projected_npv;
  const negativeNpv = !isDebtRepayment && npv !== null && npv < 0;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        selected
          ? "border-emerald-400 bg-emerald-500/10"
          : "border-slate-700 bg-slate-900 hover:border-slate-500",
      )}
    >
      <span className="flex flex-wrap items-start justify-between gap-2">
        <span className="text-sm font-semibold text-white">{card.name}</span>
        <Badge>{CATEGORY_LABELS[card.category]}</Badge>
      </span>
      <span className="mt-1.5 block text-sm leading-relaxed text-slate-400">
        {card.description}
      </span>

      {isDebtRepayment ? (
        <span className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <CardMetric label="Deuda a cancelar" value={formatThousandsUsd(card.debt_repayment)} />
          <CardMetric
            label="Fondos"
            value={card.financing_options.map((option) => FINANCING_LABELS[option]).join(" · ")}
          />
        </span>
      ) : (
        <>
          <span className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <CardMetric label="Capex" value={formatThousandsUsd(card.capex)} />
            <CardMetric
              label="NWC requerido"
              value={formatThousandsUsd(card.nwc_required)}
              detail={nwcDetail(card)}
            />
            <CardMetric label="Duración" value={`${card.duration_quarters} trimestres`} />
            <CardMetric
              label="Boost EBITDA / trim."
              value={formatSignedThousandsUsd(card.ebitda_boost_q)}
            />
          </span>
          <span className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-800 pt-3 text-sm">
            <span className="tabular-nums">
              <span className="text-slate-400">VAN proyectado: </span>
              <span
                className={cn(
                  "font-semibold",
                  npv === null || npv === 0
                    ? "text-slate-200"
                    : npv > 0
                      ? "text-emerald-300"
                      : "text-rose-300",
                )}
              >
                {npv === null ? "—" : formatSignedThousandsUsd(npv)}
              </span>
            </span>
            <span className="tabular-nums">
              <span className="text-slate-400">TIR proyectada: </span>
              <span className="font-semibold text-slate-200">
                {card.projected_irr === null ? "No aplica" : formatPercent(card.projected_irr, 1)}
              </span>
            </span>
            {negativeNpv && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-200">
                <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
                VAN negativo al WACC vigente: destruye valor
              </span>
            )}
          </span>
        </>
      )}
    </button>
  );
}

export function DecisionPanel({
  quarter,
  offeredProjects,
  debt100Blocked,
  state,
  showDividendSelector,
  pending,
  error,
  onExecute,
}: {
  /** Trimestre que se va a ejecutar. */
  quarter: number;
  offeredProjects: readonly ProjectCard[];
  debt100Blocked: boolean;
  state: CompanyState;
  showDividendSelector: boolean;
  pending: boolean;
  error: string | null;
  onExecute: (
    projectId: string | null,
    financingOption: FinancingOption,
    dividends: number,
  ) => void;
}) {
  const [choice, setChoice] = useState<string | null>(null);
  const [financing, setFinancing] = useState<FinancingOption | null>(null);
  const [dividends, setDividends] = useState<number>(0);
  const [previewResult, setPreviewResult] = useState<{
    key: string;
    preview?: DividendPreviewResponse;
    error?: string;
  } | null>(null);

  const selectedCard = offeredProjects.find((card) => card.project_id === choice);
  const choices = selectedCard ? financingChoices(selectedCard, debt100Blocked) : [];
  const selectedProjectId = selectedCard?.project_id ?? null;
  const previewFinancing = selectedCard ? (financing ?? "CASH_100") : "CASH_100";
  const previewKey = [
    state.meta.scenario_id,
    state.meta.current_quarter,
    state.balance_sheet.cash,
    selectedProjectId ?? "",
    previewFinancing,
  ].join(":");

  useEffect(() => {
    if (!showDividendSelector || choice === null) {
      return;
    }

    let cancelled = false;
    previewDividends({
      state,
      selected_project_id: selectedProjectId,
      financing_option: previewFinancing,
    })
      .then((preview) => {
        if (!cancelled) {
          setPreviewResult({ key: previewKey, preview });
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setPreviewResult({ key: previewKey, error: describeApiError(cause) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [choice, previewFinancing, previewKey, selectedProjectId, showDividendSelector, state]);

  const currentPreviewResult = previewResult?.key === previewKey ? previewResult : null;
  const dividendPreview = currentPreviewResult?.preview ?? null;
  const previewError = currentPreviewResult?.error ?? null;
  const previewLoading =
    showDividendSelector && choice !== null && currentPreviewResult === null;

  const selectedDividendUnavailable =
    dividends > 0 &&
    (previewLoading ||
      dividendPreview === null ||
      dividendPreview.projected_cash_before_dividends < dividends ||
      dividendPreview.projected_interest_coverage < CRITICAL_COVERAGE);
  const canExecute =
    !pending &&
    !selectedDividendUnavailable &&
    (choice === NO_PROJECT || (selectedCard !== undefined && financing !== null));

  function selectProject(card: ProjectCard) {
    setChoice(card.project_id);
    setDividends(0);
    const firstEnabled = financingChoices(card, debt100Blocked).find((item) => !item.disabled);
    setFinancing(firstEnabled?.option ?? null);
  }

  function execute() {
    if (choice === NO_PROJECT) {
      onExecute(null, "CASH_100", dividends);
    } else if (selectedCard !== undefined && financing !== null) {
      onExecute(selectedCard.project_id, financing, dividends);
    }
  }

  return (
    <Panel>
      <p className="text-xs font-semibold tracking-wide text-emerald-300 uppercase">
        Decisión del trimestre Q{quarter}
      </p>
      <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-white">
        Cartera de proyectos en evaluación
      </h3>
      <p className="mt-1 text-sm text-slate-400">
        El VAN y la TIR de cada carta están calculados al WACC vigente de la empresa.
      </p>

      <div role="radiogroup" aria-label="Proyecto a aprobar" className="mt-5 space-y-3">
        {offeredProjects.map((card) => (
          <ProjectOption
            key={card.project_id}
            card={card}
            selected={choice === card.project_id}
            disabled={pending}
            onSelect={() => selectProject(card)}
          />
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={choice === NO_PROJECT}
          disabled={pending}
          onClick={() => {
            setChoice(NO_PROJECT);
            setFinancing(null);
            setDividends(0);
          }}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60",
            choice === NO_PROJECT
              ? "border-emerald-400 bg-emerald-500/10 text-white"
              : "border-dashed border-slate-700 text-slate-300 hover:border-slate-500",
          )}
        >
          <Ban className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <span>
            <span className="block font-semibold">No aprobar proyectos este trimestre</span>
            <span className="block text-xs text-slate-500">
              Se cierra el trimestre solo con la operación en curso.
            </span>
          </span>
        </button>
      </div>

      {selectedCard !== undefined && (
        <div className="mt-5">
          <p className="text-sm font-medium text-slate-200">Financiamiento</p>
          <div
            role="radiogroup"
            aria-label="Opción de financiamiento"
            className="mt-2 flex flex-wrap gap-2"
          >
            {choices.map(({ option, disabled }) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={financing === option}
                disabled={disabled || pending}
                onClick={() => setFinancing(option)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed",
                  financing === option
                    ? "border-emerald-400 bg-emerald-500/10 text-white"
                    : "border-slate-700 text-slate-300 hover:border-slate-500",
                  disabled && "border-slate-800 text-slate-600 line-through hover:border-slate-800",
                )}
              >
                {FINANCING_LABELS[option]}
              </button>
            ))}
          </div>
          {choices.some((item) => item.disabled) && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-300">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              «100% deuda» está bloqueado: la cobertura de intereses es menor a 1,5x (zona CCC).
            </p>
          )}
        </div>
      )}

      {showDividendSelector && choice !== null && (
        <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <p className="text-sm font-medium text-slate-200">Dividendos trimestrales</p>
          <p className="mt-1 text-xs text-slate-500">
            Se validan contra la caja proyectada y la cobertura del trimestre, calculadas por el
            motor financiero.
          </p>
          <div
            role="radiogroup"
            aria-label="Dividendos trimestrales"
            className="mt-3 flex flex-wrap gap-2"
          >
            {DIVIDEND_OPTIONS.map((amount) => {
              const disabled =
                amount > 0 &&
                (previewLoading ||
                  dividendPreview === null ||
                  previewError !== null ||
                  dividendPreview.projected_cash_before_dividends < amount ||
                  dividendPreview.projected_interest_coverage < CRITICAL_COVERAGE);
              return (
                <button
                  key={amount}
                  type="button"
                  role="radio"
                  aria-checked={dividends === amount}
                  disabled={disabled || pending}
                  onClick={() => setDividends(amount)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    dividends === amount
                      ? "border-emerald-400 bg-emerald-500/10 text-white"
                      : "border-slate-700 text-slate-300 hover:border-slate-500",
                  )}
                >
                  {amount === 0 ? "$0k" : `$${amount}k`}
                </button>
              );
            })}
          </div>
          {previewLoading ? (
            <p className="mt-2 text-xs text-slate-500">Calculando caja y cobertura proyectadas…</p>
          ) : previewError !== null ? (
            <p role="alert" className="mt-2 text-xs text-rose-300">
              No se pudo proyectar la decisión: {previewError}
            </p>
          ) : dividendPreview !== null ? (
            <p className="mt-2 text-xs text-slate-500 tabular-nums">
              Caja proyectada: {formatThousandsUsd(dividendPreview.projected_cash_before_dividends)}
              {" · "}Cobertura proyectada:{" "}
              {formatMultiple(dividendPreview.projected_interest_coverage)}
              {dividendPreview.projected_interest_coverage < CRITICAL_COVERAGE
                ? " · Dividendos bloqueados por cobertura crítica"
                : ""}
            </p>
          ) : null}
        </div>
      )}

      {(error !== null || previewError !== null) && (
        <p
          role="alert"
          className="mt-5 flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-sm text-rose-100"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" aria-hidden />
          <span>
            {error ?? previewError} La partida no se modificó: se puede corregir la decisión y
            volver a ejecutar.
          </span>
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={execute}
          disabled={!canExecute}
          aria-busy={pending}
          className={buttonStyles.primary}
        >
          {pending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Play className="h-4 w-4" aria-hidden />
          )}
          {pending ? "Ejecutando trimestre…" : "Ejecutar Trimestre"}
        </button>
        <p className="text-xs text-slate-500" aria-live="polite">
          {pending
            ? "El motor cierra el trimestre y el Directorio evalúa la decisión…"
            : choice === null
              ? "Elegir una carta o la opción de no aprobar proyectos."
              : null}
        </p>
      </div>
    </Panel>
  );
}
