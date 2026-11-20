/**
 * Tipos del frontend.
 * - Contenido curricular: espejo exacto de `frontend/data/module_X.json`.
 * - API del simulador: espejo de los esquemas Pydantic de `backend/models.py`
 *   (montos en miles de USD, flujos trimestrales, tasas anualizadas).
 */

// --- Contenido curricular (module_X.json) -----------------------------------

export type ModuleId = 1 | 2 | 3 | 4 | 5 | 6;

export type PhaseNumber = 1 | 2 | 3;

export interface VariableLegendItem {
  symbol: string;
  meaning: string;
}

export interface TheoryConcept {
  title: string;
  explanation: string;
  formula_latex: string;
  variables_legend: VariableLegendItem[];
  common_pitfall: string;
}

export interface GivenDataItem {
  label: string;
  value: string;
}

export interface WorkedExampleStep {
  step_number: number;
  description: string;
  calculation: string;
  result: string;
}

export interface WorkedExample {
  scenario_title: string;
  given_data: GivenDataItem[];
  steps: WorkedExampleStep[];
  final_conclusion: string;
}

export interface Phase1Theory {
  cfo_intuition: string;
  concepts: TheoryConcept[];
  worked_example: WorkedExample;
}

export type CardType = "FLASHCARD" | "CONCEPT_QUIZ" | "CALCULATION_QUIZ";

export type CardDifficulty = "BASICO" | "INTERMEDIO" | "DESAFIO";

export interface Phase2Card {
  card_id: string;
  card_type: CardType;
  difficulty: CardDifficulty;
  front_question: string;
  hint: string;
  /** Vacío en las FLASHCARD; cuatro opciones "A) …" a "D) …" en los quizzes. */
  options: string[];
  /** `null` en las FLASHCARD. */
  correct_option_index: number | null;
  back_explanation: string;
  source_reference: string;
}

export interface Phase3Brief {
  scenario_id: ScenarioId;
  case_title: string;
  company_name: string;
  your_role: string;
  mission_objective: string;
}

export interface CourseModule {
  module_id: ModuleId;
  slug: string;
  title: string;
  subtitle: string;
  bibliographic_sources: string[];
  phase_1_theory: Phase1Theory;
  phase_2_cards: Phase2Card[];
  phase_3_brief: Phase3Brief;
}

/** Módulo del roadmap que todavía no tiene contenido. */
export interface FutureModule {
  module_id: number;
  title: string;
  summary: string;
  locked: true;
}

// --- API del simulador (backend/models.py) ----------------------------------

export type ScenarioId =
  | "sim_mod_1"
  | "sim_mod_2"
  | "sim_mod_3"
  | "sim_mod_4"
  | "sim_mod_5"
  | "sim_mod_6"
  | "final_game";

export type SimulationMode = "PHASE_3" | "FINAL_GAME";

export type GameStatus = "ACTIVE" | "WON" | "GAME_OVER";

export type EndReason = "GOAL_ACHIEVED" | "INSOLVENCY" | "OBJECTIVE_NOT_MET";

export type FinancingOption =
  | "CASH_100"
  | "DEBT_50_CASH_50"
  | "DEBT_100"
  | "EQUITY_100"
  | "DEBT_REPAY";

export type ProjectCategory =
  | "GROWTH_CAPEX"
  | "EFFICIENCY_CAPEX"
  | "NWC_OPTIMIZATION"
  | "DEBT_REPAYMENT";

export type EbitdaDriver = "REVENUE" | "COST_SAVING";

export type CreditRating = "AAA/A" | "BBB" | "BB" | "CCC";

export type WaterfallKind = "DELTA" | "SUBTOTAL" | "TOTAL";

export type WaterfallKey =
  | "EBIT"
  | "OPERATING_TAXES"
  | "NOPAT"
  | "DEPRECIATION"
  | "CAPEX"
  | "DELTA_NWC"
  | "FCFF";

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export type ExecutiveVerdict = "EXCELENTE" | "ACEPTABLE" | "RIESGOSO" | "CRITICO";

export type AISource = "gemini" | "fallback";

export interface TutorChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TutorSimulationSnapshot {
  scenario_id: ScenarioId;
  current_quarter: number;
  wacc: number;
  roic_annualized: number;
  eva_annualized: number;
  cash: number;
  interest_coverage: number;
  credit_rating: CreditRating;
}

export interface TutorContext {
  route: string;
  module_id?: ModuleId;
  module_title?: string;
  phase?: PhaseNumber;
  active_card_question?: string;
  simulation_snapshot?: TutorSimulationSnapshot;
}

export interface TutorChatRequest {
  messages: TutorChatMessage[];
  context: TutorContext;
}

export interface TutorChatResponse {
  reply: string;
  suggested_followups: string[];
  ai_source: AISource;
}

export interface ProjectCard {
  project_id: string;
  name: string;
  description: string;
  category: ProjectCategory;
  capex: number;
  /** Negativo si la carta libera capital de trabajo. */
  nwc_required: number;
  nwc_recovered_at_end: boolean;
  duration_quarters: number;
  ebitda_boost_q: number;
  ebitda_driver: EbitdaDriver;
  debt_repayment: number;
  financing_options: FinancingOption[];
  repeatable: boolean;
  projected_npv: number | null;
  /** TIR anualizada; `null` si los flujos no son convencionales. */
  projected_irr: number | null;
}

export interface MacroShock {
  shock_id: string;
  title: string;
  description: string;
  demand_multiplier: number;
  cost_inflation_multiplier: number;
  risk_free_rate_delta: number;
}

export interface SimulationMeta {
  scenario_id: ScenarioId;
  company_name: string;
  mode: SimulationMode;
  module_id: number | null;
  case_title: string;
  mission_objective: string;
  currency_unit: string;
  /** Último trimestre cerrado (0 = apertura). */
  current_quarter: number;
  max_quarters: number;
  game_status: GameStatus;
  end_reason: EndReason | null;
  consecutive_positive_eva_turns: number;
  debt_100_blocked: boolean;
  emergency_overdraft_count: number;
  cumulative_approved_npv: number;
  cumulative_dividends?: number;
  cumulative_fcff: number;
}

export interface MacroEnvironment {
  risk_free_rate: number;
  market_risk_premium: number;
  corporate_tax_rate: number;
  demand_multiplier: number;
  cost_inflation_multiplier: number;
  last_shock_id: string | null;
}

export interface IncomeStatementQ {
  revenue: number;
  cogs: number;
  opex: number;
  ebitda: number;
  depreciation: number;
  ebit: number;
  operating_taxes: number;
  nopat: number;
  interest_expense: number;
  ebt: number;
  actual_taxes: number;
  net_income: number;
}

export interface BalanceSheet {
  cash: number;
  working_capital_nwc: number;
  net_fixed_assets: number;
  total_assets: number;
  total_debt: number;
  shareholders_equity: number;
  total_debt_and_equity: number;
}

export interface CashFlowQ {
  nopat: number;
  depreciation: number;
  capex: number;
  delta_nwc: number;
  free_cash_flow_firm: number;
  new_debt: number;
  emergency_debt: number;
  debt_repaid: number;
  new_equity: number;
  dividends: number;
  net_change_in_cash: number;
}

export interface ValuationAndRiskKpis {
  unlevered_beta: number;
  d_to_e: number;
  levered_beta: number;
  ke: number;
  interest_coverage: number;
  credit_spread: number;
  credit_rating: CreditRating;
  kd_pre_tax: number;
  kd_after_tax: number;
  wacc: number;
  invested_capital: number;
  roic_annualized: number;
  eva_annualized: number;
  net_debt_to_ebitda: number;
}

export interface ActiveProject {
  project_id: string;
  name: string;
  category: ProjectCategory;
  capex: number;
  nwc_required: number;
  nwc_recovered_at_end: boolean;
  ebitda_boost_q: number;
  ebitda_driver: EbitdaDriver;
  depreciation_q: number;
  duration_quarters: number;
  remaining_quarters: number;
  start_quarter: number;
  financing_option: FinancingOption;
  projected_npv_at_approval: number;
  projected_irr_at_approval: number | null;
}

export interface HistoryEntry {
  quarter: number;
  selected_project_id: string | null;
  financing_option: FinancingOption | null;
  shock_id: string | null;
  revenue: number;
  ebitda: number;
  net_income: number;
  free_cash_flow_firm: number;
  cash: number;
  total_debt: number;
  shareholders_equity: number;
  interest_coverage: number;
  credit_rating: CreditRating;
  wacc: number;
  roic_annualized: number;
  eva_annualized: number;
  emergency_debt: number;
  dividends?: number;
  game_status: GameStatus;
}

export interface CompanyState {
  meta: SimulationMeta;
  macro_environment: MacroEnvironment;
  income_statement_q: IncomeStatementQ;
  balance_sheet: BalanceSheet;
  cash_flow_q: CashFlowQ;
  valuation_and_risk_kpis: ValuationAndRiskKpis;
  active_projects: ActiveProject[];
  history_summary: HistoryEntry[];
}

export interface WaterfallItem {
  key: WaterfallKey;
  label: string;
  /** Valor con signo: positivo suma caja, negativo la consume. */
  value: number;
  kind: WaterfallKind;
  /** Acumulado del puente después de esta barra. */
  cumulative: number;
}

export interface Alert {
  severity: AlertSeverity;
  code: string;
  message: string;
}

export interface AIFeedback {
  executive_verdict: ExecutiveVerdict;
  board_diagnosis: string;
  risk_alert: string | null;
  bibliographic_anchor: string;
  /** Entero de 1 a 100. */
  strategic_score: number;
  ai_source: AISource;
}

export interface InitSimulationRequest {
  scenario_id: ScenarioId;
}

export interface StepSimulationRequest {
  state: CompanyState;
  /** `null` cierra el trimestre sin aprobar ninguna carta. */
  selected_project_id?: string | null;
  financing_option?: FinancingOption;
  dividends?: number;
}

export interface DividendPreviewRequest {
  state: CompanyState;
  selected_project_id?: string | null;
  financing_option?: FinancingOption;
}

export interface DividendPreviewResponse {
  projected_cash_before_dividends: number;
  projected_interest_coverage: number;
}

export interface SimulationStepResponse {
  state: CompanyState;
  waterfall: WaterfallItem[];
  offered_projects: ProjectCard[];
  applied_shock: MacroShock | null;
  upcoming_shock: MacroShock | null;
  alerts: Alert[];
  ai_feedback: AIFeedback;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}
