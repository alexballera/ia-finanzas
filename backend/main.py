"""API FastAPI stateless del simulador CFO.

Vercel Services reenvía el path original, por lo que todas las rutas llevan prefijo /api.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException

import ai_evaluator
import engine
from models import (
    AIFeedback,
    EngineResult,
    HealthResponse,
    InitSimulationRequest,
    SimulationStepResponse,
    StepSimulationRequest,
)

API_VERSION = "0.2.0"

app = FastAPI(
    title="Simulador CFO - Finanzas Corporativas",
    version=API_VERSION,
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)


def _to_response(result: EngineResult, ai_feedback: AIFeedback) -> SimulationStepResponse:
    return SimulationStepResponse(
        state=result.state,
        waterfall=result.waterfall,
        offered_projects=result.offered_projects,
        applied_shock=result.applied_shock,
        upcoming_shock=result.upcoming_shock,
        alerts=result.alerts,
        ai_feedback=ai_feedback,
    )


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="backend", version=API_VERSION)


@app.post("/api/simulation/init", response_model=SimulationStepResponse)
def init_simulation(request: InitSimulationRequest) -> SimulationStepResponse:
    result = engine.init_simulation(request.scenario_id)
    # El arranque es instantáneo: el diagnóstico de apertura usa solo las reglas, sin Gemini.
    summary = engine.build_turn_summary(result.state, result)
    return _to_response(result, ai_evaluator.build_rule_based_feedback(summary))


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
    summary = engine.build_turn_summary(request.state, result)
    return _to_response(result, ai_evaluator.evaluate_turn_with_ai(summary))
