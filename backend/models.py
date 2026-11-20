"""Modelos Pydantic del simulador CFO.

Convención: los montos se expresan en miles de USD; los flujos son trimestrales
y las tasas y métricas de retorno están anualizadas.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

ExecutiveVerdict = Literal["EXCELENTE", "ACEPTABLE", "RIESGOSO", "CRITICO"]
AISource = Literal["gemini", "fallback"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class TutorChatMessage(StrictModel):
    role: Literal["user", "assistant"]
    content: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]


class TutorContext(StrictModel):
    route: str
    module_id: int | None = None
    module_title: str | None = None
    phase: Literal[1, 2, 3] | None = None
    active_card_question: str | None = None
    simulation_snapshot: dict[str, Any] | None = None


class TutorChatRequest(StrictModel):
    messages: list[TutorChatMessage] = Field(min_length=1)
    context: TutorContext


class TutorChatResponse(StrictModel):
    reply: str
    suggested_followups: list[str]
    ai_source: AISource


class ScenarioId(StrEnum):
    SIM_MOD_1 = "sim_mod_1"
    SIM_MOD_2 = "sim_mod_2"
    SIM_MOD_3 = "sim_mod_3"
    SIM_MOD_4 = "sim_mod_4"
    SIM_MOD_5 = "sim_mod_5"
    SIM_MOD_6 = "sim_mod_6"
    FINAL_GAME = "final_game"


class SimulationMode(StrEnum):
    PHASE_3 = "PHASE_3"
    FINAL_GAME = "FINAL_GAME"


class GameStatus(StrEnum):
    ACTIVE = "ACTIVE"
    WON = "WON"
    GAME_OVER = "GAME_OVER"


class EndReason(StrEnum):
    GOAL_ACHIEVED = "GOAL_ACHIEVED"
    INSOLVENCY = "INSOLVENCY"
    OBJECTIVE_NOT_MET = "OBJECTIVE_NOT_MET"


class FinancingOption(StrEnum):
    CASH_100 = "CASH_100"
    DEBT_50_CASH_50 = "DEBT_50_CASH_50"
    DEBT_100 = "DEBT_100"
    EQUITY_100 = "EQUITY_100"
    DEBT_REPAY = "DEBT_REPAY"


class ProjectCategory(StrEnum):
    GROWTH_CAPEX = "GROWTH_CAPEX"
    EFFICIENCY_CAPEX = "EFFICIENCY_CAPEX"
    NWC_OPTIMIZATION = "NWC_OPTIMIZATION"
    DEBT_REPAYMENT = "DEBT_REPAYMENT"


class EbitdaDriver(StrEnum):
    REVENUE = "REVENUE"
    COST_SAVING = "COST_SAVING"


class CreditRating(StrEnum):
    AAA_A = "AAA/A"
    BBB = "BBB"
    BB = "BB"
    CCC = "CCC"


class WaterfallKind(StrEnum):
    DELTA = "DELTA"
    SUBTOTAL = "SUBTOTAL"
    TOTAL = "TOTAL"


class WaterfallKey(StrEnum):
    EBIT = "EBIT"
    OPERATING_TAXES = "OPERATING_TAXES"
    NOPAT = "NOPAT"
    DEPRECIATION = "DEPRECIATION"
    CAPEX = "CAPEX"
    DELTA_NWC = "DELTA_NWC"
    FCFF = "FCFF"


class AlertSeverity(StrEnum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


# --- Catálogos ---------------------------------------------------------------


class ProjectCard(StrictModel):
    project_id: str
    name: str
    description: str
    category: ProjectCategory
    capex: float = Field(ge=0)
    nwc_required: float = Field(description="Negativo si la carta libera capital de trabajo.")
    nwc_recovered_at_end: bool = Field(
        description="Si es True, el NWC inmovilizado se recupera en el último trimestre del proyecto."
    )
    duration_quarters: int = Field(ge=1)
    ebitda_boost_q: float
    ebitda_driver: EbitdaDriver
    debt_repayment: float = Field(default=0.0, ge=0)
    financing_options: list[FinancingOption] = Field(min_length=1)
    repeatable: bool = False
    projected_npv: float | None = None
    projected_irr: float | None = Field(
        default=None,
        description="TIR anualizada; None si los flujos no son convencionales.",
    )


class MacroShock(StrictModel):
    shock_id: str
    title: str
    description: str
    demand_multiplier: float = Field(default=1.0, gt=0)
    cost_inflation_multiplier: float = Field(default=1.0, gt=0)
    risk_free_rate_delta: float = 0.0


class ScenarioGoal(StrictModel):
    """Meta de un escenario PHASE_3; los umbrales en None no se evalúan."""

    description: str
    final_cash_above: float | None = None
    final_eva_above: float | None = None
    cumulative_approved_npv_above: float | None = None
    cumulative_dividends_above: float | None = None
    interest_coverage_at_least: float | None = None
    max_emergency_overdrafts: int | None = Field(default=None, ge=0)


class ScenarioConfig(StrictModel):
    scenario_id: ScenarioId
    company_name: str
    mode: SimulationMode
    module_id: int | None
    case_title: str
    mission_objective: str
    max_quarters: int = Field(ge=1)

    risk_free_rate: float = Field(ge=0)
    market_risk_premium: float = Field(ge=0)
    corporate_tax_rate: float = Field(ge=0, lt=1)
    unlevered_beta: float = Field(gt=0)
    opening_kd_pre_tax: float = Field(ge=0)

    base_revenue_q: float = Field(ge=0)
    base_cogs_q: float = Field(ge=0)
    base_opex_q: float = Field(ge=0)
    base_depreciation_q: float = Field(ge=0)
    maintenance_capex_q: float = Field(ge=0)

    opening_cash: float
    opening_nwc: float
    opening_net_fixed_assets: float = Field(ge=0)
    opening_total_debt: float = Field(ge=0)

    deck: dict[int, list[str]]
    shock_schedule: dict[int, str] = Field(default_factory=dict)
    goal: ScenarioGoal | None = None


# --- Estado de la empresa ----------------------------------------------------


class SimulationMeta(StrictModel):
    scenario_id: ScenarioId
    company_name: str
    mode: SimulationMode
    module_id: int | None
    case_title: str
    mission_objective: str
    currency_unit: str = "USD_THOUSANDS"
    current_quarter: int = Field(ge=0, description="Último trimestre cerrado (0 = apertura).")
    max_quarters: int = Field(ge=1)
    game_status: GameStatus
    end_reason: EndReason | None = None
    consecutive_positive_eva_turns: int = Field(ge=0)
    debt_100_blocked: bool
    emergency_overdraft_count: int = Field(ge=0)
    cumulative_approved_npv: float
    cumulative_dividends: float = 0.0
    cumulative_fcff: float


class MacroEnvironment(StrictModel):
    risk_free_rate: float = Field(ge=0)
    market_risk_premium: float = Field(ge=0)
    corporate_tax_rate: float = Field(ge=0, lt=1)
    demand_multiplier: float = Field(gt=0)
    cost_inflation_multiplier: float = Field(gt=0)
    last_shock_id: str | None = None


class IncomeStatementQ(StrictModel):
    revenue: float
    cogs: float
    opex: float
    ebitda: float
    depreciation: float
    ebit: float
    operating_taxes: float
    nopat: float
    interest_expense: float
    ebt: float
    actual_taxes: float
    net_income: float


class BalanceSheet(StrictModel):
    cash: float
    working_capital_nwc: float
    net_fixed_assets: float
    total_assets: float
    total_debt: float
    shareholders_equity: float
    total_debt_and_equity: float


class CashFlowQ(StrictModel):
    nopat: float
    depreciation: float
    capex: float
    delta_nwc: float
    free_cash_flow_firm: float
    new_debt: float
    emergency_debt: float
    debt_repaid: float
    new_equity: float
    dividends: float
    net_change_in_cash: float


class ValuationAndRiskKpis(StrictModel):
    unlevered_beta: float
    d_to_e: float
    levered_beta: float
    ke: float
    interest_coverage: float
    credit_spread: float
    credit_rating: CreditRating
    kd_pre_tax: float
    kd_after_tax: float
    wacc: float
    invested_capital: float
    roic_annualized: float
    eva_annualized: float
    net_debt_to_ebitda: float


class ActiveProject(StrictModel):
    project_id: str
    name: str
    category: ProjectCategory
    capex: float
    nwc_required: float
    nwc_recovered_at_end: bool
    ebitda_boost_q: float
    ebitda_driver: EbitdaDriver
    depreciation_q: float
    duration_quarters: int = Field(ge=1)
    remaining_quarters: int = Field(ge=1)
    start_quarter: int = Field(ge=1)
    financing_option: FinancingOption
    projected_npv_at_approval: float
    projected_irr_at_approval: float | None


class HistoryEntry(StrictModel):
    quarter: int = Field(ge=1)
    selected_project_id: str | None
    financing_option: FinancingOption | None
    shock_id: str | None
    revenue: float
    ebitda: float
    net_income: float
    free_cash_flow_firm: float
    cash: float
    total_debt: float
    shareholders_equity: float
    interest_coverage: float
    credit_rating: CreditRating
    wacc: float
    roic_annualized: float
    eva_annualized: float
    emergency_debt: float
    dividends: float = 0.0
    game_status: GameStatus


class CompanyState(StrictModel):
    meta: SimulationMeta
    macro_environment: MacroEnvironment
    income_statement_q: IncomeStatementQ
    balance_sheet: BalanceSheet
    cash_flow_q: CashFlowQ
    valuation_and_risk_kpis: ValuationAndRiskKpis
    active_projects: list[ActiveProject]
    history_summary: list[HistoryEntry]


# --- Contratos de la API -----------------------------------------------------


class WaterfallItem(StrictModel):
    key: WaterfallKey
    label: str
    value: float = Field(description="Valor con signo: positivo suma caja, negativo la consume.")
    kind: WaterfallKind
    cumulative: float = Field(description="Acumulado del puente después de esta barra.")


class Alert(StrictModel):
    severity: AlertSeverity
    code: str
    message: str


class AIFeedback(StrictModel):
    executive_verdict: ExecutiveVerdict
    board_diagnosis: str = Field(
        description=(
            "2 a 3 oraciones ejecutivas sobre el cambio en EVA, ROIC vs WACC, FCL o cobertura, "
            "sin cifras ajenas al estado recibido."
        )
    )
    risk_alert: str | None = Field(
        default=None,
        description=(
            "Alerta concreta si cayó la cobertura, subió el spread a BB/CCC, hubo sobregiro "
            "o se eligió un proyecto con VAN negativo."
        ),
    )
    bibliographic_anchor: str = Field(
        description=(
            "Una línea que conecta el turno con Brealey-Myers, Ross-Westerfield, Damodaran, "
            "Modigliani-Miller o McKinsey."
        )
    )
    strategic_score: int = Field(ge=1, le=100)
    ai_source: AISource


# --- Resumen del turno para la evaluación cualitativa ------------------------


class TurnDecision(StrictModel):
    project_id: str | None
    project_name: str | None
    category: ProjectCategory | None
    financing_option: FinancingOption | None
    projected_npv: float | None = Field(
        description="VAN ex-ante al WACC vigente al decidir; None si no hubo inversión."
    )
    projected_irr: float | None
    capex: float
    nwc_required: float
    new_debt: float
    new_equity: float
    debt_repaid: float
    dividends: float


class KpiDeltas(StrictModel):
    """Variación del trimestre: valor nuevo menos valor anterior."""

    eva_annualized: float
    roic_annualized: float
    wacc: float
    roic_wacc_spread: float
    interest_coverage: float
    credit_spread: float
    net_debt_to_ebitda: float
    free_cash_flow_firm: float
    cash: float
    total_debt: float


class TurnSummary(StrictModel):
    """Resumen compacto del turno; todos los números los calcula engine.py."""

    company_name: str
    mission_objective: str
    quarter: int = Field(ge=0, description="0 = diagnóstico de apertura, sin decisión.")
    max_quarters: int
    prev_kpis: ValuationAndRiskKpis
    new_kpis: ValuationAndRiskKpis
    kpi_deltas: KpiDeltas
    roic_wacc_spread: float
    waterfall_fcf: list[WaterfallItem]
    free_cash_flow_firm: float
    cash: float
    emergency_debt: float
    decision: TurnDecision
    applied_shock: MacroShock | None
    game_status: GameStatus
    end_reason: EndReason | None
    consecutive_positive_eva_turns: int


class InitSimulationRequest(StrictModel):
    scenario_id: ScenarioId


class StepSimulationRequest(StrictModel):
    state: CompanyState
    selected_project_id: str | None = Field(
        default=None, description="None para cerrar el trimestre sin aprobar ninguna carta."
    )
    financing_option: FinancingOption = FinancingOption.CASH_100
    dividends: float = Field(default=0.0, ge=0)


class DividendPreviewRequest(StrictModel):
    state: CompanyState
    selected_project_id: str | None = None
    financing_option: FinancingOption = FinancingOption.CASH_100


class DividendPreviewResponse(StrictModel):
    projected_cash_before_dividends: float
    projected_interest_coverage: float


class EngineResult(StrictModel):
    state: CompanyState
    waterfall: list[WaterfallItem]
    offered_projects: list[ProjectCard]
    applied_shock: MacroShock | None
    upcoming_shock: MacroShock | None
    alerts: list[Alert]


class SimulationStepResponse(EngineResult):
    ai_feedback: AIFeedback


class HealthResponse(StrictModel):
    status: str
    service: str
    version: str
