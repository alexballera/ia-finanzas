"use client";

import {
  ArrowRight,
  CloudLightning,
  Download,
  Info,
  LoaderCircle,
  OctagonAlert,
  RotateCcw,
  Telescope,
  TriangleAlert,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { describeApiError, initSimulation, stepSimulation } from "@/lib/api";
import { exportHistoryToCsv } from "@/lib/csvExport";
import {
  clearSimulation,
  isSimulatorUnlocked,
  saveSimulation,
  useAppState,
  useHydrated,
} from "@/lib/storage";
import type {
  Alert,
  AlertSeverity,
  FinancingOption,
  ModuleId,
  ScenarioId,
  SimulationStepResponse,
} from "@/lib/types";
import { cn } from "@/lib/utils";

import { Badge, Panel, buttonStyles } from "../ui";
import { usePublishTutorContext } from "../TutorContextProvider";
import { AIFeedbackCard } from "./AIFeedbackCard";
import { DecisionPanel } from "./DecisionPanel";
import { FclWaterfallChart } from "./FclWaterfallChart";
import { FinancialStatementsTabs } from "./FinancialStatementsTabs";
import { KpiCards } from "./KpiCards";
import { RoicWaccChart } from "./RoicWaccChart";
import { END_REASON_TEXT, RATING_TONES } from "./labels";

const EVA_STREAK_TARGET = 3;

const ALERT_STYLES: Record<AlertSeverity, { box: string; icon: typeof Info; iconClass: string }> = {
  INFO: { box: "border-sky-500/30 bg-sky-500/10 text-sky-100", icon: Info, iconClass: "text-sky-300" },
  WARNING: {
    box: "border-amber-500/40 bg-amber-500/10 text-amber-100",
    icon: TriangleAlert,
    iconClass: "text-amber-300",
  },
  CRITICAL: {
    box: "border-rose-500/40 bg-rose-500/10 text-rose-100",
    icon: OctagonAlert,
    iconClass: "text-rose-300",
  },
};

// El shock aplicado y el cierre de la partida tienen su propia tarjeta: no se repiten como alerta.
const ALERT_CODES_SHOWN_ELSEWHERE = new Set(["MACRO_SHOCK", "GOAL_ACHIEVED", "OBJECTIVE_NOT_MET"]);

interface CFOSimulatorProps {
  scenarioId: ScenarioId;
  /** Módulo al que pertenece el caso; sin valor en el simulador final. */
  moduleId?: ModuleId;
  moduleTitle?: string;
  /** Se invoca cuando un turno deja ganada la simulación del módulo. */
  onModuleWon?: () => void;
}

export function CFOSimulator({ scenarioId, moduleId, moduleTitle, onModuleWon }: CFOSimulatorProps) {
  const appState = useAppState();
  const hydrated = useHydrated();
  const saved = appState.simulations[scenarioId];
  const hasSaved = saved !== undefined;
  const tutorState = saved?.response.state;
  const tutorContext = useMemo(() => {
    const kpis = tutorState?.valuation_and_risk_kpis;
    return {
      phase: moduleId === undefined ? undefined : (3 as const),
      module_id: moduleId,
      module_title: moduleTitle,
      simulation_snapshot: tutorState && kpis ? {
        scenario_id: scenarioId,
        current_quarter: tutorState.meta.current_quarter,
        wacc: kpis.wacc,
        roic_annualized: kpis.roic_annualized,
        eva_annualized: kpis.eva_annualized,
        cash: tutorState.balance_sheet.cash,
        interest_coverage: kpis.interest_coverage,
        credit_rating: kpis.credit_rating,
      } : undefined,
    };
  }, [moduleId, moduleTitle, scenarioId, tutorState]);
  usePublishTutorContext(tutorContext);

  const [initError, setInitError] = useState<string | null>(null);
  const [initAttempt, setInitAttempt] = useState(0);
  const [pending, setPending] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  // Sin partida guardada (primera visita o reinicio) se pide al backend el estado de apertura.
  useEffect(() => {
    if (!hydrated || hasSaved) {
      return;
    }
    let cancelled = false;
    initSimulation(scenarioId)
      .then((response) => {
        if (!cancelled) {
          saveSimulation(response);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setInitError(describeApiError(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, hasSaved, scenarioId, initAttempt]);

  if (!hasSaved) {
    if (initError !== null) {
      return (
        <Panel className="text-center">
          <OctagonAlert className="mx-auto h-8 w-8 text-rose-300" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold text-white">
            No se pudo iniciar la simulación
          </h2>
          <p role="alert" className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            {initError}
          </p>
          <button
            type="button"
            className={cn(buttonStyles.primary, "mt-5")}
            onClick={() => {
              setInitError(null);
              setInitAttempt((attempt) => attempt + 1);
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reintentar
          </button>
        </Panel>
      );
    }
    return (
      <div aria-busy="true" className="space-y-4">
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          Preparando la simulación…
        </p>
        <div className="h-40 animate-pulse rounded-2xl bg-slate-900" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-900" />
      </div>
    );
  }

  const response = saved.response;

  async function executeQuarter(
    projectId: string | null,
    financingOption: FinancingOption,
    dividends: number,
  ) {
    setPending(true);
    setStepError(null);
    try {
      const next = await stepSimulation({
        state: response.state,
        selected_project_id: projectId,
        financing_option: financingOption,
        dividends,
      });
      saveSimulation(next);
      if (moduleId !== undefined && next.state.meta.game_status === "WON") {
        onModuleWon?.();
      }
    } catch (error) {
      // La partida guardada no se toca: el error solo se informa.
      setStepError(describeApiError(error));
    } finally {
      setPending(false);
    }
  }

  function restart() {
    setStepError(null);
    setInitError(null);
    clearSimulation(scenarioId);
  }

  return (
    <Cockpit
      response={response}
      moduleId={moduleId}
      simulatorUnlocked={isSimulatorUnlocked(appState)}
      pending={pending}
      stepError={stepError}
      onExecute={executeQuarter}
      onRestart={restart}
    />
  );
}

function RestartButton({ disabled, onRestart }: { disabled: boolean; onRestart: () => void }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setConfirming(true)}
        className={buttonStyles.secondary}
      >
        <RotateCcw className="h-4 w-4" aria-hidden />
        Reiniciar simulación
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-slate-300">¿Descartar la partida?</span>
      <button
        type="button"
        onClick={() => {
          setConfirming(false);
          onRestart();
        }}
        className="rounded-lg bg-rose-500 px-3 py-2 font-semibold text-white hover:bg-rose-400"
      >
        Reiniciar
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-lg px-3 py-2 font-medium text-slate-300 hover:bg-slate-800"
      >
        Cancelar
      </button>
    </span>
  );
}

function AlertList({ alerts }: { alerts: readonly Alert[] }) {
  return (
    <ul className="space-y-2">
      {alerts.map((alert) => {
        const style = ALERT_STYLES[alert.severity];
        const Icon = style.icon;
        return (
          <li
            key={`${alert.code}-${alert.message}`}
            role={alert.severity === "CRITICAL" ? "alert" : undefined}
            className={cn("flex items-start gap-3 rounded-xl border p-3.5 text-sm", style.box)}
          >
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", style.iconClass)} aria-hidden />
            <span>{alert.message}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Cockpit({
  response,
  moduleId,
  simulatorUnlocked,
  pending,
  stepError,
  onExecute,
  onRestart,
}: {
  response: SimulationStepResponse;
  moduleId: ModuleId | undefined;
  simulatorUnlocked: boolean;
  pending: boolean;
  stepError: string | null;
  onExecute: (
    projectId: string | null,
    financingOption: FinancingOption,
    dividends: number,
  ) => void;
  onRestart: () => void;
}) {
  const { state, ai_feedback: feedback } = response;
  const { meta } = state;
  const kpis = state.valuation_and_risk_kpis;
  const isFinalGame = meta.mode === "FINAL_GAME";
  const isActive = meta.game_status === "ACTIVE";
  const history = state.history_summary;
  const alerts = response.alerts.filter((alert) => !ALERT_CODES_SHOWN_ELSEWHERE.has(alert.code));

  const exportCsv = () => exportHistoryToCsv(meta.company_name, meta.scenario_id, history);

  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wide text-emerald-300 uppercase">
              {isFinalGame ? "Simulador final" : `Simulación del Módulo ${meta.module_id ?? ""}`}
              {" · "}
              {meta.case_title}
            </p>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-white">
              {meta.company_name}
            </h2>
            <p className="mt-1 text-sm text-slate-400">Rol: CFO (Director de Finanzas)</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={exportCsv}
              disabled={history.length === 0}
              title={
                history.length === 0 ? "Disponible al cerrar el primer trimestre" : undefined
              }
              className={buttonStyles.secondary}
            >
              <Download className="h-4 w-4" aria-hidden />
              Exportar Dataset (.CSV)
            </button>
            <RestartButton disabled={pending} onRestart={onRestart} />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Badge tone="sky" className="px-3 py-1 text-sm font-semibold tabular-nums">
            Q{meta.current_quarter} / {meta.max_quarters}
          </Badge>
          <Badge tone="amber" className="px-3 py-1 text-sm font-semibold">
            Cifras en miles de USD ($k)
          </Badge>
          <Badge tone={RATING_TONES[kpis.credit_rating]} className="px-3 py-1 text-sm font-semibold">
            Rating sintético: {kpis.credit_rating}
          </Badge>
          {isFinalGame && (
            <Badge
              tone={meta.consecutive_positive_eva_turns > 0 ? "emerald" : "neutral"}
              className="px-3 py-1 text-sm font-semibold tabular-nums"
            >
              Racha de EVA positivo: {meta.consecutive_positive_eva_turns} / {EVA_STREAK_TARGET}
            </Badge>
          )}
        </div>
        <p className="mt-4 max-w-4xl text-sm leading-relaxed text-slate-300">
          <span className="font-semibold text-slate-100">Misión: </span>
          {meta.mission_objective}
        </p>
      </Panel>

      {!isActive && (
        <ClosingBanner
          response={response}
          moduleId={moduleId}
          simulatorUnlocked={simulatorUnlocked}
          onExport={exportCsv}
          onRestart={onRestart}
        />
      )}

      {(alerts.length > 0 || response.applied_shock !== null || response.upcoming_shock !== null) && (
        <section aria-label="Alertas y contexto macro" className="space-y-2">
          {response.applied_shock !== null && (
            <div className="flex items-start gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3.5 text-sm text-sky-100">
              <CloudLightning className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" aria-hidden />
              <span>
                <span className="font-semibold">
                  Shock macro del trimestre: {response.applied_shock.title}.
                </span>{" "}
                {response.applied_shock.description}
              </span>
            </div>
          )}
          {alerts.length > 0 && <AlertList alerts={alerts} />}
          {response.upcoming_shock !== null && (
            <div className="flex items-start gap-3 rounded-xl border border-dashed border-amber-500/50 bg-amber-500/5 p-3.5 text-sm text-amber-100">
              <Telescope className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
              <span>
                <span className="font-semibold">
                  Pronóstico para el próximo trimestre: {response.upcoming_shock.title}.
                </span>{" "}
                {response.upcoming_shock.description}
              </span>
            </div>
          )}
        </section>
      )}

      <KpiCards state={state} />

      <div className={cn("grid gap-6", isActive && "lg:grid-cols-5")}>
        {isActive && (
          <div className="lg:col-span-3">
            {/* La clave reinicia la selección al pasar de trimestre o reiniciar la partida. */}
            <DecisionPanel
              key={`${meta.scenario_id}-${meta.current_quarter}`}
              quarter={meta.current_quarter + 1}
              offeredProjects={response.offered_projects}
              debt100Blocked={meta.debt_100_blocked}
              state={state}
              showDividendSelector={meta.scenario_id === "sim_mod_5" || isFinalGame}
              pending={pending}
              error={stepError}
              onExecute={onExecute}
            />
          </div>
        )}
        <div className={cn(isActive && "lg:col-span-2")}>
          <AIFeedbackCard
            feedback={feedback}
            title={
              meta.current_quarter === 0
                ? "Diagnóstico de apertura del Directorio"
                : `Veredicto del Directorio · Q${meta.current_quarter}`
            }
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <h3 className="text-base font-semibold text-white">
            Waterfall del Flujo de Caja Libre · Q{meta.current_quarter}
          </h3>
          <p className="mt-1 mb-4 text-sm text-slate-400">
            Del EBIT al FCL (FCFF) del trimestre, en miles de USD.
          </p>
          <FclWaterfallChart waterfall={response.waterfall} />
        </Panel>
        <Panel>
          <h3 className="text-base font-semibold text-white">Tendencia ROIC vs. WACC</h3>
          <p className="mt-1 mb-4 text-sm text-slate-400">
            La empresa crea valor cuando el ROIC queda por encima del WACC.
          </p>
          <RoicWaccChart history={history} />
        </Panel>
      </div>

      <FinancialStatementsTabs state={state} />
    </div>
  );
}

function ClosingBanner({
  response,
  moduleId,
  simulatorUnlocked,
  onExport,
  onRestart,
}: {
  response: SimulationStepResponse;
  moduleId: ModuleId | undefined;
  simulatorUnlocked: boolean;
  onExport: () => void;
  onRestart: () => void;
}) {
  const { meta } = response.state;
  const won = meta.game_status === "WON";
  const reason = meta.end_reason !== null ? END_REASON_TEXT[meta.end_reason] : null;

  let nextStep: { href: string; label: string };
  if (won && moduleId !== undefined && moduleId < 6) {
    nextStep = { href: `/modules/${moduleId + 1}`, label: `Ir al Módulo ${moduleId + 1}` };
  } else if (won && moduleId === 6 && simulatorUnlocked) {
    nextStep = { href: "/simulator", label: "Ir al Simulador Final" };
  } else {
    nextStep = { href: "/", label: "Volver al Mapa Curricular" };
  }

  return (
    <section
      role="status"
      className={cn(
        "rounded-2xl border p-5 sm:p-6",
        won
          ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 to-slate-900"
          : "border-rose-500/40 bg-gradient-to-br from-rose-500/15 to-slate-900",
      )}
    >
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            won ? "bg-emerald-400 text-slate-950" : "bg-rose-400 text-slate-950",
          )}
        >
          {won ? (
            <Trophy className="h-6 w-6" aria-hidden />
          ) : (
            <OctagonAlert className="h-6 w-6" aria-hidden />
          )}
        </span>
        <div className="min-w-0">
          <p
            className={cn(
              "text-xs font-semibold tracking-wide uppercase",
              won ? "text-emerald-300" : "text-rose-300",
            )}
          >
            {won ? "Simulación ganada" : "Simulación finalizada"} · Q{meta.current_quarter} de{" "}
            {meta.max_quarters}
          </p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-white">
            {reason?.title ?? (won ? "Objetivo cumplido" : "Fin de la simulación")}
          </h3>
          {reason !== null && <p className="mt-1.5 text-sm text-slate-200">{reason.detail}</p>}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {won ? (
          <Link href={nextStep.href} className={buttonStyles.primary}>
            {nextStep.label}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : (
          <button type="button" onClick={onRestart} className={buttonStyles.primary}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Volver a intentar
          </button>
        )}
        <button type="button" onClick={onExport} className={buttonStyles.secondary}>
          <Download className="h-4 w-4" aria-hidden />
          Descargar CSV de la partida
        </button>
        {won ? (
          <button type="button" onClick={onRestart} className={buttonStyles.ghost}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Jugar de nuevo
          </button>
        ) : (
          <Link href={nextStep.href} className={buttonStyles.ghost}>
            {nextStep.label}
          </Link>
        )}
      </div>
    </section>
  );
}
