/**
 * Validación estructural de una `SimulationStepResponse`.
 * Se usa al leer `localStorage` y al recibir respuestas de la API: lo que no tenga la forma
 * que el cockpit necesita para renderizar se descarta en lugar de romper la pantalla.
 */

import type { ScenarioId, SimulationStepResponse } from "./types";

export const SCENARIO_IDS: readonly ScenarioId[] = [
  "sim_mod_1",
  "sim_mod_2",
  "sim_mod_3",
  "sim_mod_4",
  "sim_mod_5",
  "sim_mod_6",
  "final_game",
];

type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNumberOrNull(value: unknown): boolean {
  return value === null || isNumber(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isOneOf(value: unknown, options: readonly string[]): boolean {
  return isString(value) && options.includes(value);
}

function hasNumbers(value: unknown, keys: readonly string[]): value is UnknownRecord {
  return isRecord(value) && keys.every((key) => isNumber(value[key]));
}

function hasStrings(value: unknown, keys: readonly string[]): value is UnknownRecord {
  return isRecord(value) && keys.every((key) => isString(value[key]));
}

function isArrayOf(value: unknown, isItem: (item: unknown) => boolean): boolean {
  return Array.isArray(value) && value.every(isItem);
}

const GAME_STATUSES = ["ACTIVE", "WON", "GAME_OVER"];
const END_REASONS = ["GOAL_ACHIEVED", "INSOLVENCY", "OBJECTIVE_NOT_MET"];
const CREDIT_RATINGS = ["AAA/A", "BBB", "BB", "CCC"];

const INCOME_KEYS = [
  "revenue",
  "cogs",
  "opex",
  "ebitda",
  "depreciation",
  "ebit",
  "operating_taxes",
  "nopat",
  "interest_expense",
  "ebt",
  "actual_taxes",
  "net_income",
];
const BALANCE_KEYS = [
  "cash",
  "working_capital_nwc",
  "net_fixed_assets",
  "total_assets",
  "total_debt",
  "shareholders_equity",
  "total_debt_and_equity",
];
const CASH_FLOW_KEYS = [
  "nopat",
  "depreciation",
  "capex",
  "delta_nwc",
  "free_cash_flow_firm",
  "new_debt",
  "emergency_debt",
  "debt_repaid",
  "new_equity",
  "dividends",
  "net_change_in_cash",
];
const KPI_KEYS = [
  "unlevered_beta",
  "d_to_e",
  "levered_beta",
  "ke",
  "interest_coverage",
  "credit_spread",
  "kd_pre_tax",
  "kd_after_tax",
  "wacc",
  "invested_capital",
  "roic_annualized",
  "eva_annualized",
  "net_debt_to_ebitda",
];
const HISTORY_NUMBER_KEYS = [
  "quarter",
  "revenue",
  "ebitda",
  "net_income",
  "free_cash_flow_firm",
  "cash",
  "total_debt",
  "shareholders_equity",
  "interest_coverage",
  "wacc",
  "roic_annualized",
  "eva_annualized",
  "emergency_debt",
];

function isMeta(value: unknown, scenarioId: ScenarioId | undefined): boolean {
  return (
    hasStrings(value, ["company_name", "case_title", "mission_objective"]) &&
    hasNumbers(value, ["current_quarter", "max_quarters", "consecutive_positive_eva_turns"]) &&
    (value.cumulative_dividends === undefined || isNumber(value.cumulative_dividends)) &&
    isOneOf(value.scenario_id, SCENARIO_IDS) &&
    (scenarioId === undefined || value.scenario_id === scenarioId) &&
    isOneOf(value.mode, ["PHASE_3", "FINAL_GAME"]) &&
    isOneOf(value.game_status, GAME_STATUSES) &&
    (value.end_reason === null || isOneOf(value.end_reason, END_REASONS)) &&
    (value.module_id === null || isNumber(value.module_id)) &&
    typeof value.debt_100_blocked === "boolean"
  );
}

function isState(value: unknown, scenarioId: ScenarioId | undefined): boolean {
  return (
    isRecord(value) &&
    isMeta(value.meta, scenarioId) &&
    isRecord(value.macro_environment) &&
    hasNumbers(value.income_statement_q, INCOME_KEYS) &&
    hasNumbers(value.balance_sheet, BALANCE_KEYS) &&
    hasNumbers(value.cash_flow_q, CASH_FLOW_KEYS) &&
    hasNumbers(value.valuation_and_risk_kpis, KPI_KEYS) &&
    isOneOf(value.valuation_and_risk_kpis.credit_rating, CREDIT_RATINGS) &&
    isArrayOf(
      value.active_projects,
      (item) =>
        hasStrings(item, ["project_id", "name", "category", "financing_option"]) &&
        hasNumbers(item, [
          "capex",
          "ebitda_boost_q",
          "depreciation_q",
          "duration_quarters",
          "remaining_quarters",
          "projected_npv_at_approval",
        ]),
    ) &&
    isArrayOf(
      value.history_summary,
      (item) =>
        hasNumbers(item, HISTORY_NUMBER_KEYS) &&
        (item.dividends === undefined || isNumber(item.dividends)) &&
        isOneOf(item.credit_rating, CREDIT_RATINGS) &&
        isOneOf(item.game_status, GAME_STATUSES),
    )
  );
}

function isProjectCard(value: unknown): boolean {
  return (
    hasStrings(value, ["project_id", "name", "description", "category"]) &&
    hasNumbers(value, [
      "capex",
      "nwc_required",
      "duration_quarters",
      "ebitda_boost_q",
      "debt_repayment",
    ]) &&
    typeof value.nwc_recovered_at_end === "boolean" &&
    isArrayOf(value.financing_options, isString) &&
    isNumberOrNull(value.projected_npv) &&
    isNumberOrNull(value.projected_irr)
  );
}

function isShockOrNull(value: unknown): boolean {
  return value === null || hasStrings(value, ["shock_id", "title", "description"]);
}

function isFeedback(value: unknown): boolean {
  return (
    hasStrings(value, ["board_diagnosis", "bibliographic_anchor"]) &&
    isOneOf(value.executive_verdict, ["EXCELENTE", "ACEPTABLE", "RIESGOSO", "CRITICO"]) &&
    (value.risk_alert === null || isString(value.risk_alert)) &&
    isNumber(value.strategic_score) &&
    isOneOf(value.ai_source, ["gemini", "fallback"])
  );
}

/** `scenarioId` exige, además, que la respuesta pertenezca a ese escenario. */
export function isSimulationStepResponse(
  value: unknown,
  scenarioId?: ScenarioId,
): value is SimulationStepResponse {
  return (
    isRecord(value) &&
    isState(value.state, scenarioId) &&
    isArrayOf(
      value.waterfall,
      (item) =>
        hasStrings(item, ["key", "label"]) &&
        hasNumbers(item, ["value", "cumulative"]) &&
        isOneOf(item.kind, ["DELTA", "SUBTOTAL", "TOTAL"]),
    ) &&
    isArrayOf(value.offered_projects, isProjectCard) &&
    isShockOrNull(value.applied_shock) &&
    isShockOrNull(value.upcoming_shock) &&
    isArrayOf(
      value.alerts,
      (item) =>
        hasStrings(item, ["code", "message"]) &&
        isOneOf(item.severity, ["INFO", "WARNING", "CRITICAL"]),
    ) &&
    isFeedback(value.ai_feedback)
  );
}
