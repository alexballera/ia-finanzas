# Finanzas Corporativas · Simulador CFO

Plataforma educativa desarrollada para la **Tecnicatura Universitaria en Gestión y Análisis de Datos en las Organizaciones (UBA)**. Permite aprender finanzas corporativas con rigor académico y practicar decisiones de inversión, financiamiento y política de dividendos en escenarios simulados.

**[Abrir la aplicación en vivo](https://ia-finanzas-psi.vercel.app/)**

## Propuesta de valor y estrategia de producto

**Problema.** Memorizar fórmulas por separado o resolver ejercicios aislados en papel no prepara para tomar decisiones estratégicas integradas bajo incertidumbre. La plataforma conecta teoría, práctica activa y simulación multi-trimestre para mostrar cómo una decisión afecta simultáneamente la caja, el riesgo y la creación de valor.

- **Beneficios racionales:** contenidos fundamentados en bibliografía estándar (Brealey y Myers, Ross y Westerfield, Berk y DeMarzo, Damodaran y McKinsey), cálculos ejecutados por un motor determinista en Python en lugar de ser generados por IA, y trazabilidad completa por trimestre exportable en `.CSV`. La emisión de certificados verificables forma parte de la hoja de ruta futura.
- **Beneficios emocionales:** satisfacción de logro al dominar las palancas reales de creación de valor y confianza para consolidarse como **referente financiero estratégico** dentro de una corporación, PyME o empresa familiar.
- **Público objetivo:** en **B2C**, estudiantes de grado, posgrado, MBA y análisis de datos; en **B2B**, capacitación corporativa para equipos de Finanzas y gerentes no financieros, además de PyMEs y empresas familiares en proceso de profesionalización.
- **Diferencial:** frente a una planilla estática de cálculo, el simulador refleja consecuencias dinámicas a lo largo de varios trimestres ante cambios macroeconómicos. Frente a un chatbot genérico, el tutor interpreta un contexto curricular definido y cifras exactas auditadas por Python.
- **Estrategia inicial de difusión (Go-to-Market):** para B2C, difusión orgánica del simulador y casos breves en comunidades académicas y de análisis de datos; para B2B, demostraciones guiadas y talleres piloto utilizando el Modo Docente / Demo, tomando como indicadores de validación la tasa de finalización del primer caso y las solicitudes de prueba.

## Funcionalidades activas

| Ruta | Descripción |
| --- | --- |
| [`/`](https://ia-finanzas-psi.vercel.app/) | Landing page ejecutiva con la propuesta de valor, público objetivo y acceso a la plataforma. |
| [`/curriculum`](https://ia-finanzas-psi.vercel.app/curriculum) | Mapa curricular con **seis módulos completos**, desbloqueo progresivo e interruptor **Modo Docente / Demo** para acceso libre. |
| `/modules/[id]` | Tres fases por módulo: teoría condensada con fórmulas LaTeX, práctica con **48 tarjetas interactivas** (ocho por módulo) y casos CFO de tres trimestres. |
| `POST /api/tutor/chat` | **Tutor CFO IA** en panel lateral contextual. En la Fase 2, cuando existe una tarjeta activa, aplica un filtro estructural determinista para sustituir cualquier revelación de respuesta por una pista socrática. |
| [`/simulator`](https://ia-finanzas-psi.vercel.app/simulator) | **Cashflow Corporativo**, simulador final integrador de hasta **12 trimestres**, con gráfico de cascada (Waterfall) del FCFF, evolución de ROIC frente a WACC y exportación de datos en `.CSV`. |

El plan de estudios abarca: (1) valor del dinero en el tiempo y presupuesto de capital; (2) riesgo, retorno y costo de capital (WACC); (3) estructura de capital y creación de valor (EVA); (4) valuación de bonos y acciones; (5) capital de trabajo y política de dividendos; y (6) valuación por múltiplos y fusiones y adquisiciones (M&A).

## Arquitectura y harness de desarrollo

- **Frontend (`frontend/`):** Next.js con App Router, TypeScript, Tailwind CSS, KaTeX y Recharts. El progreso y las partidas activas se almacenan en `localStorage`; el historial del tutor se conserva por pestaña en `sessionStorage`.
- **Backend (`backend/`):** FastAPI y un motor determinista en Python con `numpy` y `numpy-financial`. Python es el único responsable de los cálculos financieros y contables. Las cifras operativas se expresan en miles de USD, los flujos son trimestrales y las tasas y métricas de retorno se anualizan. El backend opera sin estado ni base de datos.
- **Inteligencia Artificial:** Gemini (`gemini-3.5-flash-lite`), vía `google-genai` con Structured Outputs, redacta diagnósticos ejecutivos y orienta al estudiante. Ante falta de clave o fallos de red, se activa un respaldo determinista basado en reglas.
- **Despliegue:** [Vercel Services](vercel.json) publica ambos servicios desde la raíz del monorepo, enrutando `/api/*` hacia FastAPI (conservando el prefijo) y el resto de las rutas hacia Next.js.

El entorno de desarrollo asistido por IA se organizó mediante [PROJECT_SPEC.md](PROJECT_SPEC.md) (alcance y ecuaciones), [AGENTS.md](AGENTS.md) (reglas operativas), [features.json](features.json) (estado de tareas), [PROGRESS.md](PROGRESS.md) (bitácora entre sesiones), [scripts/check.sh](scripts/check.sh) (sensor integral de verificación) y el subagente [Revisor](.github/agents/revisor.agent.md) en modo solo lectura.

## Ejecución local

Requisitos: Python 3.12, Node.js 20.9 o posterior, npm y Bash (Git Bash en Windows para ejecutar el sensor).

**1. Backend.** Desde la raíz, en PowerShell:

    cd backend
    py -3.12 -m venv .venv
    .\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
    .\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000

Para habilitar Gemini, configure `GEMINI_API_KEY` en el entorno del backend antes de iniciarlo. `GEMINI_MODEL` es opcional (por defecto `gemini-3.5-flash-lite`). Sin clave, la aplicación sigue operando con el respaldo determinista. En Vercel, defina estas mismas variables en el proyecto y nunca versione archivos `.env`.

**2. Frontend.** En otra terminal, desde la raíz:

    cd frontend
    npm ci
    npm run dev

Abra `http://localhost:3000`. La documentación interactiva de la API está disponible en `http://127.0.0.1:8000/api/docs`.

**3. Verificación integral.** Desde la raíz (Git Bash / Bash):

    bash scripts/check.sh

## Roadmap futuro (no implementado en esta versión)

- Inicio de sesión persistente con gestión de roles: `Administrador`, `Educador / Capacitador` y `Alumno`.
- Emisión de certificados verificables de finalización.
- Controles deslizantes continuos (*sliders*) en el tablero del CFO.
- **Track II:** Productos Derivados, Finanzas Descentralizadas (DeFi) y Criptoactivos, Tokenización de activos (RWA) y Securitización.