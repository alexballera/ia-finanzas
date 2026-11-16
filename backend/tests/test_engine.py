import numpy_financial as npf
import pytest

import engine
from models import (
    AlertSeverity,
    CompanyState,
    CreditRating,
    EndReason,
    EngineResult,
    FinancingOption,
    GameStatus,
    ScenarioConfig,
    ScenarioId,
    SimulationMode,
    WaterfallKey,
    WaterfallKind,
)
from scenarios import MACRO_SHOCKS, PROJECT_CATALOG, SCENARIOS

Decision = tuple[str | None, FinancingOption]
SKIP: Decision = (None, FinancingOption.CASH_100)


def play(
    result: EngineResult,
    decisions: list[Decision],
    scenario: ScenarioConfig | None = None,
) -> list[EngineResult]:
    results = []
    for project_id, financing in decisions:
        result = engine.step_simulation(result.state, project_id, financing, scenario=scenario)
        results.append(result)
    return results


def assert_roll_forward(previous: CompanyState, current: CompanyState) -> None:
    """Verifica las ecuaciones de cierre de la Sección 2.C contra el estado anterior."""
    before, after = previous.balance_sheet, current.balance_sheet
    income, flows = current.income_statement_q, current.cash_flow_q
    new_debt = flows.new_debt + flows.emergency_debt

    assert after.net_fixed_assets == pytest.approx(
        before.net_fixed_assets + flows.capex - income.depreciation, abs=1e-6
    )
    assert after.working_capital_nwc == pytest.approx(
        before.working_capital_nwc + flows.delta_nwc, abs=1e-6
    )
    assert after.total_debt == pytest.approx(
        before.total_debt + new_debt - flows.debt_repaid, abs=1e-6
    )
    assert after.shareholders_equity == pytest.approx(
        before.shareholders_equity + income.net_income + flows.new_equity - flows.dividends,
        abs=1e-6,
    )
    assert after.cash == pytest.approx(
        before.cash
        + income.net_income
        + income.depreciation
        - flows.capex
        - flows.delta_nwc
        + new_debt
        - flows.debt_repaid
        + flows.new_equity
        - flows.dividends,
        abs=1e-6,
    )


# --- Balance General ---------------------------------------------------------


def test_balance_sheet_balances_across_mixed_financing_turns():
    state = engine.init_simulation(ScenarioId.FINAL_GAME).state
    decisions: list[tuple[str | None, FinancingOption, float]] = [
        ("P12_DIGITAL_PLATFORM", FinancingOption.EQUITY_100, 0.0),
        ("P01_AUTOMATION_LINE", FinancingOption.DEBT_100, 0.0),
        ("P02_EXPORT_EXPANSION", FinancingOption.CASH_100, 0.0),
        ("P09_ENERGY_EFFICIENCY", FinancingOption.DEBT_50_CASH_50, 0.0),
        ("P08_EQUITY_RECAPITALIZATION", FinancingOption.EQUITY_100, 0.0),
        ("P07_DEBT_PREPAYMENT", FinancingOption.DEBT_REPAY, 0.0),
        ("P06_NWC_OPTIMIZATION", FinancingOption.CASH_100, 150.0),
        (None, FinancingOption.CASH_100, 0.0),
    ]

    flows_by_quarter = {}
    for project_id, financing, dividends in decisions:
        result = engine.step_simulation(state, project_id, financing, dividends)
        balance = result.state.balance_sheet

        assert abs(engine.balance_gap(balance)) < 1e-4
        assert balance.total_assets == pytest.approx(balance.total_debt_and_equity, abs=1e-4)
        assert_roll_forward(state, result.state)

        state = result.state
        flows_by_quarter[state.meta.current_quarter] = state.cash_flow_q

    assert state.meta.game_status is GameStatus.ACTIVE
    assert flows_by_quarter[1].new_equity == pytest.approx(4000.0)
    assert flows_by_quarter[1].new_debt == 0.0
    assert flows_by_quarter[2].new_debt == pytest.approx(3000.0)
    assert flows_by_quarter[3].new_debt == 0.0 and flows_by_quarter[3].new_equity == 0.0
    assert flows_by_quarter[4].new_debt == pytest.approx(2000.0)
    assert flows_by_quarter[5].new_equity == pytest.approx(6000.0)
    assert flows_by_quarter[5].debt_repaid == pytest.approx(6000.0)
    assert flows_by_quarter[6].debt_repaid == pytest.approx(2000.0)
    assert flows_by_quarter[7].dividends == pytest.approx(150.0)


def test_step_rejects_state_whose_balance_does_not_balance():
    state = engine.init_simulation(ScenarioId.SIM_MOD_1).state
    tampered = state.model_copy(
        update={"balance_sheet": state.balance_sheet.model_copy(update={"cash": 999_999.0})}
    )

    with pytest.raises(engine.InvalidStateError):
        engine.step_simulation(tampered)


# --- Waterfall y FCFF --------------------------------------------------------


def test_waterfall_bars_sum_exactly_to_fcff():
    opening = engine.init_simulation(ScenarioId.SIM_MOD_1)
    results = [opening] + play(
        opening,
        [
            ("P02_EXPORT_EXPANSION", FinancingOption.DEBT_50_CASH_50),
            ("P06_NWC_OPTIMIZATION", FinancingOption.CASH_100),
            SKIP,
        ],
    )

    for result in results:
        income, flows = result.state.income_statement_q, result.state.cash_flow_q
        waterfall = result.waterfall

        assert [item.key for item in waterfall] == [
            WaterfallKey.EBIT,
            WaterfallKey.OPERATING_TAXES,
            WaterfallKey.NOPAT,
            WaterfallKey.DEPRECIATION,
            WaterfallKey.CAPEX,
            WaterfallKey.DELTA_NWC,
            WaterfallKey.FCFF,
        ]
        bars = sum(item.value for item in waterfall if item.kind is WaterfallKind.DELTA)
        assert bars == flows.free_cash_flow_firm
        assert waterfall[-1].value == flows.free_cash_flow_firm
        assert waterfall[2].value == pytest.approx(income.nopat, abs=1e-9)
        assert flows.free_cash_flow_firm == pytest.approx(
            income.nopat + income.depreciation - flows.capex - flows.delta_nwc, abs=1e-9
        )

    # Consumir NWC resta caja; liberarlo la suma.
    nwc_bars = [r.waterfall[5].value for r in results]
    assert nwc_bars[1] == pytest.approx(-1200.0)
    assert nwc_bars[2] == pytest.approx(1500.0)


# --- Hamada, rating sintético y WACC -----------------------------------------


def _kpis(total_debt: float, shareholders_equity: float, interest_expense_q: float):
    return engine.compute_kpis(
        cash=0.0,
        working_capital_nwc=2000.0,
        net_fixed_assets=8000.0,
        total_debt=total_debt,
        shareholders_equity=shareholders_equity,
        ebitda_q=400.0,
        ebit_q=300.0,
        nopat_q=210.0,
        interest_expense_q=interest_expense_q,
        risk_free_rate=0.04,
        market_risk_premium=0.06,
        corporate_tax_rate=0.30,
        unlevered_beta=1.0,
    )


def test_hamada_and_credit_spread_drive_wacc():
    base = _kpis(total_debt=4000.0, shareholders_equity=6000.0, interest_expense_q=50.0)

    assert base.d_to_e == pytest.approx(4000.0 / 6000.0)
    assert base.levered_beta == pytest.approx(1.0 * (1 + 0.7 * 4000.0 / 6000.0))
    assert base.ke == pytest.approx(0.04 + base.levered_beta * 0.06)
    assert base.interest_coverage == pytest.approx(6.0)
    assert base.credit_spread == 0.015
    assert base.kd_pre_tax == pytest.approx(0.055)
    assert base.kd_after_tax == pytest.approx(0.0385)
    assert base.wacc == pytest.approx(0.128 * 0.6 + 0.0385 * 0.4)
    assert base.roic_annualized == pytest.approx(210.0 * 4 / 10000.0)
    assert base.eva_annualized == pytest.approx((0.084 - base.wacc) * 10000.0)

    # Misma estructura de capital, peor cobertura: solo cambia el costo de la deuda.
    stressed = _kpis(total_debt=4000.0, shareholders_equity=6000.0, interest_expense_q=250.0)
    assert stressed.interest_coverage == pytest.approx(1.2)
    assert stressed.credit_rating is CreditRating.CCC
    assert stressed.levered_beta == pytest.approx(base.levered_beta)
    assert stressed.kd_pre_tax == pytest.approx(0.13)
    assert stressed.wacc == pytest.approx(0.128 * 0.6 + 0.13 * 0.7 * 0.4)
    assert stressed.wacc > base.wacc

    # Más apalancamiento con igual cobertura: Hamada sube la beta y el Ke.
    levered = _kpis(total_debt=6000.0, shareholders_equity=4000.0, interest_expense_q=50.0)
    assert levered.levered_beta == pytest.approx(1.0 * (1 + 0.7 * 1.5))
    assert levered.ke == pytest.approx(0.04 + 2.05 * 0.06)
    assert levered.wacc == pytest.approx(0.163 * 0.4 + 0.0385 * 0.6)


@pytest.mark.parametrize(
    ("coverage", "spread", "rating"),
    [
        (99.0, 0.015, CreditRating.AAA_A),
        (5.01, 0.015, CreditRating.AAA_A),
        (5.0, 0.030, CreditRating.BBB),
        (3.0, 0.030, CreditRating.BBB),
        (2.99, 0.055, CreditRating.BB),
        (1.5, 0.055, CreditRating.BB),
        (1.49, 0.090, CreditRating.CCC),
        (-2.0, 0.090, CreditRating.CCC),
    ],
)
def test_credit_spread_table(coverage, spread, rating):
    assert engine.credit_profile(coverage) == (spread, rating)


def test_interest_coverage_without_debt_is_capped():
    assert engine.compute_interest_coverage(500.0, 0.0) == 99.0


def test_risk_free_rate_shock_raises_wacc_and_flips_trap_card_npv():
    opening = engine.init_simulation(ScenarioId.SIM_MOD_2)
    mega_plant = next(c for c in opening.offered_projects if c.project_id == "P03_MEGA_PLANT")
    assert mega_plant.projected_npv > 0

    q1, q2 = play(opening, [SKIP, SKIP])

    assert q1.upcoming_shock == MACRO_SHOCKS["RF_HIKE"]
    assert q2.applied_shock == MACRO_SHOCKS["RF_HIKE"]
    assert q2.state.macro_environment.risk_free_rate == pytest.approx(0.07)
    assert q2.state.valuation_and_risk_kpis.wacc > q1.state.valuation_and_risk_kpis.wacc + 0.015

    repriced = engine.evaluate_card(
        PROJECT_CATALOG["P03_MEGA_PLANT"], q2.state.valuation_and_risk_kpis.wacc, 0.30
    )
    assert repriced.projected_npv < 0


# --- Cartas de proyecto ------------------------------------------------------


def test_card_npv_and_irr_use_quarterly_equivalent_rate():
    card = PROJECT_CATALOG["P02_EXPORT_EXPANSION"]
    wacc, tax = 0.10, 0.30

    evaluated = engine.evaluate_card(card, wacc, tax)

    depreciation = 2400.0 / 8
    operating_flow = (600.0 - depreciation) * (1 - tax) + depreciation
    rate_q = 1.10**0.25 - 1
    expected_npv = -(2400.0 + 1200.0) + sum(
        operating_flow / (1 + rate_q) ** t for t in range(1, 9)
    ) + 1200.0 / (1 + rate_q) ** 8
    assert evaluated.projected_npv == pytest.approx(expected_npv)

    flows = engine.project_incremental_cash_flows(card, tax)
    irr_q = (1 + evaluated.projected_irr) ** 0.25 - 1
    assert npf.npv(irr_q, flows) == pytest.approx(0.0, abs=1e-6)
    assert evaluated.projected_irr > wacc


def test_irr_is_omitted_for_non_conventional_flows():
    nwc_release = engine.evaluate_card(PROJECT_CATALOG["P06_NWC_OPTIMIZATION"], 0.10, 0.30)

    assert nwc_release.projected_npv > 0
    assert nwc_release.projected_irr is None


def test_active_project_lifecycle():
    config = SCENARIOS[ScenarioId.FINAL_GAME].model_copy(
        update={"mode": SimulationMode.PHASE_3, "shock_schedule": {}, "goal": None}
    )
    opening = engine.init_simulation(config.scenario_id, scenario=config)
    base_ebitda = opening.state.income_statement_q.ebitda
    base_depreciation = opening.state.income_statement_q.depreciation

    results = play(
        opening,
        [("P12_DIGITAL_PLATFORM", FinancingOption.EQUITY_100)] + [SKIP] * 11,
        scenario=config,
    )
    by_quarter = {r.state.meta.current_quarter: r.state for r in results}

    # Trimestre de aprobación: se desembolsa Capex y NWC, todavía sin EBITDA incremental.
    assert by_quarter[1].income_statement_q.ebitda == pytest.approx(base_ebitda)
    assert by_quarter[1].cash_flow_q.capex == pytest.approx(600.0 + 3500.0)
    assert by_quarter[1].cash_flow_q.delta_nwc == pytest.approx(500.0)
    assert by_quarter[1].active_projects[0].remaining_quarters == 10

    # Los 10 trimestres siguientes aportan EBITDA y depreciación capex / duración.
    for quarter in range(2, 12):
        income = by_quarter[quarter].income_statement_q
        assert income.ebitda == pytest.approx(base_ebitda + 620.0)
        assert income.depreciation == pytest.approx(base_depreciation + 350.0)

    # En el último trimestre operativo se recupera el NWC y el proyecto sale del estado.
    assert by_quarter[11].cash_flow_q.delta_nwc == pytest.approx(-500.0)
    assert by_quarter[11].active_projects == []
    assert by_quarter[12].income_statement_q.ebitda == pytest.approx(base_ebitda)
    assert by_quarter[12].income_statement_q.depreciation == pytest.approx(base_depreciation)
    assert by_quarter[12].balance_sheet.net_fixed_assets == pytest.approx(
        opening.state.balance_sheet.net_fixed_assets
    )


def test_card_not_in_current_deck_is_rejected():
    state = engine.init_simulation(ScenarioId.SIM_MOD_1).state

    with pytest.raises(engine.InvalidDecisionError):
        engine.step_simulation(state, "P03_MEGA_PLANT", FinancingOption.CASH_100)


# --- Reglas del juego --------------------------------------------------------


def test_debt_100_is_blocked_in_ccc_zone():
    opening = engine.init_simulation(ScenarioId.SIM_MOD_3)

    assert opening.state.valuation_and_risk_kpis.interest_coverage < 1.5
    assert opening.state.meta.debt_100_blocked is True
    assert all(
        FinancingOption.DEBT_100 not in card.financing_options
        for card in opening.offered_projects
    )
    with pytest.raises(engine.InvalidDecisionError, match="DEBT_100"):
        engine.step_simulation(opening.state, "P04_PREMIUM_LINE", FinancingOption.DEBT_100)


def test_final_game_is_won_after_three_consecutive_positive_eva_turns():
    config = SCENARIOS[ScenarioId.FINAL_GAME].model_copy(
        update={"base_opex_q": 1400.0, "shock_schedule": {}}
    )
    opening = engine.init_simulation(config.scenario_id, scenario=config)

    q1, q2, q3 = play(opening, [SKIP, SKIP, SKIP], scenario=config)

    for turn, result in enumerate((q1, q2), start=1):
        assert result.state.valuation_and_risk_kpis.eva_annualized > 0
        assert result.state.meta.consecutive_positive_eva_turns == turn
        assert result.state.meta.game_status is GameStatus.ACTIVE

    assert q3.state.meta.consecutive_positive_eva_turns == 3
    assert q3.state.balance_sheet.cash > 0
    assert q3.state.valuation_and_risk_kpis.interest_coverage > 2.5
    assert q3.state.meta.game_status is GameStatus.WON
    assert q3.state.meta.end_reason is EndReason.GOAL_ACHIEVED
    assert q3.offered_projects == []

    with pytest.raises(engine.SimulationClosedError):
        engine.step_simulation(q3.state, scenario=config)


def test_final_game_is_not_won_when_coverage_is_at_or_below_threshold():
    # EVA positivo y caja positiva, pero cobertura de 2.4x (BB): no alcanza para ganar.
    config = SCENARIOS[ScenarioId.FINAL_GAME].model_copy(
        update={
            "base_opex_q": 2000.0,
            "opening_total_debt": 20000.0,
            "opening_kd_pre_tax": 0.10,
            "shock_schedule": {},
        }
    )
    opening = engine.init_simulation(config.scenario_id, scenario=config)

    q3 = play(opening, [SKIP, SKIP, SKIP], scenario=config)[-1]

    assert q3.state.meta.consecutive_positive_eva_turns == 3
    assert q3.state.balance_sheet.cash > 0
    assert q3.state.valuation_and_risk_kpis.interest_coverage == pytest.approx(2.4)
    assert q3.state.meta.game_status is GameStatus.ACTIVE


def test_positive_eva_streak_resets_when_eva_turns_negative():
    config = SCENARIOS[ScenarioId.FINAL_GAME].model_copy(
        update={"base_opex_q": 2150.0, "shock_schedule": {2: "DEMAND_RECESSION"}}
    )
    opening = engine.init_simulation(config.scenario_id, scenario=config)

    q1, q2 = play(opening, [SKIP, SKIP], scenario=config)

    assert q1.state.valuation_and_risk_kpis.eva_annualized > 0
    assert q1.state.meta.consecutive_positive_eva_turns == 1
    assert q2.state.valuation_and_risk_kpis.eva_annualized < 0
    assert q2.state.meta.consecutive_positive_eva_turns == 0


def test_cash_deficit_with_high_leverage_triggers_game_over():
    opening = engine.init_simulation(ScenarioId.SIM_MOD_3)

    result = engine.step_simulation(
        opening.state, "P04_PREMIUM_LINE", FinancingOption.CASH_100
    )
    state = result.state

    assert state.balance_sheet.cash < 0
    assert state.valuation_and_risk_kpis.net_debt_to_ebitda > 4.0
    assert state.meta.game_status is GameStatus.GAME_OVER
    assert state.meta.end_reason is EndReason.INSOLVENCY
    assert state.cash_flow_q.emergency_debt == 0.0
    assert abs(engine.balance_gap(state.balance_sheet)) < 1e-4
    assert [a.code for a in result.alerts if a.severity is AlertSeverity.CRITICAL] == [
        "INSOLVENCY"
    ]


def test_cash_deficit_with_credit_capacity_takes_emergency_overdraft():
    opening = engine.init_simulation(ScenarioId.SIM_MOD_1)
    start = opening.state.balance_sheet

    result = engine.step_simulation(
        opening.state, "P02_EXPORT_EXPANSION", FinancingOption.CASH_100
    )
    state = result.state
    net_income = state.income_statement_q.net_income
    deficit = -(start.cash + net_income - 2400.0 - 1200.0)

    assert deficit > 0
    assert state.cash_flow_q.emergency_debt == pytest.approx(deficit)
    assert state.balance_sheet.cash == 0.0
    assert state.balance_sheet.total_debt == pytest.approx(start.total_debt + deficit)
    assert state.meta.game_status is GameStatus.ACTIVE
    assert state.meta.emergency_overdraft_count == 1
    assert abs(engine.balance_gap(state.balance_sheet)) < 1e-4
    assert any(
        a.code == "EMERGENCY_OVERDRAFT" and a.severity is AlertSeverity.CRITICAL
        for a in result.alerts
    )


# --- Escenarios --------------------------------------------------------------


@pytest.mark.parametrize("scenario_id", list(ScenarioId))
def test_opening_state_is_balanced_and_self_consistent(scenario_id):
    config = SCENARIOS[scenario_id]
    result = engine.init_simulation(scenario_id)
    state = result.state

    assert abs(engine.balance_gap(state.balance_sheet)) < 1e-4
    assert state.meta.game_status is GameStatus.ACTIVE
    assert state.meta.max_quarters == config.max_quarters
    # El costo de deuda de apertura debe coincidir con el rating que implica su cobertura.
    assert state.valuation_and_risk_kpis.kd_pre_tax == pytest.approx(config.opening_kd_pre_tax)
    assert len(result.offered_projects) >= 3
    assert all(card.projected_npv is not None for card in result.offered_projects)


@pytest.mark.parametrize("scenario_id", list(ScenarioId))
def test_scenario_references_existing_cards_and_shocks(scenario_id):
    config = SCENARIOS[scenario_id]

    assert set(config.deck) == set(range(1, config.max_quarters + 1))
    assert {pid for ids in config.deck.values() for pid in ids} <= set(PROJECT_CATALOG)
    assert set(config.shock_schedule.values()) <= set(MACRO_SHOCKS)
    assert all(1 <= quarter <= config.max_quarters for quarter in config.shock_schedule)


def test_inherited_and_final_game_companies_start_destroying_value():
    textil = engine.init_simulation(ScenarioId.SIM_MOD_3).state.valuation_and_risk_kpis
    andes = engine.init_simulation(ScenarioId.FINAL_GAME).state.valuation_and_risk_kpis

    assert textil.credit_rating is CreditRating.CCC
    assert textil.d_to_e > 3.0
    assert textil.eva_annualized < 0
    assert andes.eva_annualized < 0


@pytest.mark.parametrize(
    ("scenario_id", "winning_decisions"),
    [
        (
            ScenarioId.SIM_MOD_1,
            [
                ("P02_EXPORT_EXPANSION", FinancingOption.DEBT_50_CASH_50),
                ("P05_ERP_DIGITAL", FinancingOption.CASH_100),
                SKIP,
            ],
        ),
        (
            ScenarioId.SIM_MOD_2,
            [
                ("P09_ENERGY_EFFICIENCY", FinancingOption.EQUITY_100),
                ("P08_EQUITY_RECAPITALIZATION", FinancingOption.EQUITY_100),
                SKIP,
            ],
        ),
        (
            ScenarioId.SIM_MOD_3,
            [
                ("P08_EQUITY_RECAPITALIZATION", FinancingOption.EQUITY_100),
                ("P05_ERP_DIGITAL", FinancingOption.CASH_100),
                SKIP,
            ],
        ),
    ],
)
def test_module_scenarios_are_won_by_sound_decisions_and_lost_by_inaction(
    scenario_id, winning_decisions
):
    opening = engine.init_simulation(scenario_id)

    won = play(opening, winning_decisions)[-1].state
    idle = play(opening, [SKIP, SKIP, SKIP])[-1].state

    assert won.meta.game_status is GameStatus.WON
    assert won.meta.end_reason is EndReason.GOAL_ACHIEVED
    assert idle.meta.game_status is GameStatus.GAME_OVER
    assert idle.meta.end_reason is EndReason.OBJECTIVE_NOT_MET


def test_final_game_is_winnable_within_twelve_quarters():
    opening = engine.init_simulation(ScenarioId.FINAL_GAME)

    results = play(
        opening,
        [
            ("P12_DIGITAL_PLATFORM", FinancingOption.EQUITY_100),
            ("P01_AUTOMATION_LINE", FinancingOption.DEBT_50_CASH_50),
            ("P02_EXPORT_EXPANSION", FinancingOption.DEBT_50_CASH_50),
            ("P09_ENERGY_EFFICIENCY", FinancingOption.CASH_100),
            ("P11_FLEET_RENEWAL", FinancingOption.CASH_100),
            SKIP,
            ("P05_ERP_DIGITAL", FinancingOption.DEBT_50_CASH_50),
            SKIP,
            SKIP,
        ],
    )

    assert [r.state.meta.game_status for r in results[:-1]] == [GameStatus.ACTIVE] * 8
    assert results[-1].state.meta.current_quarter == 9
    assert results[-1].state.meta.game_status is GameStatus.WON


def test_final_game_ends_without_victory_when_nothing_is_done():
    result = engine.init_simulation(ScenarioId.FINAL_GAME)
    while result.state.meta.game_status is GameStatus.ACTIVE:
        result = engine.step_simulation(result.state)

    assert result.state.meta.current_quarter == 12
    assert result.state.meta.game_status is GameStatus.GAME_OVER
    assert result.state.meta.end_reason is EndReason.OBJECTIVE_NOT_MET
