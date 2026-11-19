"""Escenarios deterministas, catálogo de cartas de proyecto y shocks macro.

Solo contiene datos: los cálculos (VAN, TIR, KPIs) pertenecen a engine.py.
Los montos están en miles de USD y los flujos operativos son trimestrales.
"""

from __future__ import annotations

from models import (
    EbitdaDriver,
    FinancingOption,
    MacroShock,
    ProjectCard,
    ProjectCategory,
    ScenarioConfig,
    ScenarioGoal,
    ScenarioId,
    SimulationMode,
)

_INVESTMENT_FINANCING = [
    FinancingOption.CASH_100,
    FinancingOption.DEBT_50_CASH_50,
    FinancingOption.DEBT_100,
    FinancingOption.EQUITY_100,
]

_PROJECT_CARDS = [
    # --- Cartas que crean valor ---
    ProjectCard(
        project_id="P01_AUTOMATION_LINE",
        name="Automatización de línea de producción",
        description=(
            "Robotiza la línea principal y reduce mermas y horas extra. "
            "Ahorro operativo estable sin inmovilizar capital de trabajo."
        ),
        category=ProjectCategory.EFFICIENCY_CAPEX,
        capex=3000.0,
        nwc_required=0.0,
        nwc_recovered_at_end=False,
        duration_quarters=8,
        ebitda_boost_q=520.0,
        ebitda_driver=EbitdaDriver.COST_SAVING,
        financing_options=_INVESTMENT_FINANCING,
    ),
    ProjectCard(
        project_id="P02_EXPORT_EXPANSION",
        name="Expansión a mercados de exportación",
        description=(
            "Abre un canal de exportación regional. Buen margen incremental, "
            "pero exige financiar inventarios y cuentas por cobrar adicionales."
        ),
        category=ProjectCategory.GROWTH_CAPEX,
        capex=2400.0,
        nwc_required=1200.0,
        nwc_recovered_at_end=True,
        duration_quarters=8,
        ebitda_boost_q=600.0,
        ebitda_driver=EbitdaDriver.REVENUE,
        financing_options=_INVESTMENT_FINANCING,
    ),
    ProjectCard(
        project_id="P05_ERP_DIGITAL",
        name="Transformación digital (ERP y analítica)",
        description=(
            "Unifica sistemas de gestión y automatiza procesos administrativos. "
            "Inversión pequeña con repago rápido."
        ),
        category=ProjectCategory.EFFICIENCY_CAPEX,
        capex=1200.0,
        nwc_required=0.0,
        nwc_recovered_at_end=False,
        duration_quarters=6,
        ebitda_boost_q=290.0,
        ebitda_driver=EbitdaDriver.COST_SAVING,
        financing_options=_INVESTMENT_FINANCING,
    ),
    ProjectCard(
        project_id="P09_ENERGY_EFFICIENCY",
        name="Eficiencia energética y cogeneración",
        description=(
            "Instala cogeneración y recuperación de calor. Ahorro de largo plazo "
            "poco sensible al ciclo de demanda."
        ),
        category=ProjectCategory.EFFICIENCY_CAPEX,
        capex=4000.0,
        nwc_required=0.0,
        nwc_recovered_at_end=False,
        duration_quarters=12,
        ebitda_boost_q=520.0,
        ebitda_driver=EbitdaDriver.COST_SAVING,
        financing_options=_INVESTMENT_FINANCING,
    ),
    ProjectCard(
        project_id="P11_FLEET_RENEWAL",
        name="Renovación de flota logística",
        description=(
            "Reemplaza unidades obsoletas y baja costos de mantenimiento y combustible."
        ),
        category=ProjectCategory.EFFICIENCY_CAPEX,
        capex=1800.0,
        nwc_required=0.0,
        nwc_recovered_at_end=False,
        duration_quarters=8,
        ebitda_boost_q=330.0,
        ebitda_driver=EbitdaDriver.COST_SAVING,
        financing_options=_INVESTMENT_FINANCING,
    ),
    ProjectCard(
        project_id="P12_DIGITAL_PLATFORM",
        name="Plataforma digital de servicios recurrentes",
        description=(
            "Desarrolla una plataforma por suscripción con ingresos recurrentes "
            "y bajo requerimiento de capital de trabajo."
        ),
        category=ProjectCategory.GROWTH_CAPEX,
        capex=3500.0,
        nwc_required=500.0,
        nwc_recovered_at_end=True,
        duration_quarters=10,
        ebitda_boost_q=620.0,
        ebitda_driver=EbitdaDriver.REVENUE,
        financing_options=_INVESTMENT_FINANCING,
    ),
    ProjectCard(
        project_id="P13_MA_SYNERGY",
        name="Adquisición de Logística Norte con sinergias",
        description=(
            "Adquiere un operador regional a precio disciplinado; la integración aporta "
            "sinergias de distribución recurrentes superiores a la inversión."
        ),
        category=ProjectCategory.GROWTH_CAPEX,
        capex=1800.0,
        nwc_required=0.0,
        nwc_recovered_at_end=False,
        duration_quarters=8,
        ebitda_boost_q=420.0,
        ebitda_driver=EbitdaDriver.COST_SAVING,
        financing_options=_INVESTMENT_FINANCING,
    ),
    ProjectCard(
        project_id="P14_MA_OVERPRICE",
        name="Adquisición sobrevaluada: prima sin sinergias",
        description=(
            "Compra una compañía con EBITDA llamativo, pero el precio y el capital de trabajo "
            "exigidos exceden el valor presente de los beneficios incrementales."
        ),
        category=ProjectCategory.GROWTH_CAPEX,
        capex=12000.0,
        nwc_required=1000.0,
        nwc_recovered_at_end=True,
        duration_quarters=6,
        ebitda_boost_q=1000.0,
        ebitda_driver=EbitdaDriver.REVENUE,
        financing_options=_INVESTMENT_FINANCING,
    ),
    ProjectCard(
        project_id="P15_MA_PLATFORM_SYNERGY",
        name="Integración de plataforma y compras",
        description=(
            "Integra proveedores, tecnología y rutas de un objetivo complementario para "
            "capturar ahorros operativos verificables sin prima de control excesiva."
        ),
        category=ProjectCategory.EFFICIENCY_CAPEX,
        capex=2600.0,
        nwc_required=200.0,
        nwc_recovered_at_end=True,
        duration_quarters=8,
        ebitda_boost_q=520.0,
        ebitda_driver=EbitdaDriver.COST_SAVING,
        financing_options=_INVESTMENT_FINANCING,
    ),
    ProjectCard(
        project_id="P16_RATE_RESILIENT_LINE",
        name="Modernización eficiente ante tasas volátiles",
        description=(
            "Moderniza equipos con ahorro operativo medible y baja necesidad de capital "
            "de trabajo para preservar el retorno frente a subas de tasas."
        ),
        category=ProjectCategory.EFFICIENCY_CAPEX,
        capex=2000.0,
        nwc_required=0.0,
        nwc_recovered_at_end=False,
        duration_quarters=8,
        ebitda_boost_q=650.0,
        ebitda_driver=EbitdaDriver.COST_SAVING,
        financing_options=_INVESTMENT_FINANCING,
    ),
    ProjectCard(
        project_id="P17_NWC_CYCLE_RELEASE",
        name="Liberación estructural del ciclo de caja",
        description=(
            "Reduce inventarios y días de cobranza con una inversión operativa acotada; "
            "libera NWC de forma permanente, sin consumir caja con dividendos."
        ),
        category=ProjectCategory.NWC_OPTIMIZATION,
        capex=100.0,
        nwc_required=-1000.0,
        nwc_recovered_at_end=False,
        duration_quarters=4,
        ebitda_boost_q=-15.0,
        ebitda_driver=EbitdaDriver.COST_SAVING,
        financing_options=[FinancingOption.CASH_100],
    ),
    # --- Trampas: EBITDA atractivo, valor dudoso ---
    ProjectCard(
        project_id="P03_MEGA_PLANT",
        name="Megaproyecto: nueva planta industrial",
        description=(
            "Duplica la capacidad instalada y aporta el mayor EBITDA del mazo. "
            "Su retorno apenas supera el costo de capital: una suba del WACC lo vuelve destructor de valor."
        ),
        category=ProjectCategory.GROWTH_CAPEX,
        capex=9000.0,
        nwc_required=1500.0,
        nwc_recovered_at_end=True,
        duration_quarters=12,
        ebitda_boost_q=960.0,
        ebitda_driver=EbitdaDriver.REVENUE,
        financing_options=_INVESTMENT_FINANCING,
    ),
    ProjectCard(
        project_id="P04_PREMIUM_LINE",
        name="Lanzamiento de línea premium",
        description=(
            "Nueva línea con plazos de cobro largos y alto stock de seguridad. "
            "Suma EBITDA, pero inmoviliza mucho capital de trabajo."
        ),
        category=ProjectCategory.GROWTH_CAPEX,
        capex=2000.0,
        nwc_required=3500.0,
        nwc_recovered_at_end=True,
        duration_quarters=6,
        ebitda_boost_q=480.0,
        ebitda_driver=EbitdaDriver.REVENUE,
        financing_options=_INVESTMENT_FINANCING,
    ),
    ProjectCard(
        project_id="P10_REGIONAL_ACQUISITION",
        name="Adquisición de competidor regional",
        description=(
            "Compra con prima de control que agranda la empresa y el EBITDA consolidado, "
            "pero rinde por debajo del costo de capital."
        ),
        category=ProjectCategory.GROWTH_CAPEX,
        capex=6000.0,
        nwc_required=800.0,
        nwc_recovered_at_end=True,
        duration_quarters=10,
        ebitda_boost_q=700.0,
        ebitda_driver=EbitdaDriver.REVENUE,
        financing_options=_INVESTMENT_FINANCING,
    ),
    # --- Opciones defensivas ---
    ProjectCard(
        project_id="P06_NWC_OPTIMIZATION",
        name="Optimización de capital de trabajo",
        description=(
            "Acelera cobranzas, reduce inventarios y renegocia plazos con proveedores. "
            "Libera caja de forma permanente a cambio de descuentos por pronto pago."
        ),
        category=ProjectCategory.NWC_OPTIMIZATION,
        capex=150.0,
        nwc_required=-1500.0,
        nwc_recovered_at_end=False,
        duration_quarters=4,
        ebitda_boost_q=-25.0,
        ebitda_driver=EbitdaDriver.COST_SAVING,
        financing_options=[FinancingOption.CASH_100],
    ),
    ProjectCard(
        project_id="P07_DEBT_PREPAYMENT",
        name="Precancelación de deuda con caja",
        description=(
            "Usa caja excedente para cancelar deuda financiera. Baja los intereses "
            "y mejora la cobertura del próximo trimestre."
        ),
        category=ProjectCategory.DEBT_REPAYMENT,
        capex=0.0,
        nwc_required=0.0,
        nwc_recovered_at_end=False,
        duration_quarters=1,
        ebitda_boost_q=0.0,
        ebitda_driver=EbitdaDriver.COST_SAVING,
        debt_repayment=2000.0,
        financing_options=[FinancingOption.DEBT_REPAY],
        repeatable=True,
    ),
    ProjectCard(
        project_id="P08_EQUITY_RECAPITALIZATION",
        name="Recapitalización: emisión de acciones para cancelar deuda",
        description=(
            "Los accionistas aportan capital para rescatar deuda. Desapalanca el balance "
            "sin tocar la caja, a costa de diluir el retorno del capital propio."
        ),
        category=ProjectCategory.DEBT_REPAYMENT,
        capex=0.0,
        nwc_required=0.0,
        nwc_recovered_at_end=False,
        duration_quarters=1,
        ebitda_boost_q=0.0,
        ebitda_driver=EbitdaDriver.COST_SAVING,
        debt_repayment=6000.0,
        financing_options=[FinancingOption.EQUITY_100],
    ),
]

PROJECT_CATALOG: dict[str, ProjectCard] = {card.project_id: card for card in _PROJECT_CARDS}

_MACRO_SHOCKS = [
    MacroShock(
        shock_id="RF_HIKE",
        title="Suba de la tasa libre de riesgo",
        description=(
            "El banco central endurece la política monetaria: la tasa libre de riesgo "
            "sube 250 puntos básicos y encarece tanto el capital propio como la deuda."
        ),
        risk_free_rate_delta=0.025,
    ),
    MacroShock(
        shock_id="RF_CUT",
        title="Flexibilización monetaria",
        description="La inflación cede y la tasa libre de riesgo baja 100 puntos básicos.",
        risk_free_rate_delta=-0.010,
    ),
    MacroShock(
        shock_id="DEMAND_RECESSION",
        title="Recesión de demanda",
        description="El consumo se contrae y el volumen de ventas cae 6%.",
        demand_multiplier=0.94,
    ),
    MacroShock(
        shock_id="DEMAND_RECOVERY",
        title="Recuperación de la demanda",
        description="La actividad repunta y el volumen de ventas crece 5%.",
        demand_multiplier=1.05,
    ),
    MacroShock(
        shock_id="COST_INFLATION",
        title="Inflación de costos",
        description="Suben insumos, energía y salarios: la base de costos aumenta 3%.",
        cost_inflation_multiplier=1.03,
    ),
    MacroShock(
        shock_id="SOVEREIGN_STRESS",
        title="Estrés soberano",
        description=(
            "Sube el riesgo país: la tasa libre de riesgo aumenta 150 puntos básicos "
            "y la demanda interna cae 3%."
        ),
        demand_multiplier=0.97,
        risk_free_rate_delta=0.015,
    ),
]

MACRO_SHOCKS: dict[str, MacroShock] = {shock.shock_id: shock for shock in _MACRO_SHOCKS}

_SCENARIO_CONFIGS = [
    ScenarioConfig(
        scenario_id=ScenarioId.SIM_MOD_1,
        company_name="Metalúrgica Austral S.A.",
        mode=SimulationMode.PHASE_3,
        module_id=1,
        case_title="Expansión Industrial bajo Restricción de Capital",
        mission_objective=(
            "Durante 3 trimestres se deben seleccionar proyectos de Capex evaluando su VAN, "
            "su TIR y su consumo de Capital de Trabajo, sin que la caja caiga por debajo de cero."
        ),
        max_quarters=3,
        risk_free_rate=0.045,
        market_risk_premium=0.06,
        corporate_tax_rate=0.30,
        unlevered_beta=0.95,
        opening_kd_pre_tax=0.060,
        base_revenue_q=12000.0,
        base_cogs_q=7800.0,
        base_opex_q=2200.0,
        base_depreciation_q=500.0,
        maintenance_capex_q=500.0,
        opening_cash=1500.0,
        opening_nwc=4000.0,
        opening_net_fixed_assets=16000.0,
        opening_total_debt=6000.0,
        deck={
            1: ["P01_AUTOMATION_LINE", "P02_EXPORT_EXPANSION", "P04_PREMIUM_LINE"],
            2: ["P05_ERP_DIGITAL", "P10_REGIONAL_ACQUISITION", "P06_NWC_OPTIMIZATION"],
            3: ["P11_FLEET_RENEWAL", "P03_MEGA_PLANT", "P07_DEBT_PREPAYMENT"],
        },
        goal=ScenarioGoal(
            description=(
                "Cerrar el trimestre 3 con VAN agregado positivo en la cartera aprobada, "
                "caja positiva y sin haber recurrido a sobregiros de emergencia."
            ),
            final_cash_above=0.0,
            cumulative_approved_npv_above=0.0,
            max_emergency_overdrafts=0,
        ),
    ),
    ScenarioConfig(
        scenario_id=ScenarioId.SIM_MOD_2,
        company_name="Energía Pampeana S.A.",
        mode=SimulationMode.PHASE_3,
        module_id=2,
        case_title="Costo de Capital bajo Shock de Tasas",
        mission_objective=(
            "Una suba de la tasa libre de riesgo encarece el capital en el trimestre 2. "
            "Se debe ajustar la estructura de capital y la cartera de proyectos para sostener "
            "la creación de valor y la calificación crediticia."
        ),
        max_quarters=3,
        risk_free_rate=0.045,
        market_risk_premium=0.06,
        corporate_tax_rate=0.30,
        unlevered_beta=0.60,
        opening_kd_pre_tax=0.075,
        base_revenue_q=20000.0,
        base_cogs_q=12200.0,
        base_opex_q=3400.0,
        base_depreciation_q=2000.0,
        maintenance_capex_q=2000.0,
        opening_cash=2500.0,
        opening_nwc=3500.0,
        opening_net_fixed_assets=60000.0,
        opening_total_debt=37000.0,
        deck={
            1: ["P09_ENERGY_EFFICIENCY", "P03_MEGA_PLANT", "P07_DEBT_PREPAYMENT"],
            2: ["P05_ERP_DIGITAL", "P10_REGIONAL_ACQUISITION", "P08_EQUITY_RECAPITALIZATION"],
            3: ["P11_FLEET_RENEWAL", "P04_PREMIUM_LINE", "P07_DEBT_PREPAYMENT"],
        },
        shock_schedule={2: "RF_HIKE"},
        goal=ScenarioGoal(
            description=(
                "Cerrar el trimestre 3 con EVA positivo, caja positiva y cobertura de "
                "intereses de al menos 3.0x (calificación BBB o superior) pese al shock de tasas."
            ),
            final_cash_above=0.0,
            final_eva_above=0.0,
            interest_coverage_at_least=3.0,
        ),
    ),
    ScenarioConfig(
        scenario_id=ScenarioId.SIM_MOD_3,
        company_name="Textil Cordillerana S.A.",
        mode=SimulationMode.PHASE_3,
        module_id=3,
        case_title="Reestructuración de Capital y Rescate del EVA",
        mission_objective=(
            "Compañía heredada con EBITDA positivo pero altamente endeudada, cobertura de intereses "
            "en zona de estrés y EVA negativo (ROIC < WACC). En 3 trimestres se debe recomponer la "
            "solvencia, optimizar el Capital Invertido y lograr un EVA positivo sostenible."
        ),
        max_quarters=3,
        risk_free_rate=0.045,
        market_risk_premium=0.06,
        corporate_tax_rate=0.30,
        unlevered_beta=0.90,
        opening_kd_pre_tax=0.135,
        base_revenue_q=9000.0,
        base_cogs_q=6300.0,
        base_opex_q=1600.0,
        base_depreciation_q=400.0,
        maintenance_capex_q=400.0,
        opening_cash=600.0,
        opening_nwc=5400.0,
        opening_net_fixed_assets=12000.0,
        opening_total_debt=15000.0,
        deck={
            1: ["P08_EQUITY_RECAPITALIZATION", "P06_NWC_OPTIMIZATION", "P04_PREMIUM_LINE"],
            2: ["P07_DEBT_PREPAYMENT", "P05_ERP_DIGITAL", "P10_REGIONAL_ACQUISITION"],
            3: ["P07_DEBT_PREPAYMENT", "P11_FLEET_RENEWAL", "P01_AUTOMATION_LINE"],
        },
        goal=ScenarioGoal(
            description=(
                "Cerrar el trimestre 3 con EVA positivo, caja positiva y cobertura de "
                "intereses de al menos 2.5x."
            ),
            final_cash_above=0.0,
            final_eva_above=0.0,
            interest_coverage_at_least=2.5,
        ),
    ),
    ScenarioConfig(
        scenario_id=ScenarioId.SIM_MOD_4,
        company_name="Lácteos del Litoral S.A.",
        mode=SimulationMode.PHASE_3,
        module_id=4,
        case_title="Valuación y financiamiento ante volatilidad de tasas",
        mission_objective=(
            "Enfrentá una suba de la tasa libre de riesgo, valuá cada inversión al WACC vigente "
            "y financiá proyectos sin sobregiros. Cerrá con EVA positivo y cobertura de "
            "intereses de al menos 3.0x."
        ),
        max_quarters=3,
        risk_free_rate=0.045,
        market_risk_premium=0.065,
        corporate_tax_rate=0.30,
        unlevered_beta=0.85,
        opening_kd_pre_tax=0.075,
        base_revenue_q=14000.0,
        base_cogs_q=9500.0,
        base_opex_q=3000.0,
        base_depreciation_q=600.0,
        maintenance_capex_q=500.0,
        opening_cash=1800.0,
        opening_nwc=4000.0,
        opening_net_fixed_assets=24000.0,
        opening_total_debt=10000.0,
        deck={
            1: ["P16_RATE_RESILIENT_LINE", "P03_MEGA_PLANT", "P09_ENERGY_EFFICIENCY"],
            2: ["P05_ERP_DIGITAL", "P10_REGIONAL_ACQUISITION", "P07_DEBT_PREPAYMENT"],
            3: ["P11_FLEET_RENEWAL", "P14_MA_OVERPRICE", "P06_NWC_OPTIMIZATION"],
        },
        shock_schedule={2: "RF_HIKE"},
        goal=ScenarioGoal(
            description=(
                "Cerrar con EVA anualizado positivo, cobertura de intereses de al menos 3.0x "
                "y cero sobregiros de emergencia."
            ),
            final_cash_above=0.0,
            final_eva_above=0.0,
            interest_coverage_at_least=3.0,
            max_emergency_overdrafts=0,
        ),
    ),
    ScenarioConfig(
        scenario_id=ScenarioId.SIM_MOD_5,
        company_name="Distribuidora del Centro S.A.",
        mode=SimulationMode.PHASE_3,
        module_id=5,
        case_title="Liberación de NWC y política sostenible de dividendos",
        mission_objective=(
            "Liberá capital atrapado en el ciclo de caja y distribuí dividendos discretos "
            "solo cuando sean sostenibles. La meta exige dividendos acumulados positivos, "
            "EVA positivo, cobertura de al menos 2.5x y ningún sobregiro."
        ),
        max_quarters=3,
        risk_free_rate=0.04,
        market_risk_premium=0.06,
        corporate_tax_rate=0.30,
        unlevered_beta=0.75,
        opening_kd_pre_tax=0.055,
        base_revenue_q=16000.0,
        base_cogs_q=10000.0,
        base_opex_q=2600.0,
        base_depreciation_q=450.0,
        maintenance_capex_q=400.0,
        opening_cash=1200.0,
        opening_nwc=7000.0,
        opening_net_fixed_assets=15000.0,
        opening_total_debt=6000.0,
        deck={
            1: ["P17_NWC_CYCLE_RELEASE", "P06_NWC_OPTIMIZATION", "P04_PREMIUM_LINE"],
            2: ["P05_ERP_DIGITAL", "P02_EXPORT_EXPANSION", "P07_DEBT_PREPAYMENT"],
            3: ["P11_FLEET_RENEWAL", "P14_MA_OVERPRICE", "P03_MEGA_PLANT"],
        },
        shock_schedule={2: "COST_INFLATION"},
        goal=ScenarioGoal(
            description=(
                "Cerrar con EVA positivo y cobertura de al menos 2.5x, habiendo repartido "
                "dividendos acumulados positivos y sin sobregiros."
            ),
            final_cash_above=0.0,
            final_eva_above=0.0,
            interest_coverage_at_least=2.5,
            cumulative_dividends_above=0.0,
            max_emergency_overdrafts=0,
        ),
    ),
    ScenarioConfig(
        scenario_id=ScenarioId.SIM_MOD_6,
        company_name="Grupo Andino S.A.",
        mode=SimulationMode.PHASE_3,
        module_id=6,
        case_title="M&A: sinergias verificables frente a primas de control",
        mission_objective=(
            "Evaluá adquisiciones por VAN y sinergias, no por el EBITDA consolidado ni por "
            "la acreción contable de EPS. La meta es crear VAN agregado y cerrar con EVA "
            "positivo sin insolvencia."
        ),
        max_quarters=3,
        risk_free_rate=0.045,
        market_risk_premium=0.06,
        corporate_tax_rate=0.30,
        unlevered_beta=1.0,
        opening_kd_pre_tax=0.075,
        base_revenue_q=14500.0,
        base_cogs_q=9800.0,
        base_opex_q=3150.0,
        base_depreciation_q=650.0,
        maintenance_capex_q=500.0,
        opening_cash=1800.0,
        opening_nwc=5000.0,
        opening_net_fixed_assets=25000.0,
        opening_total_debt=12000.0,
        deck={
            1: ["P13_MA_SYNERGY", "P14_MA_OVERPRICE", "P10_REGIONAL_ACQUISITION"],
            2: ["P15_MA_PLATFORM_SYNERGY", "P03_MEGA_PLANT", "P07_DEBT_PREPAYMENT"],
            3: ["P05_ERP_DIGITAL", "P14_MA_OVERPRICE", "P11_FLEET_RENEWAL"],
        },
        goal=ScenarioGoal(
            description=(
                "Cerrar con VAN agregado de inversiones positivo, EVA anualizado positivo, "
                "sin insolvencia."
            ),
            final_eva_above=0.0,
            cumulative_approved_npv_above=0.0,
        ),
    ),
    ScenarioConfig(
        scenario_id=ScenarioId.FINAL_GAME,
        company_name="Andes Tech S.A.",
        mode=SimulationMode.FINAL_GAME,
        module_id=None,
        case_title="Cashflow Corporativo: salir de la carrera de la rata operativa",
        mission_objective=(
            "Como CFO se dispone de hasta 12 trimestres para lograr 3 trimestres consecutivos de "
            "EVA positivo con caja positiva y cobertura de intereses superior a 2.5x."
        ),
        max_quarters=12,
        risk_free_rate=0.045,
        market_risk_premium=0.06,
        corporate_tax_rate=0.30,
        unlevered_beta=1.20,
        opening_kd_pre_tax=0.075,
        base_revenue_q=10000.0,
        base_cogs_q=6200.0,
        base_opex_q=2400.0,
        base_depreciation_q=600.0,
        maintenance_capex_q=600.0,
        opening_cash=1500.0,
        opening_nwc=4000.0,
        opening_net_fixed_assets=20000.0,
        opening_total_debt=10500.0,
        deck={
            1: ["P12_DIGITAL_PLATFORM", "P03_MEGA_PLANT", "P06_NWC_OPTIMIZATION"],
            2: ["P01_AUTOMATION_LINE", "P10_REGIONAL_ACQUISITION", "P07_DEBT_PREPAYMENT"],
            3: ["P05_ERP_DIGITAL", "P04_PREMIUM_LINE", "P02_EXPORT_EXPANSION"],
            4: ["P09_ENERGY_EFFICIENCY", "P03_MEGA_PLANT", "P07_DEBT_PREPAYMENT"],
            5: ["P11_FLEET_RENEWAL", "P10_REGIONAL_ACQUISITION", "P08_EQUITY_RECAPITALIZATION"],
            6: ["P02_EXPORT_EXPANSION", "P04_PREMIUM_LINE", "P07_DEBT_PREPAYMENT"],
            7: ["P05_ERP_DIGITAL", "P03_MEGA_PLANT", "P06_NWC_OPTIMIZATION"],
            8: ["P01_AUTOMATION_LINE", "P10_REGIONAL_ACQUISITION", "P07_DEBT_PREPAYMENT"],
            9: ["P12_DIGITAL_PLATFORM", "P04_PREMIUM_LINE", "P08_EQUITY_RECAPITALIZATION"],
            10: ["P09_ENERGY_EFFICIENCY", "P11_FLEET_RENEWAL", "P07_DEBT_PREPAYMENT"],
            11: ["P02_EXPORT_EXPANSION", "P03_MEGA_PLANT", "P07_DEBT_PREPAYMENT"],
            12: ["P05_ERP_DIGITAL", "P10_REGIONAL_ACQUISITION", "P07_DEBT_PREPAYMENT"],
        },
        shock_schedule={
            3: "COST_INFLATION",
            5: "SOVEREIGN_STRESS",
            7: "DEMAND_RECOVERY",
            9: "DEMAND_RECESSION",
            11: "RF_CUT",
        },
    ),
]

SCENARIOS: dict[ScenarioId, ScenarioConfig] = {
    config.scenario_id: config for config in _SCENARIO_CONFIGS
}


def get_scenario(scenario_id: ScenarioId) -> ScenarioConfig:
    return SCENARIOS[scenario_id]
