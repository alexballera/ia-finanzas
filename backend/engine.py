"""Motor financiero determinista del simulador CFO (Sección 2 de PROJECT_SPEC.md).

Python es el único dueño de los números: todas las funciones son puras y sin estado.
Los flujos son trimestrales; las tasas y métricas de retorno están anualizadas.
"""

from __future__ import annotations

import math

import numpy_financial as npf

from models import (
    ActiveProject,
    Alert,
    AlertSeverity,
    BalanceSheet,
    CashFlowQ,
    CompanyState,
    CreditRating,
    EbitdaDriver,
    EndReason,
    EngineResult,
    FinancingOption,
    GameStatus,
    HistoryEntry,
    IncomeStatementQ,
    MacroEnvironment,
    MacroShock,
    ProjectCard,
    ProjectCategory,
    ScenarioConfig,
    ScenarioGoal,
    ScenarioId,
    SimulationMeta,
    SimulationMode,
    ValuationAndRiskKpis,
    WaterfallItem,
    WaterfallKey,
    WaterfallKind,
)
from scenarios import MACRO_SHOCKS, PROJECT_CATALOG, get_scenario

QUARTERS_PER_YEAR = 4.0
BALANCE_TOLERANCE = 1e-4
NO_INTEREST_COVERAGE = 99.0
CCC_COVERAGE_THRESHOLD = 1.5
INSOLVENCY_NET_DEBT_TO_EBITDA = 4.0
INSOLVENCY_COVERAGE = 1.2
WIN_CONSECUTIVE_EVA_TURNS = 3
WIN_MIN_COVERAGE = 2.5


class EngineError(ValueError):
    """Error base del motor."""


class InvalidDecisionError(EngineError):
    """La decisión del jugador no es válida para el estado actual."""


class InvalidStateError(EngineError):
    """El estado recibido es inconsistente (por ejemplo, el balance no cuadra)."""


class SimulationClosedError(EngineError):
    """La simulación ya terminó y no admite más turnos."""


# --- Valuación de cartas -----------------------------------------------------


def quarterly_rate(annual_rate: float) -> float:
    return (1.0 + annual_rate) ** (1.0 / QUARTERS_PER_YEAR) - 1.0


def effective_ebitda_boost(
    ebitda_boost_q: float,
    driver: EbitdaDriver,
    demand_multiplier: float,
    cost_inflation_multiplier: float,
) -> float:
    """Los ingresos incrementales escalan con la demanda; los ahorros, con el nivel de costos."""
    if driver is EbitdaDriver.REVENUE:
        return ebitda_boost_q * demand_multiplier
    return ebitda_boost_q * cost_inflation_multiplier


def project_incremental_cash_flows(
    card: ProjectCard,
    corporate_tax_rate: float,
    demand_multiplier: float = 1.0,
    cost_inflation_multiplier: float = 1.0,
) -> list[float]:
    """Flujos operativos incrementales: t=0 es el trimestre de aprobación."""
    depreciation = card.capex / card.duration_quarters
    boost = effective_ebitda_boost(
        card.ebitda_boost_q, card.ebitda_driver, demand_multiplier, cost_inflation_multiplier
    )
    ebit = boost - depreciation
    operating_flow = ebit - ebit * corporate_tax_rate + depreciation

    flows = [-(card.capex + card.nwc_required)]
    flows.extend(operating_flow for _ in range(card.duration_quarters))
    if card.nwc_recovered_at_end:
        flows[-1] += card.nwc_required
    return flows


def _annualized_irr(flows: list[float]) -> float | None:
    # La TIR solo es interpretable con flujos convencionales (desembolso inicial y cobros posteriores).
    if flows[0] >= 0 or not any(flow > 0 for flow in flows[1:]):
        return None
    irr_q = float(npf.irr(flows))
    if not math.isfinite(irr_q) or irr_q <= -1.0:
        return None
    return (1.0 + irr_q) ** QUARTERS_PER_YEAR - 1.0


def evaluate_card(
    card: ProjectCard,
    wacc: float,
    corporate_tax_rate: float,
    demand_multiplier: float = 1.0,
    cost_inflation_multiplier: float = 1.0,
    debt_100_blocked: bool = False,
) -> ProjectCard:
    """Devuelve la carta con su VAN y TIR ex-ante al WACC vigente."""
    financing_options = [
        option
        for option in card.financing_options
        if not (debt_100_blocked and option is FinancingOption.DEBT_100)
    ]
    if card.category is ProjectCategory.DEBT_REPAYMENT:
        return card.model_copy(
            update={
                "projected_npv": 0.0,
                "projected_irr": None,
                "financing_options": financing_options,
            }
        )

    flows = project_incremental_cash_flows(
        card, corporate_tax_rate, demand_multiplier, cost_inflation_multiplier
    )
    return card.model_copy(
        update={
            "projected_npv": float(npf.npv(quarterly_rate(wacc), flows)),
            "projected_irr": _annualized_irr(flows),
            "financing_options": financing_options,
        }
    )


# --- Riesgo, Hamada, rating sintético y WACC ---------------------------------


def credit_profile(interest_coverage: float) -> tuple[float, CreditRating]:
    if interest_coverage > 5.0:
        return 0.015, CreditRating.AAA_A
    if interest_coverage >= 3.0:
        return 0.030, CreditRating.BBB
    if interest_coverage >= CCC_COVERAGE_THRESHOLD:
        return 0.055, CreditRating.BB
    return 0.090, CreditRating.CCC


def compute_interest_coverage(ebit: float, interest_expense: float) -> float:
    if interest_expense > 0:
        return ebit / interest_expense
    return NO_INTEREST_COVERAGE


def compute_net_debt_to_ebitda(total_debt: float, cash: float, ebitda_q: float) -> float:
    return (total_debt - cash) / max(1.0, ebitda_q * QUARTERS_PER_YEAR)


def compute_kpis(
    *,
    cash: float,
    working_capital_nwc: float,
    net_fixed_assets: float,
    total_debt: float,
    shareholders_equity: float,
    ebitda_q: float,
    ebit_q: float,
    nopat_q: float,
    interest_expense_q: float,
    risk_free_rate: float,
    market_risk_premium: float,
    corporate_tax_rate: float,
    unlevered_beta: float,
) -> ValuationAndRiskKpis:
    # Con patrimonio no positivo el spec no define D/E: se usa el mismo piso de 1.0 que en total_capital.
    if shareholders_equity > 0:
        d_to_e = total_debt / shareholders_equity
    else:
        d_to_e = total_debt / 1.0

    levered_beta = unlevered_beta * (1.0 + (1.0 - corporate_tax_rate) * d_to_e)
    ke = risk_free_rate + levered_beta * market_risk_premium

    interest_coverage = compute_interest_coverage(ebit_q, interest_expense_q)
    credit_spread, credit_rating = credit_profile(interest_coverage)
    kd_pre_tax = risk_free_rate + credit_spread
    kd_after_tax = kd_pre_tax * (1.0 - corporate_tax_rate)

    total_capital = total_debt + max(1.0, shareholders_equity)
    wacc = ke * (shareholders_equity / total_capital) + kd_after_tax * (total_debt / total_capital)

    invested_capital = working_capital_nwc + net_fixed_assets
    roic_annualized = (
        (nopat_q * QUARTERS_PER_YEAR) / invested_capital if invested_capital > 0 else 0.0
    )
    eva_annualized = (roic_annualized - wacc) * invested_capital

    return ValuationAndRiskKpis(
        unlevered_beta=unlevered_beta,
        d_to_e=d_to_e,
        levered_beta=levered_beta,
        ke=ke,
        interest_coverage=interest_coverage,
        credit_spread=credit_spread,
        credit_rating=credit_rating,
        kd_pre_tax=kd_pre_tax,
        kd_after_tax=kd_after_tax,
        wacc=wacc,
        invested_capital=invested_capital,
        roic_annualized=roic_annualized,
        eva_annualized=eva_annualized,
        net_debt_to_ebitda=compute_net_debt_to_ebitda(total_debt, cash, ebitda_q),
    )


# --- Estado de resultados, FCFF y balance ------------------------------------


def compute_income_statement(
    scenario: ScenarioConfig,
    macro: MacroEnvironment,
    active_projects: list[ActiveProject],
    total_debt_start: float,
    kd_pre_tax_start: float,
) -> IncomeStatementQ:
    demand = macro.demand_multiplier
    costs = macro.cost_inflation_multiplier

    revenue = scenario.base_revenue_q * demand
    cogs = scenario.base_cogs_q * demand * costs
    opex = scenario.base_opex_q * costs
    depreciation = scenario.base_depreciation_q

    for project in active_projects:
        boost = effective_ebitda_boost(
            project.ebitda_boost_q, project.ebitda_driver, demand, costs
        )
        if project.ebitda_driver is EbitdaDriver.REVENUE:
            revenue += boost
        else:
            opex -= boost
        depreciation += project.depreciation_q

    ebitda = revenue - cogs - opex
    ebit = ebitda - depreciation
    operating_taxes = max(0.0, ebit * macro.corporate_tax_rate)
    nopat = ebit - operating_taxes

    interest_expense = total_debt_start * (kd_pre_tax_start / QUARTERS_PER_YEAR)
    ebt = ebit - interest_expense
    actual_taxes = max(0.0, ebt * macro.corporate_tax_rate)
    net_income = ebt - actual_taxes

    return IncomeStatementQ(
        revenue=revenue,
        cogs=cogs,
        opex=opex,
        ebitda=ebitda,
        depreciation=depreciation,
        ebit=ebit,
        operating_taxes=operating_taxes,
        nopat=nopat,
        interest_expense=interest_expense,
        ebt=ebt,
        actual_taxes=actual_taxes,
        net_income=net_income,
    )


def compute_fcff(nopat: float, depreciation: float, capex: float, delta_nwc: float) -> float:
    return nopat + depreciation - capex - delta_nwc


def build_waterfall(
    *,
    ebit: float,
    operating_taxes: float,
    depreciation: float,
    capex: float,
    delta_nwc: float,
) -> list[WaterfallItem]:
    """Puente EBIT -> FCFF; la suma de las barras DELTA es exactamente el FCFF."""
    deltas = [
        (WaterfallKey.EBIT, "EBIT", ebit),
        (WaterfallKey.OPERATING_TAXES, "Impuestos Operativos", -operating_taxes),
        (WaterfallKey.DEPRECIATION, "Depreciación y Amortización", depreciation),
        (WaterfallKey.CAPEX, "Capex", -capex),
        (WaterfallKey.DELTA_NWC, "Variación NWC", -delta_nwc),
    ]

    items: list[WaterfallItem] = []
    cumulative = 0.0
    for key, label, value in deltas:
        cumulative += value
        items.append(
            WaterfallItem(
                key=key, label=label, value=value, kind=WaterfallKind.DELTA, cumulative=cumulative
            )
        )
        if key is WaterfallKey.OPERATING_TAXES:
            items.append(
                WaterfallItem(
                    key=WaterfallKey.NOPAT,
                    label="NOPAT",
                    value=cumulative,
                    kind=WaterfallKind.SUBTOTAL,
                    cumulative=cumulative,
                )
            )
    items.append(
        WaterfallItem(
            key=WaterfallKey.FCFF,
            label="FCL (FCFF)",
            value=cumulative,
            kind=WaterfallKind.TOTAL,
            cumulative=cumulative,
        )
    )
    return items


def build_balance_sheet(
    *,
    cash: float,
    working_capital_nwc: float,
    net_fixed_assets: float,
    total_debt: float,
    shareholders_equity: float,
) -> BalanceSheet:
    return BalanceSheet(
        cash=cash,
        working_capital_nwc=working_capital_nwc,
        net_fixed_assets=net_fixed_assets,
        total_assets=cash + working_capital_nwc + net_fixed_assets,
        total_debt=total_debt,
        shareholders_equity=shareholders_equity,
        total_debt_and_equity=total_debt + shareholders_equity,
    )


def balance_gap(balance: BalanceSheet) -> float:
    assets = balance.cash + balance.working_capital_nwc + balance.net_fixed_assets
    return assets - (balance.total_debt + balance.shareholders_equity)


def assert_balanced(balance: BalanceSheet) -> None:
    gap = balance_gap(balance)
    if abs(gap) >= BALANCE_TOLERANCE:
        raise InvalidStateError(
            f"El balance no cuadra: Activos - (Deuda + Patrimonio) = {gap:.6f}."
        )


# --- Mazo, shocks y reglas de cierre -----------------------------------------


def apply_macro_shock(macro: MacroEnvironment, shock: MacroShock | None) -> MacroEnvironment:
    """Los shocks son cambios de régimen persistentes sobre el entorno macro."""
    if shock is None:
        return macro
    return macro.model_copy(
        update={
            "risk_free_rate": max(0.0, macro.risk_free_rate + shock.risk_free_rate_delta),
            "demand_multiplier": macro.demand_multiplier * shock.demand_multiplier,
            "cost_inflation_multiplier": (
                macro.cost_inflation_multiplier * shock.cost_inflation_multiplier
            ),
            "last_shock_id": shock.shock_id,
        }
    )


def scheduled_shock(scenario: ScenarioConfig, quarter: int) -> MacroShock | None:
    shock_id = scenario.shock_schedule.get(quarter)
    return MACRO_SHOCKS[shock_id] if shock_id is not None else None


def offered_cards(scenario: ScenarioConfig, state: CompanyState, quarter: int) -> list[ProjectCard]:
    """Cartas disponibles para decidir en `quarter`, valuadas al WACC vigente del estado."""
    active_ids = {project.project_id for project in state.active_projects}
    used_ids = {
        entry.selected_project_id
        for entry in state.history_summary
        if entry.selected_project_id is not None
    }
    kpis = state.valuation_and_risk_kpis
    macro = state.macro_environment
    debt_100_blocked = kpis.interest_coverage < CCC_COVERAGE_THRESHOLD

    cards: list[ProjectCard] = []
    for project_id in scenario.deck.get(quarter, []):
        card = PROJECT_CATALOG[project_id]
        if project_id in active_ids or (project_id in used_ids and not card.repeatable):
            continue
        cards.append(
            evaluate_card(
                card,
                kpis.wacc,
                macro.corporate_tax_rate,
                macro.demand_multiplier,
                macro.cost_inflation_multiplier,
                debt_100_blocked,
            )
        )
    return cards


def is_goal_met(
    goal: ScenarioGoal | None,
    meta: SimulationMeta,
    balance: BalanceSheet,
    kpis: ValuationAndRiskKpis,
) -> bool:
    if goal is None:
        return True
    checks = [
        goal.final_cash_above is None or balance.cash > goal.final_cash_above,
        goal.final_eva_above is None or kpis.eva_annualized > goal.final_eva_above,
        goal.cumulative_approved_npv_above is None
        or meta.cumulative_approved_npv > goal.cumulative_approved_npv_above,
        goal.interest_coverage_at_least is None
        or kpis.interest_coverage >= goal.interest_coverage_at_least,
        goal.max_emergency_overdrafts is None
        or meta.emergency_overdraft_count <= goal.max_emergency_overdrafts,
    ]
    return all(checks)


def _resolve_financing(
    financing_option: FinancingOption, funding_need: float
) -> tuple[float, float]:
    """Devuelve (new_debt, new_equity) para la necesidad de fondos de la carta."""
    if financing_option is FinancingOption.DEBT_50_CASH_50:
        return 0.5 * funding_need, 0.0
    if financing_option is FinancingOption.DEBT_100:
        return funding_need, 0.0
    if financing_option is FinancingOption.EQUITY_100:
        return 0.0, funding_need
    return 0.0, 0.0


def _select_card(
    scenario: ScenarioConfig,
    state: CompanyState,
    quarter: int,
    selected_project_id: str,
    financing_option: FinancingOption,
) -> ProjectCard:
    offered = {card.project_id: card for card in offered_cards(scenario, state, quarter)}
    card = offered.get(selected_project_id)
    if card is None:
        raise InvalidDecisionError(
            f"La carta '{selected_project_id}' no está disponible en el trimestre {quarter}."
        )
    if financing_option not in card.financing_options:
        catalog_options = PROJECT_CATALOG[selected_project_id].financing_options
        if financing_option is FinancingOption.DEBT_100 and financing_option in catalog_options:
            raise InvalidDecisionError(
                "DEBT_100 está bloqueado: la cobertura de intereses está en zona CCC (< 1.5x)."
            )
        raise InvalidDecisionError(
            f"La carta '{selected_project_id}' no admite el financiamiento {financing_option.value}."
        )
    return card


# --- Ciclo de simulación -----------------------------------------------------


def _zone_alerts(kpis: ValuationAndRiskKpis, balance: BalanceSheet) -> list[Alert]:
    alerts: list[Alert] = []
    if kpis.interest_coverage < CCC_COVERAGE_THRESHOLD:
        alerts.append(
            Alert(
                severity=AlertSeverity.WARNING,
                code="DEBT_100_BLOCKED",
                message=(
                    f"Cobertura de intereses de {kpis.interest_coverage:.2f}x (zona CCC): "
                    "el financiamiento DEBT_100 queda bloqueado el próximo turno."
                ),
            )
        )
    if balance.shareholders_equity <= 0:
        alerts.append(
            Alert(
                severity=AlertSeverity.CRITICAL,
                code="NEGATIVE_EQUITY",
                message="El patrimonio neto es nulo o negativo: la empresa está técnicamente quebrada.",
            )
        )
    return alerts


def init_simulation(
    scenario_id: ScenarioId, scenario: ScenarioConfig | None = None
) -> EngineResult:
    """Estado de apertura (trimestre 0) con el run-rate pro-forma del escenario."""
    config = scenario if scenario is not None else get_scenario(scenario_id)

    macro = MacroEnvironment(
        risk_free_rate=config.risk_free_rate,
        market_risk_premium=config.market_risk_premium,
        corporate_tax_rate=config.corporate_tax_rate,
        demand_multiplier=1.0,
        cost_inflation_multiplier=1.0,
    )
    opening_assets = config.opening_cash + config.opening_nwc + config.opening_net_fixed_assets
    balance = build_balance_sheet(
        cash=config.opening_cash,
        working_capital_nwc=config.opening_nwc,
        net_fixed_assets=config.opening_net_fixed_assets,
        total_debt=config.opening_total_debt,
        shareholders_equity=opening_assets - config.opening_total_debt,
    )
    assert_balanced(balance)

    income = compute_income_statement(
        config, macro, [], config.opening_total_debt, config.opening_kd_pre_tax
    )
    capex = config.maintenance_capex_q
    fcff = compute_fcff(income.nopat, income.depreciation, capex, 0.0)
    cash_flow = CashFlowQ(
        nopat=income.nopat,
        depreciation=income.depreciation,
        capex=capex,
        delta_nwc=0.0,
        free_cash_flow_firm=fcff,
        new_debt=0.0,
        emergency_debt=0.0,
        debt_repaid=0.0,
        new_equity=0.0,
        dividends=0.0,
        net_change_in_cash=income.net_income + income.depreciation - capex,
    )
    kpis = compute_kpis(
        cash=balance.cash,
        working_capital_nwc=balance.working_capital_nwc,
        net_fixed_assets=balance.net_fixed_assets,
        total_debt=balance.total_debt,
        shareholders_equity=balance.shareholders_equity,
        ebitda_q=income.ebitda,
        ebit_q=income.ebit,
        nopat_q=income.nopat,
        interest_expense_q=income.interest_expense,
        risk_free_rate=macro.risk_free_rate,
        market_risk_premium=macro.market_risk_premium,
        corporate_tax_rate=macro.corporate_tax_rate,
        unlevered_beta=config.unlevered_beta,
    )
    meta = SimulationMeta(
        scenario_id=config.scenario_id,
        company_name=config.company_name,
        mode=config.mode,
        module_id=config.module_id,
        case_title=config.case_title,
        mission_objective=config.mission_objective,
        current_quarter=0,
        max_quarters=config.max_quarters,
        game_status=GameStatus.ACTIVE,
        consecutive_positive_eva_turns=0,
        debt_100_blocked=kpis.interest_coverage < CCC_COVERAGE_THRESHOLD,
        emergency_overdraft_count=0,
        cumulative_approved_npv=0.0,
        cumulative_fcff=0.0,
    )
    state = CompanyState(
        meta=meta,
        macro_environment=macro,
        income_statement_q=income,
        balance_sheet=balance,
        cash_flow_q=cash_flow,
        valuation_and_risk_kpis=kpis,
        active_projects=[],
        history_summary=[],
    )
    return EngineResult(
        state=state,
        waterfall=build_waterfall(
            ebit=income.ebit,
            operating_taxes=income.operating_taxes,
            depreciation=income.depreciation,
            capex=capex,
            delta_nwc=0.0,
        ),
        offered_projects=offered_cards(config, state, 1),
        applied_shock=None,
        upcoming_shock=scheduled_shock(config, 1),
        alerts=_zone_alerts(kpis, balance),
    )


def step_simulation(
    state: CompanyState,
    selected_project_id: str | None = None,
    financing_option: FinancingOption = FinancingOption.CASH_100,
    dividends: float = 0.0,
    scenario: ScenarioConfig | None = None,
) -> EngineResult:
    """Cierra un trimestre aplicando la decisión del jugador y devuelve el nuevo estado."""
    if state.meta.game_status is not GameStatus.ACTIVE:
        raise SimulationClosedError(
            f"La simulación ya finalizó con estado {state.meta.game_status.value}."
        )
    if dividends < 0:
        raise InvalidDecisionError("Los dividendos no pueden ser negativos.")

    config = scenario if scenario is not None else get_scenario(state.meta.scenario_id)
    quarter = state.meta.current_quarter + 1
    if quarter > config.max_quarters:
        raise SimulationClosedError("Se alcanzó el máximo de trimestres del escenario.")
    assert_balanced(state.balance_sheet)

    start_balance = state.balance_sheet
    start_kpis = state.valuation_and_risk_kpis

    card = (
        _select_card(config, state, quarter, selected_project_id, financing_option)
        if selected_project_id is not None
        else None
    )

    shock = scheduled_shock(config, quarter)
    macro = apply_macro_shock(state.macro_environment, shock)

    # Los intereses se devengan sobre la deuda y el costo de deuda de inicio del trimestre.
    income = compute_income_statement(
        config, macro, state.active_projects, start_balance.total_debt, start_kpis.kd_pre_tax
    )

    finishing_projects = [p for p in state.active_projects if p.remaining_quarters == 1]
    nwc_released = sum(p.nwc_required for p in finishing_projects if p.nwc_recovered_at_end)

    card_capex = card.capex if card is not None else 0.0
    card_nwc = card.nwc_required if card is not None else 0.0
    capex = config.maintenance_capex_q + card_capex
    delta_nwc = card_nwc - nwc_released
    fcff = compute_fcff(income.nopat, income.depreciation, capex, delta_nwc)

    debt_repaid = min(card.debt_repayment, start_balance.total_debt) if card is not None else 0.0
    funding_need = card_capex + max(0.0, card_nwc) + debt_repaid
    new_debt, new_equity = (
        _resolve_financing(financing_option, funding_need) if card is not None else (0.0, 0.0)
    )

    cash = (
        start_balance.cash
        + income.net_income
        + income.depreciation
        - capex
        - delta_nwc
        + new_debt
        - debt_repaid
        + new_equity
        - dividends
    )
    total_debt = start_balance.total_debt + new_debt - debt_repaid
    shareholders_equity = (
        start_balance.shareholders_equity + income.net_income + new_equity - dividends
    )
    net_fixed_assets = start_balance.net_fixed_assets + capex - income.depreciation
    working_capital_nwc = start_balance.working_capital_nwc + delta_nwc

    alerts: list[Alert] = []
    if shock is not None:
        alerts.append(
            Alert(
                severity=AlertSeverity.INFO,
                code="MACRO_SHOCK",
                message=f"{shock.title}: {shock.description}",
            )
        )

    interest_coverage = compute_interest_coverage(income.ebit, income.interest_expense)
    emergency_debt = 0.0
    insolvent = False
    if cash < 0:
        net_debt_to_ebitda = compute_net_debt_to_ebitda(total_debt, cash, income.ebitda)
        insolvent = (
            net_debt_to_ebitda > INSOLVENCY_NET_DEBT_TO_EBITDA
            or interest_coverage < INSOLVENCY_COVERAGE
        )
        if insolvent:
            alerts.append(
                Alert(
                    severity=AlertSeverity.CRITICAL,
                    code="INSOLVENCY",
                    message=(
                        f"Déficit de caja de {abs(cash):,.0f} sin capacidad crediticia "
                        f"(Deuda Neta/EBITDA {net_debt_to_ebitda:.2f}x, cobertura "
                        f"{interest_coverage:.2f}x): la empresa entra en insolvencia."
                    ),
                )
            )
        else:
            emergency_debt = abs(cash)
            total_debt += emergency_debt
            cash = 0.0
            alerts.append(
                Alert(
                    severity=AlertSeverity.CRITICAL,
                    code="EMERGENCY_OVERDRAFT",
                    message=(
                        f"Caja insuficiente: se tomó un sobregiro de emergencia por "
                        f"{emergency_debt:,.0f} para cubrir el déficit del trimestre."
                    ),
                )
            )

    balance = build_balance_sheet(
        cash=cash,
        working_capital_nwc=working_capital_nwc,
        net_fixed_assets=net_fixed_assets,
        total_debt=total_debt,
        shareholders_equity=shareholders_equity,
    )
    assert_balanced(balance)

    kpis = compute_kpis(
        cash=balance.cash,
        working_capital_nwc=balance.working_capital_nwc,
        net_fixed_assets=balance.net_fixed_assets,
        total_debt=balance.total_debt,
        shareholders_equity=balance.shareholders_equity,
        ebitda_q=income.ebitda,
        ebit_q=income.ebit,
        nopat_q=income.nopat,
        interest_expense_q=income.interest_expense,
        risk_free_rate=macro.risk_free_rate,
        market_risk_premium=macro.market_risk_premium,
        corporate_tax_rate=macro.corporate_tax_rate,
        unlevered_beta=start_kpis.unlevered_beta,
    )

    active_projects = [
        project.model_copy(update={"remaining_quarters": project.remaining_quarters - 1})
        for project in state.active_projects
        if project.remaining_quarters > 1
    ]
    for project in finishing_projects:
        alerts.append(
            Alert(
                severity=AlertSeverity.INFO,
                code="PROJECT_FINISHED",
                message=f"El proyecto '{project.name}' completó su vida útil.",
            )
        )
    if card is not None and card.category is not ProjectCategory.DEBT_REPAYMENT:
        active_projects.append(
            ActiveProject(
                project_id=card.project_id,
                name=card.name,
                category=card.category,
                capex=card.capex,
                nwc_required=card.nwc_required,
                nwc_recovered_at_end=card.nwc_recovered_at_end,
                ebitda_boost_q=card.ebitda_boost_q,
                ebitda_driver=card.ebitda_driver,
                depreciation_q=card.capex / card.duration_quarters,
                duration_quarters=card.duration_quarters,
                remaining_quarters=card.duration_quarters,
                start_quarter=quarter,
                financing_option=financing_option,
                projected_npv_at_approval=card.projected_npv or 0.0,
                projected_irr_at_approval=card.projected_irr,
            )
        )

    consecutive_positive_eva_turns = (
        state.meta.consecutive_positive_eva_turns + 1 if kpis.eva_annualized > 0 else 0
    )
    meta = state.meta.model_copy(
        update={
            "current_quarter": quarter,
            "consecutive_positive_eva_turns": consecutive_positive_eva_turns,
            "debt_100_blocked": kpis.interest_coverage < CCC_COVERAGE_THRESHOLD,
            "emergency_overdraft_count": (
                state.meta.emergency_overdraft_count + (1 if emergency_debt > 0 else 0)
            ),
            "cumulative_approved_npv": (
                state.meta.cumulative_approved_npv
                + (card.projected_npv or 0.0 if card is not None else 0.0)
            ),
            "cumulative_fcff": state.meta.cumulative_fcff + fcff,
        }
    )

    game_status, end_reason = _resolve_game_status(config, meta, balance, kpis, insolvent)
    meta = meta.model_copy(update={"game_status": game_status, "end_reason": end_reason})

    if game_status is GameStatus.ACTIVE:
        alerts.extend(_zone_alerts(kpis, balance))
    elif end_reason is EndReason.GOAL_ACHIEVED:
        alerts.append(
            Alert(
                severity=AlertSeverity.INFO,
                code="GOAL_ACHIEVED",
                message="Objetivo cumplido: la simulación finalizó con éxito.",
            )
        )
    elif end_reason is EndReason.OBJECTIVE_NOT_MET:
        alerts.append(
            Alert(
                severity=AlertSeverity.WARNING,
                code="OBJECTIVE_NOT_MET",
                message="Se agotaron los trimestres sin cumplir el objetivo del escenario.",
            )
        )

    cash_flow = CashFlowQ(
        nopat=income.nopat,
        depreciation=income.depreciation,
        capex=capex,
        delta_nwc=delta_nwc,
        free_cash_flow_firm=fcff,
        new_debt=new_debt,
        emergency_debt=emergency_debt,
        debt_repaid=debt_repaid,
        new_equity=new_equity,
        dividends=dividends,
        net_change_in_cash=balance.cash - start_balance.cash,
    )
    history_entry = HistoryEntry(
        quarter=quarter,
        selected_project_id=card.project_id if card is not None else None,
        financing_option=financing_option if card is not None else None,
        shock_id=shock.shock_id if shock is not None else None,
        revenue=income.revenue,
        ebitda=income.ebitda,
        net_income=income.net_income,
        free_cash_flow_firm=fcff,
        cash=balance.cash,
        total_debt=balance.total_debt,
        shareholders_equity=balance.shareholders_equity,
        interest_coverage=kpis.interest_coverage,
        credit_rating=kpis.credit_rating,
        wacc=kpis.wacc,
        roic_annualized=kpis.roic_annualized,
        eva_annualized=kpis.eva_annualized,
        emergency_debt=emergency_debt,
        game_status=game_status,
    )
    new_state = CompanyState(
        meta=meta,
        macro_environment=macro,
        income_statement_q=income,
        balance_sheet=balance,
        cash_flow_q=cash_flow,
        valuation_and_risk_kpis=kpis,
        active_projects=active_projects,
        history_summary=[*state.history_summary, history_entry],
    )

    still_active = game_status is GameStatus.ACTIVE
    return EngineResult(
        state=new_state,
        waterfall=build_waterfall(
            ebit=income.ebit,
            operating_taxes=income.operating_taxes,
            depreciation=income.depreciation,
            capex=capex,
            delta_nwc=delta_nwc,
        ),
        offered_projects=offered_cards(config, new_state, quarter + 1) if still_active else [],
        applied_shock=shock,
        upcoming_shock=scheduled_shock(config, quarter + 1) if still_active else None,
        alerts=alerts,
    )


def _resolve_game_status(
    config: ScenarioConfig,
    meta: SimulationMeta,
    balance: BalanceSheet,
    kpis: ValuationAndRiskKpis,
    insolvent: bool,
) -> tuple[GameStatus, EndReason | None]:
    if insolvent:
        return GameStatus.GAME_OVER, EndReason.INSOLVENCY

    last_quarter = meta.current_quarter >= config.max_quarters
    if config.mode is SimulationMode.FINAL_GAME:
        won = (
            meta.consecutive_positive_eva_turns >= WIN_CONSECUTIVE_EVA_TURNS
            and balance.cash > 0
            and kpis.interest_coverage > WIN_MIN_COVERAGE
        )
        if won:
            return GameStatus.WON, EndReason.GOAL_ACHIEVED
    elif last_quarter and is_goal_met(config.goal, meta, balance, kpis):
        return GameStatus.WON, EndReason.GOAL_ACHIEVED

    if last_quarter:
        return GameStatus.GAME_OVER, EndReason.OBJECTIVE_NOT_MET
    return GameStatus.ACTIVE, None
