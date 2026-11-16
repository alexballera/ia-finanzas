"""API FastAPI stateless del simulador CFO.

Vercel Services reenvía el path original, por lo que todas las rutas llevan prefijo /api.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException

import engine
from models import (
    AIFeedback,
    EngineResult,
    FeedbackSource,
    GameStatus,
    HealthResponse,
    InitSimulationRequest,
    SimulationStepResponse,
    StepSimulationRequest,
)

API_VERSION = "0.1.0"

app = FastAPI(
    title="Simulador CFO - Finanzas Corporativas",
    version=API_VERSION,
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)


def build_placeholder_feedback(result: EngineResult) -> AIFeedback:
    """Feedback determinista del Sprint 1; en el Sprint 2 lo reemplaza Gemini."""
    state = result.state
    meta = state.meta
    kpis = state.valuation_and_risk_kpis
    balance = state.balance_sheet
    fcff = state.cash_flow_q.free_cash_flow_firm

    if meta.game_status is GameStatus.WON:
        headline = f"Objetivo cumplido en el trimestre {meta.current_quarter}"
    elif meta.game_status is GameStatus.GAME_OVER:
        headline = f"Simulación finalizada en el trimestre {meta.current_quarter}"
    elif meta.current_quarter == 0:
        headline = f"Diagnóstico inicial de {meta.company_name}"
    else:
        headline = f"Cierre del trimestre {meta.current_quarter}"

    spread_vs_wacc = kpis.roic_annualized - kpis.wacc
    analysis = (
        f"ROIC anualizado de {kpis.roic_annualized:.1%} frente a un WACC de {kpis.wacc:.1%} "
        f"(diferencial de {spread_vs_wacc:+.1%}), con EVA anualizado de {kpis.eva_annualized:,.0f}. "
        f"El FCFF del trimestre fue de {fcff:,.0f} y la caja cierra en {balance.cash:,.0f}. "
        f"Cobertura de intereses de {kpis.interest_coverage:.2f}x "
        f"(calificación sintética {kpis.credit_rating.value})."
    )

    strengths: list[str] = []
    risks: list[str] = []
    if kpis.eva_annualized > 0:
        strengths.append("El ROIC supera al WACC: la operación crea valor económico.")
    else:
        risks.append("El ROIC no cubre el WACC: la operación destruye valor económico.")
    if kpis.interest_coverage >= 3.0:
        strengths.append("La cobertura de intereses sostiene una calificación de grado de inversión.")
    elif kpis.interest_coverage < 1.5:
        risks.append("Cobertura en zona CCC: el financiamiento DEBT_100 queda bloqueado.")
    else:
        risks.append("Cobertura en zona de alto rendimiento (BB): la deuda es más cara.")
    if fcff > 0:
        strengths.append("El flujo de caja libre del trimestre fue positivo.")
    else:
        risks.append("El flujo de caja libre del trimestre fue negativo.")
    if state.cash_flow_q.emergency_debt > 0:
        risks.append("Se recurrió a un sobregiro de emergencia para cubrir el déficit de caja.")

    if meta.game_status is not GameStatus.ACTIVE:
        recommendation = "Revisar el historial de decisiones para identificar qué movió el EVA y la solvencia."
    elif kpis.interest_coverage < 1.5:
        recommendation = "Priorizar el desapalancamiento antes de comprometer nuevo Capex."
    elif kpis.eva_annualized <= 0:
        recommendation = (
            "Priorizar cartas con VAN positivo al WACC vigente y liberar capital invertido improductivo."
        )
    else:
        recommendation = "Sostener la disciplina de capital: aprobar solo cartas con VAN positivo."

    return AIFeedback(
        source=FeedbackSource.PLACEHOLDER,
        headline=headline,
        analysis=analysis,
        strengths=strengths,
        risks=risks,
        recommendation=recommendation,
    )


def _to_response(result: EngineResult) -> SimulationStepResponse:
    return SimulationStepResponse(
        state=result.state,
        waterfall=result.waterfall,
        offered_projects=result.offered_projects,
        applied_shock=result.applied_shock,
        upcoming_shock=result.upcoming_shock,
        alerts=result.alerts,
        ai_feedback=build_placeholder_feedback(result),
    )


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="backend", version=API_VERSION)


@app.post("/api/simulation/init", response_model=SimulationStepResponse)
def init_simulation(request: InitSimulationRequest) -> SimulationStepResponse:
    return _to_response(engine.init_simulation(request.scenario_id))


@app.post("/api/simulation/step", response_model=SimulationStepResponse)
def step_simulation(request: StepSimulationRequest) -> SimulationStepResponse:
    try:
        result = engine.step_simulation(
            request.state,
            request.selected_project_id,
            request.financing_option,
            request.dividends,
        )
    except engine.SimulationClosedError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except engine.EngineError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return _to_response(result)
