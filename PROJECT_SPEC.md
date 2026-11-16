# PROJECT_SPEC.md — Plataforma Educativa de Finanzas Corporativas & Simulador CFO

## 1. Visión General y Arquitectura
Aplicación educativa de Finanzas Corporativas (sin base de datos; persistencia en `localStorage` del navegador) estructurada en:
- **3 Módulos Progresivos**, cada uno con 3 Fases:
  - Fase 1: Teoría Condensada (consumida desde `frontend/data/module_X.json`)
  - Fase 2: Flashcards y Quizzes de cálculo (consumida desde `frontend/data/module_X.json`)
  - Fase 3: Simulación de Caso Real (3 trimestres) impulsada por Backend Python + Gemini AI
- **Simulador Final Integrador ("Cashflow Corporativo"):** 8 a 12 trimestres donde el usuario actúa como CFO para sacar a la empresa de la "carrera de la rata operativa" (EVA sostenido > 0 con solvencia).

### Monorepo y Despliegue (Vercel Services)
- `frontend/`: Next.js (App Router, TypeScript, Tailwind CSS, shadcn/ui, Recharts).
- `backend/`: Python 3.12 + FastAPI (100% stateless).
- `vercel.json` en la raíz enruta `/api/:path*` al servicio `backend` (`main:app`) y `/(.*)` al servicio `frontend`.
- **Regla de rutas:** Vercel Services reenvía el path original al backend, por lo que todos los endpoints de FastAPI DEBEN llevar prefijo `/api/...` (ej. `/api/health`, `/api/simulation/init`, `/api/simulation/step`).
- **Desarrollo local:** `frontend/next.config.ts` debe incluir un `rewrite` en `NODE_ENV === "development"` de `/api/:path*` hacia `http://127.0.0.1:8000/api/:path*` para evitar problemas de CORS al correr `uvicorn` y `next dev` en paralelo.

---

## 2. Especificación Matemática Determinista (`backend/engine.py`)
**REGLA CRÍTICA:** Python es el único dueño de los cálculos financieros y contables. La IA nunca calcula números.

### A. Convención Temporal
- Los flujos del Estado de Resultados y Flujo de Caja (`revenue`, `ebitda`, `ebit`, `nopat`, `fcf`, `interest`) son **trimestrales**.
- Las tasas y métricas de retorno (`rf`, `erp`, `ke`, `kd`, `wacc`, `roic`, `eva`) se expresan **anualizadas**.
- Puente de anualización: `nopat_anual = nopat_q * 4`.

### B. Fórmulas de Estado de Resultados y Flujo de Caja Libre (FCFF)
- `ebitda = revenue - cogs - opex` (o suma base + boosts de proyectos activos afectados por multiplicadores macro).
- `ebit = ebitda - depreciation`
- `operating_taxes = max(0.0, ebit * corporate_tax_rate)`
- `nopat = ebit - operating_taxes`
- `fcff = nopat + depreciation - capex - delta_nwc`
- **Datos del Gráfico Waterfall FCL:** Descomposición exacta en este orden:
  1. `EBIT` (+)
  2. `Impuestos Operativos` (-)
  3. `NOPAT` (subtotal)
  4. `Depreciación y Amortización` (+)
  5. `Capex` (-)
  6. `Variación NWC` (- delta_nwc; positivo si libera caja)
  7. `FCL (FCFF)` (total final)

### C. Contabilidad Real y Cuadre Estricto del Balance
- `interest_expense = total_debt_start * (kd_pre_tax_start / 4.0)`
- `ebt = ebit - interest_expense`
- `actual_taxes = max(0.0, ebt * corporate_tax_rate)`
- `net_income = ebt - actual_taxes`
- Actualización del Balance al cierre del trimestre:
  - `net_fixed_assets_new = net_fixed_assets + capex - depreciation`
  - `working_capital_nwc_new = working_capital_nwc + delta_nwc`
  - `total_debt_new = total_debt + new_debt - debt_repaid`
  - `shareholders_equity_new = shareholders_equity + net_income + new_equity - dividends`
  - `cash_new = cash + net_income + depreciation - capex - delta_nwc + new_debt - debt_repaid + new_equity - dividends`
- **Invariante obligatorio:** En todo turno debe cumplirse `(cash + nwc + net_fixed_assets) == (total_debt + shareholders_equity)` (tolerancia < 1e-4).

### D. Riesgo, Hamada, Rating Sintético (Damodaran) y WACC
- Ratio Deuda/Equity: Si `shareholders_equity > 0`, `d_to_e = total_debt / shareholders_equity`.
- Fórmula de Hamada ($\beta_{\text{deuda}} = 0$):
  `levered_beta = unlevered_beta * (1 + (1 - corporate_tax_rate) * d_to_e)`
- CAPM:
  `ke = risk_free_rate + levered_beta * market_risk_premium`
- Cobertura de Intereses:
  Si `interest_expense > 0`: `interest_coverage = ebit / interest_expense`, si no `99.0`.
- Tabla de Spread Crediticio Dinámico según `interest_coverage`:
  - `> 5.0x` -> `credit_spread = 0.015` (AAA/A)
  - `3.0x a 5.0x` -> `credit_spread = 0.030` (BBB)
  - `1.5x a 3.0x` -> `credit_spread = 0.055` (BB - High Yield)
  - `< 1.5x` -> `credit_spread = 0.090` (CCC - Estrés Financiero; bloquea financiamiento `DEBT_100` en el próximo turno)
- Costo de la deuda:
  - `kd_pre_tax = risk_free_rate + credit_spread`
  - `kd_after_tax = kd_pre_tax * (1 - corporate_tax_rate)`
- WACC:
  - `total_capital = total_debt + max(1.0, shareholders_equity)`
  - `wacc = ke * (shareholders_equity / total_capital) + kd_after_tax * (total_debt / total_capital)`

### E. Creación de Valor (McKinsey) y Reglas del Juego
- Capital Invertido Operativo (excluye caja ociosa):
  `invested_capital = working_capital_nwc + net_fixed_assets`
- `roic_annualized = (nopat * 4.0) / invested_capital`
- `eva_annualized = (roic_annualized - wacc) * invested_capital`
- `net_debt_to_ebitda = (total_debt - cash) / max(1.0, ebitda * 4.0)`
- **Mecánica de Proyectos (Cartas):**
  - Al aprobar una carta de proyecto con `capex`, `nwc_required`, `duration_quarters`, `ebitda_boost_q`, se suma `capex` y `delta_nwc` en el turno actual, y el proyecto queda en `active_projects` aportando `ebitda_boost_q` y `depreciation = capex / duration_quarters` durante los siguientes `duration_quarters` trimestres.
  - Cada carta ofrecida calcula ex-ante su `projected_npv` y `projected_irr` descontando sus flujos operativos incrementales al `wacc` actual de la empresa (tasa trimestral equivalente `(1 + wacc)**(1/4) - 1`).
- **Condiciones de Cierre (`game_status`):**
  - `ACTIVE`: Juego en curso.
  - `WON` (en `FINAL_GAME`): `eva_annualized > 0` durante 3 trimestres consecutivos (`consecutive_positive_eva_turns >= 3`), `cash > 0` e `interest_coverage > 2.5`. (En `PHASE_3` de módulos: al completar los 3 trimestres cumpliendo la meta del escenario).
  - `GAME_OVER`: `cash < 0` y (`net_debt_to_ebitda > 4.0` o `interest_coverage < 1.2`) -> Insolvencia. Si `cash < 0` pero tiene capacidad crediticia, el motor toma un sobregiro de emergencia automático por el déficit (`new_debt_emergency = abs(cash)`), deja `cash = 0` y emite alerta crítica.