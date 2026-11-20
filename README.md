# Finanzas Corporativas · Simulador CFO

Plataforma educativa desarrollada para la **Tecnicatura en Gestión y Análisis de Datos de la UBA**. Permite aprender finanzas corporativas y practicar decisiones de inversión, financiamiento y distribución de caja en escenarios simulados.

**[Abrir la aplicación en vivo](https://ia-finanzas-psi.vercel.app/)**

## Propuesta de valor y mini plan de marketing

**Problema.** Memorizar fórmulas por separado no prepara para tomar decisiones estratégicas integradas bajo incertidumbre. La plataforma conecta teoría, práctica y simulación para mostrar cómo una decisión afecta, al mismo tiempo, la caja, el riesgo y la creación de valor.

- **Beneficios racionales:** contenidos basados en referencias estándar (Brealey y Myers, Ross y Westerfield, Berk y DeMarzo, Damodaran y McKinsey), cifras calculadas por un motor determinista en lugar de ser generadas por IA y trazabilidad por trimestre exportable en `.CSV`. La certificación es una proyección futura, no un beneficio disponible hoy.
- **Beneficios emocionales:** satisfacción de dominar las palancas de creación de valor y confianza para posicionarse como **referente financiero estratégico** en una corporación, PyME o empresa familiar.
- **Público objetivo:** en **B2C**, estudiantes de grado, posgrado, MBA y análisis de datos; en **B2B**, equipos de Finanzas y gerentes no financieros que buscan capacitarse, además de PyMEs y empresas familiares que buscan profesionalizar sus decisiones.
- **Diferencial:** a diferencia de una planilla estática, la simulación muestra las consecuencias de cada decisión a lo largo de varios trimestres. A diferencia de un chatbot genérico, el tutor interpreta un contexto curricular y cifras calculadas por Python.
- **Acciones propuestas:** difundir el enlace y un caso breve en comunidades estudiantiles y profesionales para B2C; ofrecer demostraciones y talleres piloto con Modo Docente / Demo para B2B. Usar como señales iniciales la finalización del primer caso y las solicitudes de demostración. Estas acciones no representan campañas ni métricas implementadas.

## Funcionalidades activas

| Ruta | Qué ofrece |
| --- | --- |
| [`/`](https://ia-finanzas-psi.vercel.app/) | Landing ejecutiva con la propuesta de valor y acceso al recorrido. |
| [`/curriculum`](https://ia-finanzas-psi.vercel.app/curriculum) | Mapa curricular con **seis módulos completos**, desbloqueo progresivo y Modo Docente / Demo para acceso libre. |
| `/modules/[id]` | Tres fases por módulo: teoría con fórmulas LaTeX, práctica con **48 tarjetas interactivas** en total (ocho por módulo) y casos CFO de tres trimestres. |
| `POST /api/tutor/chat` | **Tutor CFO IA** en un panel lateral contextual. En la Fase 2, cuando hay una tarjeta activa, aplica un filtro para sustituir respuestas que revelen explícitamente una opción por pistas socráticas. |
| [`/simulator`](https://ia-finanzas-psi.vercel.app/simulator) | **Cashflow Corporativo**, simulador final de hasta **12 trimestres**, con gráfico de cascada (Waterfall) del flujo de caja libre para la firma (FCFF), evolución de ROIC frente a WACC y exportación `.CSV`. El objetivo es sostener la creación de valor (EVA) sin perder solvencia. |

El recorrido aborda presupuesto de capital; riesgo, retorno y costo de capital; estructura de capital y EVA; valuación de bonos y acciones; capital de trabajo y dividendos; y valuación por múltiplos y fusiones y adquisiciones.

## Arquitectura y harness de desarrollo

- **Frontend (`frontend/`):** Next.js con App Router, TypeScript, Tailwind CSS, KaTeX y Recharts. El progreso y las partidas se guardan en `localStorage`; el historial del tutor se conserva por pestaña en `sessionStorage`.
- **Backend (`backend/`):** FastAPI y un motor determinista en Python con `numpy` y `numpy-financial`. Python es el único responsable de los cálculos financieros y contables. Los montos están en miles de USD, los flujos son trimestrales y las tasas y métricas de retorno se anualizan. El backend no guarda estado ni usa base de datos.
- **IA:** Gemini, vía `google-genai` con Structured Outputs, redacta diagnósticos ejecutivos y orienta al estudiante. Si no está disponible, se usa un respaldo determinista basado en reglas.
- **Despliegue:** [Vercel Services](vercel.json) monta ambos servicios desde la raíz del monorepo. Enruta `/api/*` a FastAPI conservando el prefijo y las demás rutas a Next.js. En desarrollo, Next.js reenvía `/api/*` al backend local.

El harness usa [PROJECT_SPEC.md](PROJECT_SPEC.md) para el alcance y las ecuaciones, [AGENTS.md](AGENTS.md) para las reglas de trabajo, [features.json](features.json) para el estado de aceptación y [PROGRESS.md](PROGRESS.md) para la bitácora. [scripts/check.sh](scripts/check.sh) es el sensor integral; el [Revisor](.github/agents/revisor.agent.md) audita los cambios en solo lectura.

## Ejecución local

Requisitos: Python 3.12, Node.js 20.9 o posterior, npm y Bash (Git Bash en Windows para el sensor).

**1. Backend.** Desde la raíz, en PowerShell:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Para habilitar Gemini, configura `GEMINI_API_KEY` en el entorno del backend antes de iniciarlo. `GEMINI_MODEL` es opcional; el valor predeterminado es `gemini-3.5-flash-lite`. Sin clave, la aplicación sigue funcionando con el respaldo determinista. En Vercel, configura las mismas variables en el proyecto. No incluyas claves en el repositorio.

**2. Frontend.** En otra terminal, desde la raíz:

```powershell
cd frontend
npm ci
npm run dev
```

Abre `http://localhost:3000` (o la dirección indicada por Next.js). La documentación de la API está disponible en `http://127.0.0.1:8000/api/docs`.

**3. Verificación.** Desde la raíz:

```bash
bash scripts/check.sh
```

El sensor comprueba JSON y fórmulas KaTeX, ejecuta las pruebas de backend y verifica TypeScript, lint, pruebas y build de producción del frontend.

## Roadmap futuro — no implementado

- Inicio de sesión persistente con roles: `Administrador`, `Educador / Capacitador` y `Alumno`.
- Emisión de certificados verificables.
- Controles deslizantes continuos en el cockpit del simulador.
- **Track II:** Productos Derivados, DeFi/Criptoactivos, Tokenización RWA y Securitización.
