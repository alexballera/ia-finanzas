import json
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

import ai_evaluator
import engine
from main import app
from models import AIFeedback, EndReason

client = TestClient(app)

FAKE_API_KEY = "clave-de-prueba-123"
BACKEND_DIR = Path(__file__).resolve().parents[1]


@pytest.fixture(autouse=True)
def _without_gemini_credentials(monkeypatch):
    # backend/.env puede traer una clave real: ningún test debe llamar a Gemini de verdad.
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_MODEL", raising=False)


@pytest.fixture
def gemini_client(monkeypatch):
    """Reemplaza genai.Client por un mock y configura una clave de prueba."""
    client_cls = MagicMock(name="genai.Client")
    # ai_evaluator importa el SDK de forma diferida, así que se parchea en su módulo de origen.
    monkeypatch.setattr("google.genai.Client", client_cls)
    monkeypatch.setenv("GEMINI_API_KEY", FAKE_API_KEY)
    return client_cls


def _init(scenario_id: str) -> dict:
    response = client.post("/api/simulation/init", json={"scenario_id": scenario_id})
    assert response.status_code == 200
    return response.json()


def _step(state: dict, project_id: str | None = None, financing: str = "CASH_100"):
    return client.post(
        "/api/simulation/step",
        json={"state": state, "selected_project_id": project_id, "financing_option": financing},
    )


def test_health():
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_swagger_docs_are_served_under_api_prefix():
    assert client.get("/api/docs").status_code == 200
    schema = client.get("/api/openapi.json")

    assert schema.status_code == 200
    assert "/api/simulation/step" in schema.json()["paths"]


def test_importing_the_app_does_not_load_the_gemini_sdk():
    # El SDK tarda segundos en importarse: solo debe cargarse al llamar a Gemini.
    probe = "import sys, main; sys.exit(int('google.genai' in sys.modules))"

    completed = subprocess.run([sys.executable, "-c", probe], cwd=BACKEND_DIR, timeout=120)

    assert completed.returncode == 0


@pytest.mark.parametrize(
    ("scenario_id", "company_name", "max_quarters"),
    [
        ("sim_mod_1", "Metalúrgica Austral S.A.", 3),
        ("sim_mod_2", "Energía Pampeana S.A.", 3),
        ("sim_mod_3", "Textil Cordillerana S.A.", 3),
        ("final_game", "Andes Tech S.A.", 12),
    ],
)
def test_init_returns_opening_state(scenario_id, company_name, max_quarters):
    body = _init(scenario_id)

    assert body["state"]["meta"]["company_name"] == company_name
    assert body["state"]["meta"]["max_quarters"] == max_quarters
    assert body["state"]["meta"]["current_quarter"] == 0
    assert body["state"]["meta"]["game_status"] == "ACTIVE"
    assert len(body["waterfall"]) == 7
    assert all("projected_npv" in card for card in body["offered_projects"])
    assert body["ai_feedback"]["ai_source"] == "fallback"


def test_init_rejects_unknown_scenario():
    response = client.post("/api/simulation/init", json={"scenario_id": "sim_mod_9"})

    assert response.status_code == 422


def test_step_round_trips_the_state_returned_by_init():
    opening = _init("sim_mod_1")
    card = opening["offered_projects"][0]

    response = client.post(
        "/api/simulation/step",
        json={
            "state": opening["state"],
            "selected_project_id": card["project_id"],
            "financing_option": "DEBT_50_CASH_50",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["state"]["meta"]["current_quarter"] == 1
    assert body["state"]["active_projects"][0]["project_id"] == card["project_id"]
    assert body["state"]["history_summary"][0]["financing_option"] == "DEBT_50_CASH_50"


def test_step_rejects_blocked_debt_financing():
    opening = _init("sim_mod_3")

    response = client.post(
        "/api/simulation/step",
        json={
            "state": opening["state"],
            "selected_project_id": "P04_PREMIUM_LINE",
            "financing_option": "DEBT_100",
        },
    )

    assert response.status_code == 422
    assert "DEBT_100" in response.json()["detail"]


def test_step_rejects_finished_simulation():
    state = _init("sim_mod_1")["state"]
    for _ in range(3):
        state = client.post("/api/simulation/step", json={"state": state}).json()["state"]
    assert state["meta"]["game_status"] != "ACTIVE"

    response = client.post("/api/simulation/step", json={"state": state})

    assert response.status_code == 409


# --- Feedback del Directorio (Gemini con fallback determinista) --------------


def test_step_uses_fallback_when_api_key_is_missing(monkeypatch):
    client_cls = MagicMock(name="genai.Client")
    monkeypatch.setattr("google.genai.Client", client_cls)
    opening = _init("sim_mod_1")

    response = _step(opening["state"], "P01_AUTOMATION_LINE", "DEBT_50_CASH_50")

    assert response.status_code == 200
    feedback = AIFeedback.model_validate(response.json()["ai_feedback"])
    assert feedback.ai_source == "fallback"
    assert feedback.board_diagnosis
    client_cls.assert_not_called()


def test_step_returns_gemini_feedback_when_gemini_answers(gemini_client, monkeypatch):
    monkeypatch.setenv("GEMINI_MODEL", "gemini-de-prueba")
    verdict = ai_evaluator.BoardVerdict(
        executive_verdict="EXCELENTE",
        board_diagnosis="El EVA mejoró porque el ROIC del proyecto supera al WACC.",
        risk_alert=None,
        bibliographic_anchor="Brealey-Myers: regla del VAN.",
        strategic_score=88,
    )
    generate_content = gemini_client.return_value.models.generate_content
    generate_content.return_value = SimpleNamespace(parsed=verdict, text=verdict.model_dump_json())

    opening = _init("sim_mod_1")
    gemini_client.assert_not_called()  # el arranque no consulta a Gemini

    response = _step(opening["state"], "P01_AUTOMATION_LINE", "DEBT_50_CASH_50")

    assert response.status_code == 200
    feedback = AIFeedback.model_validate(response.json()["ai_feedback"])
    assert feedback == AIFeedback(**verdict.model_dump(), ai_source="gemini")

    assert gemini_client.call_args.kwargs["api_key"] == FAKE_API_KEY
    assert gemini_client.call_args.kwargs["http_options"].timeout >= 30_000
    call = generate_content.call_args.kwargs
    assert call["model"] == "gemini-de-prueba"
    assert call["config"].temperature == 0.3
    assert call["config"].response_schema is ai_evaluator.BoardVerdict
    assert "ai_source" not in ai_evaluator.BoardVerdict.model_fields
    # Los deltas viajan ya calculados por el motor, no los deriva Gemini.
    new_eva = response.json()["state"]["valuation_and_risk_kpis"]["eva_annualized"]
    old_eva = opening["state"]["valuation_and_risk_kpis"]["eva_annualized"]
    turn_summary = json.loads(call["contents"].splitlines()[1])
    formatted_delta = f"{abs(new_eva - old_eva):,.1f}".translate(str.maketrans(",.", ".,"))
    sign = "-" if round(new_eva - old_eva, 1) < 0 else ""
    assert turn_summary["kpi_deltas"]["eva_annualized"] == f"{sign}${formatted_delta}k"
    assert turn_summary["decision"]["project_name"] == "Automatización de línea de producción"
    assert "punto para miles" in call["config"].system_instruction


@pytest.mark.parametrize(
    "failure",
    ["client_error", "timeout", "unparseable_response"],
)
def test_step_falls_back_gracefully_when_gemini_fails(gemini_client, caplog, failure):
    generate_content = gemini_client.return_value.models.generate_content
    if failure == "client_error":
        gemini_client.side_effect = RuntimeError(f"credenciales rechazadas: {FAKE_API_KEY}")
    elif failure == "timeout":
        generate_content.side_effect = TimeoutError("la solicitud excedió el tiempo límite")
    else:
        generate_content.return_value = SimpleNamespace(parsed=None, text="esto no es JSON")
    opening = _init("sim_mod_1")

    with caplog.at_level("WARNING", logger="ai_evaluator"):
        response = _step(opening["state"], "P01_AUTOMATION_LINE", "DEBT_50_CASH_50")

    assert response.status_code == 200
    feedback = AIFeedback.model_validate(response.json()["ai_feedback"])
    assert feedback.ai_source == "fallback"
    assert len(caplog.records) == 1
    assert "Gemini no disponible" in caplog.text
    assert FAKE_API_KEY not in caplog.text


@pytest.mark.parametrize(
    ("scenario_id", "project_id", "financing", "verdict", "alert_fragment"),
    [
        ("sim_mod_3", "P04_PREMIUM_LINE", "CASH_100", "CRITICO", "Insolvencia"),
        ("sim_mod_3", "P08_EQUITY_RECAPITALIZATION", "EQUITY_100", "ACEPTABLE", "zona CCC"),
        ("sim_mod_1", "P02_EXPORT_EXPANSION", "CASH_100", "RIESGOSO", "sobregiro de emergencia"),
        ("sim_mod_1", "P04_PREMIUM_LINE", "EQUITY_100", None, "VAN proyectado de -"),
        ("sim_mod_1", "P01_AUTOMATION_LINE", "DEBT_50_CASH_50", "EXCELENTE", None),
    ],
)
def test_fallback_feedback_flags_the_risk_of_the_turn(
    scenario_id, project_id, financing, verdict, alert_fragment
):
    opening = _init(scenario_id)

    feedback = _step(opening["state"], project_id, financing).json()["ai_feedback"]

    if verdict is not None:
        assert feedback["executive_verdict"] == verdict
    if alert_fragment is None:
        assert feedback["risk_alert"] is None
    else:
        assert alert_fragment in feedback["risk_alert"]


def test_spanish_formatting_in_prompt_and_fallback():
    result = engine.init_simulation("sim_mod_1")
    summary = engine.build_turn_summary(result.state, result)
    kpis = summary.new_kpis.model_copy(update={
        "eva_annualized": -2272.5,
        "roic_annualized": 0.112,
        "wacc": 0.125,
        "interest_coverage": 1.25,
    })
    summary = summary.model_copy(update={
        "new_kpis": kpis,
        "cash": -2272.5,
        "end_reason": EndReason.INSOLVENCY,
    })
    feedback = ai_evaluator.build_rule_based_feedback(summary)
    payload = json.loads(ai_evaluator.build_prompt(summary).splitlines()[1])

    assert "-$2.272,5k" in feedback.board_diagnosis
    assert "11,20%" in feedback.board_diagnosis
    assert "1,25x" in feedback.board_diagnosis
    assert "-$2.272,5k" in feedback.risk_alert
    assert "1,25x" in feedback.risk_alert
    assert payload["new_kpis"]["eva_annualized"] == "-$2.272,5k"
    assert payload["new_kpis"]["roic_annualized"] == "11,20%"
    assert payload["new_kpis"]["interest_coverage"] == "1,25x"


def test_spanish_formatting_for_emergency_debt_and_negative_npv():
    result = engine.init_simulation("sim_mod_1")
    summary = engine.build_turn_summary(result.state, result)
    summary = summary.model_copy(update={"quarter": 1, "emergency_debt": 2272.5})
    assert "$2.272,5k" in ai_evaluator.build_rule_based_feedback(summary).risk_alert

    decision = summary.decision.model_copy(update={"projected_npv": -2272.5})
    summary = summary.model_copy(update={"emergency_debt": 0, "decision": decision})
    assert "-$2.272,5k" in ai_evaluator.build_rule_based_feedback(summary).risk_alert
