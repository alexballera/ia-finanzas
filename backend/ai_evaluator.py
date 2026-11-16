"""Evaluación cualitativa del turno: Gemini redacta el veredicto, Python calcula los números.

Si falta GEMINI_API_KEY o la llamada a Gemini falla por cualquier motivo, se devuelve la
evaluación determinista de reglas con ai_source = "fallback".
"""

from __future__ import annotations

import json
import logging
import os

from dotenv import load_dotenv
from pydantic import BaseModel, Field

from models import (
    AIFeedback,
    CreditRating,
    EndReason,
    ExecutiveVerdict,
    FinancingOption,
    GameStatus,
    ProjectCategory,
    TurnSummary,
    ValuationAndRiskKpis,
)

load_dotenv()

logger = logging.getLogger(__name__)

DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite"
GEMINI_TEMPERATURE = 0.3
GEMINI_TIMEOUT_MS = 15_000

EXCELLENT_MIN_SCORE = 80
ACCEPTABLE_MIN_SCORE = 60
RISKY_MIN_SCORE = 35

SYSTEM_INSTRUCTION = f"""\
Sos el Comité de Inversiones y el Directorio de una compañía latinoamericana, integrado por \
especialistas en Finanzas Corporativas. Evaluás la gestión trimestral del CFO en un simulador \
educativo y le devolvés un veredicto ejecutivo.

Reglas innegociables:
1. No calculás nada. Todas las cifras, las variaciones (kpi_deltas) y los diferenciales ya \
vienen calculados por el motor financiero. Usá únicamente los números del resumen del turno: \
no inventes, estimes ni recalcules cifras.
2. Las cifras ya vienen formateadas y listas para citar: montos en miles de USD, flujos \
trimestrales, tasas y EVA anualizados, variaciones de tasas en puntos porcentuales (pp) y \
múltiplos en veces (x). Citá las cifras tal como vienen, sin convertirlas.
3. Hablale al CFO de vos, en español rioplatense, con tono ejecutivo, sobrio y directo. Sin \
saludos, sin relleno y sin markdown.
4. Si quarter es 0 no hubo decisión: es el diagnóstico de apertura de la empresa.

Qué devolvés:
- executive_verdict: EXCELENTE (crea valor y fortalece la solvencia), ACEPTABLE (decisión \
razonable, con efectos mixtos o neutros), RIESGOSO (deteriora el valor o la solvencia, o asume \
un riesgo financiero relevante) o CRITICO (destruye valor de forma grave, hubo sobregiro de \
emergencia con estrés financiero o la empresa quedó insolvente).
- board_diagnosis: 2 a 3 oraciones que expliquen qué cambió en el EVA, en el ROIC frente al \
WACC, en el FCL o en la cobertura de intereses, y por qué, vinculándolo con la decisión tomada \
y con el shock macro si lo hubo.
- risk_alert: una alerta concreta solo si cayó la cobertura de intereses, subió el spread \
crediticio hacia zona BB o CCC, hubo sobregiro de emergencia o se aprobó un proyecto con VAN \
negativo. Si no aplica ninguna, devolvé null.
- bibliographic_anchor: una sola línea que conecte el turno con un concepto de Brealey-Myers, \
Ross-Westerfield, Damodaran, Modigliani-Miller o McKinsey. Nombrá al autor y el concepto, sin \
citar páginas ni capítulos.
- strategic_score: entero de 1 a 100 que califica la calidad estratégica de la decisión del \
trimestre, no la suerte del shock. Guía: {EXCELLENT_MIN_SCORE} a 100 EXCELENTE, \
{ACCEPTABLE_MIN_SCORE} a {EXCELLENT_MIN_SCORE - 1} ACEPTABLE, {RISKY_MIN_SCORE} a \
{ACCEPTABLE_MIN_SCORE - 1} RIESGOSO, 1 a {RISKY_MIN_SCORE - 1} CRITICO.
"""

_FINANCING_LABELS = {
    FinancingOption.CASH_100: "caja propia",
    FinancingOption.DEBT_50_CASH_50: "50% deuda y 50% caja",
    FinancingOption.DEBT_100: "100% deuda",
    FinancingOption.EQUITY_100: "emisión de acciones",
    FinancingOption.DEBT_REPAY: "caja destinada a cancelar deuda",
}


class BoardVerdict(BaseModel):
    """Schema de Structured Output que completa Gemini; ai_source lo fija el backend."""

    executive_verdict: ExecutiveVerdict
    board_diagnosis: str = Field(
        description="2 a 3 oraciones ejecutivas, solo con cifras del resumen del turno."
    )
    risk_alert: str | None = Field(
        description="Alerta concreta de riesgo financiero, o null si no corresponde ninguna."
    )
    bibliographic_anchor: str = Field(
        description="Una línea que vincula el turno con un autor y un concepto de finanzas."
    )
    strategic_score: int = Field(ge=1, le=100)


# --- Evaluación determinista de reglas (fallback) ----------------------------


def _strategic_score(summary: TurnSummary) -> int:
    """Califica la decisión del turno: pesa la dirección del cambio más que el estado heredado."""
    kpis, deltas, decision = summary.new_kpis, summary.kpi_deltas, summary.decision
    approved_positive_npv = decision.projected_npv is not None and decision.projected_npv > 0
    deleveraged = decision.debt_repaid > 0

    score = 50
    score += 10 if kpis.eva_annualized > 0 else -5
    if deltas.eva_annualized > 0:
        score += 10
    elif deltas.eva_annualized < 0 and not (approved_positive_npv or deleveraged):
        # Invertir con VAN positivo o cancelar deuda baja el EVA del trimestre sin destruir valor.
        score -= 10

    if kpis.interest_coverage > 5.0:
        score += 10
    elif kpis.interest_coverage >= 3.0:
        score += 6
    elif kpis.interest_coverage >= 1.5:
        score -= 4
    else:
        score -= 10

    if decision.projected_npv is not None:
        score += 12 if approved_positive_npv else -15
    started_below_investment_grade = summary.prev_kpis.credit_rating in (
        CreditRating.BB,
        CreditRating.CCC,
    )
    if deleveraged and started_below_investment_grade:
        score += 15
    if summary.emergency_debt > 0:
        score -= 15

    if summary.game_status is GameStatus.WON:
        score += 15
    elif summary.end_reason is EndReason.INSOLVENCY:
        score = min(score, 10)
    elif summary.end_reason is EndReason.OBJECTIVE_NOT_MET:
        score -= 10
    return max(1, min(100, score))


def _executive_verdict(summary: TurnSummary, score: int) -> ExecutiveVerdict:
    if summary.end_reason is EndReason.INSOLVENCY:
        return "CRITICO"
    if score < RISKY_MIN_SCORE:
        return "CRITICO"
    # La cobertura refleja la deuda de inicio del trimestre: desapalancar en CCC no es un riesgo.
    still_in_ccc = (
        summary.new_kpis.credit_rating is CreditRating.CCC and summary.decision.debt_repaid == 0
    )
    if score < ACCEPTABLE_MIN_SCORE or summary.emergency_debt > 0 or still_in_ccc:
        return "RIESGOSO"
    return "EXCELENTE" if score >= EXCELLENT_MIN_SCORE else "ACEPTABLE"


def _board_diagnosis(summary: TurnSummary) -> str:
    kpis, deltas, decision = summary.new_kpis, summary.kpi_deltas, summary.decision
    coverage = (
        f"La cobertura de intereses es de {kpis.interest_coverage:.2f}x "
        f"(calificación sintética {kpis.credit_rating.value}) y el FCL del trimestre "
        f"fue de {summary.free_cash_flow_firm:,.0f}."
    )
    if summary.quarter == 0:
        return (
            f"{summary.company_name} abre con un ROIC de {kpis.roic_annualized:.1%} frente a "
            f"un WACC de {kpis.wacc:.1%} y un EVA anualizado de {kpis.eva_annualized:,.0f}. "
            f"{coverage}"
        )

    if deltas.eva_annualized > 0:
        eva_change = f"subió {deltas.eva_annualized:,.0f}"
    elif deltas.eva_annualized < 0:
        eva_change = f"bajó {abs(deltas.eva_annualized):,.0f}"
    else:
        eva_change = "no varió"
    value = (
        f"El EVA anualizado {eva_change} y cierra en {kpis.eva_annualized:,.0f}, con un ROIC "
        f"de {kpis.roic_annualized:.1%} frente a un WACC de {kpis.wacc:.1%}."
    )

    if summary.end_reason is EndReason.INSOLVENCY:
        closing = "La empresa quedó insolvente y la simulación terminó."
    elif summary.game_status is GameStatus.WON:
        closing = "Se cumplió el objetivo del escenario."
    elif summary.end_reason is EndReason.OBJECTIVE_NOT_MET:
        closing = "Se agotaron los trimestres sin cumplir el objetivo del escenario."
    elif decision.project_name is None:
        closing = "No se aprobó ninguna carta en el trimestre."
    else:
        financing = _FINANCING_LABELS.get(decision.financing_option, "caja propia")
        closing = f"Se aprobó «{decision.project_name}» con {financing}"
        if decision.projected_npv is not None:
            closing += f" y un VAN proyectado de {decision.projected_npv:,.0f}"
        closing += "."
    return f"{value} {coverage} {closing}"


def _risk_alert(summary: TurnSummary) -> str | None:
    kpis, deltas, decision = summary.new_kpis, summary.kpi_deltas, summary.decision
    in_ccc = kpis.credit_rating is CreditRating.CCC
    blocked = " El financiamiento DEBT_100 queda bloqueado." if in_ccc else ""

    if summary.end_reason is EndReason.INSOLVENCY:
        return (
            f"Insolvencia: la caja cerró en {summary.cash:,.0f} sin capacidad crediticia "
            f"(Deuda Neta/EBITDA de {kpis.net_debt_to_ebitda:.2f}x y cobertura de "
            f"{kpis.interest_coverage:.2f}x)."
        )
    if summary.emergency_debt > 0:
        return (
            f"Se tomó un sobregiro de emergencia por {summary.emergency_debt:,.0f} para "
            "cubrir el déficit de caja del trimestre."
        )
    if decision.projected_npv is not None and decision.projected_npv < 0:
        return (
            f"El proyecto aprobado tiene un VAN proyectado de {decision.projected_npv:,.0f} "
            "al WACC vigente: destruye valor aunque sume EBITDA."
        )
    if deltas.credit_spread > 0:
        return (
            f"El spread crediticio subió a {kpis.credit_spread:.1%} (calificación "
            f"{kpis.credit_rating.value}) porque la cobertura de intereses quedó en "
            f"{kpis.interest_coverage:.2f}x.{blocked}"
        )
    if in_ccc:
        return (
            f"La cobertura de intereses de {kpis.interest_coverage:.2f}x mantiene a la "
            f"empresa en zona CCC.{blocked}"
        )
    if deltas.interest_coverage < 0 and kpis.interest_coverage < 3.0:
        return (
            f"La cobertura de intereses cayó {abs(deltas.interest_coverage):.2f}x y quedó en "
            f"{kpis.interest_coverage:.2f}x, por debajo del grado de inversión."
        )
    return None


def _bibliographic_anchor(summary: TurnSummary) -> str:
    kpis, deltas, decision = summary.new_kpis, summary.kpi_deltas, summary.decision

    if decision.projected_npv is not None and decision.projected_npv < 0:
        return (
            "Brealey, Myers y Allen: la regla del VAN manda rechazar todo proyecto con VAN "
            "negativo, aunque aumente el EBITDA."
        )
    if (
        summary.emergency_debt > 0
        or deltas.credit_spread > 0
        or kpis.credit_rating is CreditRating.CCC
    ):
        return (
            "Damodaran: el rating sintético por cobertura de intereses encarece la deuda "
            "cuando el EBIT deja de cubrir con holgura los intereses."
        )
    if decision.new_debt > 0 or decision.new_equity > 0 or decision.debt_repaid > 0:
        return (
            "Modigliani y Miller con impuestos, y Hamada: cambiar la mezcla de deuda y "
            "capital propio mueve la beta apalancada y el costo del capital propio."
        )
    if decision.category is ProjectCategory.NWC_OPTIMIZATION:
        return (
            "Ross, Westerfield y Jaffe: reducir el capital de trabajo neto libera caja y "
            "mejora el flujo de caja libre sin nuevo Capex."
        )
    if decision.projected_npv is not None:
        return (
            "Brealey, Myers y Allen: un proyecto con VAN positivo al costo de capital "
            "aumenta la riqueza de los accionistas."
        )
    return "McKinsey (Koller): solo se crea valor cuando el ROIC supera al WACC."


def build_rule_based_feedback(summary: TurnSummary) -> AIFeedback:
    """Evaluación determinista por reglas; no depende de servicios externos."""
    score = _strategic_score(summary)
    return AIFeedback(
        executive_verdict=_executive_verdict(summary, score),
        board_diagnosis=_board_diagnosis(summary),
        risk_alert=_risk_alert(summary),
        bibliographic_anchor=_bibliographic_anchor(summary),
        strategic_score=score,
        ai_source="fallback",
    )


# --- Evaluación con Gemini ---------------------------------------------------


def _amount(value: float) -> float | int:
    rounded = round(value, 1)
    return int(rounded) if rounded == int(rounded) else rounded


def _pct(value: float) -> str:
    return f"{value * 100:.2f}%"


def _pp(value: float) -> str:
    return f"{value * 100:+.2f} pp"


def _multiple(value: float) -> str:
    return f"{value:.2f}x"


def _kpis_view(kpis: ValuationAndRiskKpis) -> dict[str, object]:
    return {
        "eva_annualized": _amount(kpis.eva_annualized),
        "roic_annualized": _pct(kpis.roic_annualized),
        "wacc": _pct(kpis.wacc),
        "ke": _pct(kpis.ke),
        "kd_pre_tax": _pct(kpis.kd_pre_tax),
        "credit_spread": _pct(kpis.credit_spread),
        "credit_rating": kpis.credit_rating.value,
        "interest_coverage": _multiple(kpis.interest_coverage),
        "net_debt_to_ebitda": _multiple(kpis.net_debt_to_ebitda),
        "d_to_e": _multiple(kpis.d_to_e),
        "levered_beta": round(kpis.levered_beta, 2),
        "invested_capital": _amount(kpis.invested_capital),
    }


def build_prompt(summary: TurnSummary) -> str:
    """Resumen del turno con cifras ya formateadas: Gemini redacta, no convierte ni calcula."""
    decision, deltas, shock = summary.decision, summary.kpi_deltas, summary.applied_shock
    payload = {
        "company_name": summary.company_name,
        "mission_objective": summary.mission_objective,
        "quarter": summary.quarter,
        "max_quarters": summary.max_quarters,
        "game_status": summary.game_status.value,
        "end_reason": summary.end_reason.value if summary.end_reason else None,
        "consecutive_positive_eva_turns": summary.consecutive_positive_eva_turns,
        "decision": {
            "project_name": decision.project_name,
            "category": decision.category.value if decision.category else None,
            "financing_option": (
                decision.financing_option.value if decision.financing_option else None
            ),
            "projected_npv": (
                _amount(decision.projected_npv) if decision.projected_npv is not None else None
            ),
            "projected_irr": (
                _pct(decision.projected_irr) if decision.projected_irr is not None else None
            ),
            "capex": _amount(decision.capex),
            "nwc_required": _amount(decision.nwc_required),
            "new_debt": _amount(decision.new_debt),
            "new_equity": _amount(decision.new_equity),
            "debt_repaid": _amount(decision.debt_repaid),
            "dividends": _amount(decision.dividends),
        },
        "applied_shock": (
            {"title": shock.title, "description": shock.description} if shock else None
        ),
        "prev_kpis": _kpis_view(summary.prev_kpis),
        "new_kpis": _kpis_view(summary.new_kpis),
        "kpi_deltas": {
            "eva_annualized": _amount(deltas.eva_annualized),
            "roic_annualized": _pp(deltas.roic_annualized),
            "wacc": _pp(deltas.wacc),
            "roic_wacc_spread": _pp(deltas.roic_wacc_spread),
            "interest_coverage": f"{deltas.interest_coverage:+.2f}x",
            "credit_spread": _pp(deltas.credit_spread),
            "net_debt_to_ebitda": f"{deltas.net_debt_to_ebitda:+.2f}x",
            "free_cash_flow_firm": _amount(deltas.free_cash_flow_firm),
            "cash": _amount(deltas.cash),
            "total_debt": _amount(deltas.total_debt),
        },
        "roic_wacc_spread": _pp(summary.roic_wacc_spread),
        "waterfall_fcf": [
            {"label": item.label, "value": _amount(item.value)} for item in summary.waterfall_fcf
        ],
        "free_cash_flow_firm": _amount(summary.free_cash_flow_firm),
        "cash": _amount(summary.cash),
        "emergency_debt": _amount(summary.emergency_debt),
    }
    return (
        "Resumen del turno, calculado por el motor financiero (JSON):\n"
        f"{json.dumps(payload, ensure_ascii=False)}\n\n"
        "Emití el veredicto del Directorio para este trimestre."
    )


def _ask_gemini(summary: TurnSummary, api_key: str) -> AIFeedback:
    # Import diferido: cargar el SDK tarda varios segundos y solo hace falta al llamar a Gemini.
    from google import genai
    from google.genai import types

    model = os.getenv("GEMINI_MODEL", "").strip() or DEFAULT_GEMINI_MODEL
    client = genai.Client(
        api_key=api_key, http_options=types.HttpOptions(timeout=GEMINI_TIMEOUT_MS)
    )
    try:
        response = client.models.generate_content(
            model=model,
            contents=build_prompt(summary),
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                temperature=GEMINI_TEMPERATURE,
                response_mime_type="application/json",
                response_schema=BoardVerdict,
            ),
        )
    finally:
        client.close()

    verdict = response.parsed
    if not isinstance(verdict, BoardVerdict):
        verdict = BoardVerdict.model_validate_json(response.text or "")
    return AIFeedback(
        executive_verdict=verdict.executive_verdict,
        board_diagnosis=verdict.board_diagnosis.strip(),
        risk_alert=(verdict.risk_alert or "").strip() or None,
        bibliographic_anchor=verdict.bibliographic_anchor.strip(),
        strategic_score=verdict.strategic_score,
        ai_source="gemini",
    )


def _describe_error(exc: Exception, api_key: str) -> str:
    message = " ".join(str(exc).split()).replace(api_key, "***")
    return f"{type(exc).__name__}: {message[:300]}"


def evaluate_turn_with_ai(summary: TurnSummary) -> AIFeedback:
    """Veredicto del Directorio para el turno; nunca lanza: ante cualquier fallo usa las reglas."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        logger.info("GEMINI_API_KEY no configurada: se usa la evaluación determinista.")
        return build_rule_based_feedback(summary)

    try:
        return _ask_gemini(summary, api_key)
    except Exception as exc:  # noqa: BLE001 - cualquier fallo de Gemini degrada al fallback
        logger.warning(
            "Gemini no disponible (%s): se usa la evaluación determinista.",
            _describe_error(exc, api_key),
        )
        return build_rule_based_feedback(summary)
