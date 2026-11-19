# Bitácora de avance

## Cierre del MVP — Sprints 1 a 4
- Infraestructura monorepo con frontend Next.js, backend FastAPI y rutas de Vercel Services.
- Motor financiero determinista, escenarios iniciales, balance contable, simulación y pruebas unitarias.
- Feedback ejecutivo de Gemini con Structured Outputs y fallback determinista.
- Currículo de tres módulos, fases de teoría, práctica y simulación CFO; cockpit con gráficos y exportación CSV.
- Sprint 4: timeout de Gemini de 30 segundos, cifras localizadas en el feedback, requisitos de producción livianos, documentación y verificación completa.

## Inicio de V2 — T1 Módulos 4, 5 y 6
- Alcance: incorporar los contenidos existentes de valuación de bonos/acciones, capital de trabajo/dividendos y valuación por múltiplos/M&A.
- Criterio: escenarios de tres trimestres ganables, progreso de seis módulos, dividendos validados por el motor y sensor integral en verde.

## Cierre T1 — Módulos 4, 5 y 6
- Integrados los módulos curriculares de bonos/acciones, capital de trabajo/dividendos y múltiplos/M&A, con escenarios deterministas calibrados.
- El selector de dividendos usa una previsualización del backend y el motor rechaza distribuciones por encima de la caja proyectada o con cobertura CCC. Las distribuciones se guardan en el historial y CSV.
- Habilitado el avance progresivo por seis módulos; el Simulador Final requiere completar los seis o activar Modo Docente / Demo.
- El revisor detectó un posible escudo fiscal por EBIT negativo en la valuación ex ante; se aplicó el mismo piso de impuestos operativos que usa el motor y se agregó un test de regresión.
- Sensores en verde: JSON y 24 fórmulas KaTeX, 78 pruebas de backend, TypeScript, lint, 5 tests frontend y build de producción (`bash scripts/check.sh`).
- `T1_MODULOS_4_5_6` pasa a estado `pasa`. T2, T3 y T4 continúan pendientes.
