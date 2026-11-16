import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def _init(scenario_id: str) -> dict:
    response = client.post("/api/simulation/init", json={"scenario_id": scenario_id})
    assert response.status_code == 200
    return response.json()


def test_health():
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


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
    assert body["ai_feedback"]["source"] == "PLACEHOLDER"


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
    assert body["ai_feedback"]["source"] == "PLACEHOLDER"


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
