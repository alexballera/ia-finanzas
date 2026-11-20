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

## Cierre T2 — Tutor CFO IA contextual
- `POST /api/tutor/chat` usa Gemini con salida estructurada, carga diferida y timeout de 30 segundos. Si no está disponible, responde con orientación pedagógica por reglas.
- El drawer global recibe el módulo, la fase y la pregunta activa sin su respuesta correcta, o los KPIs vigentes del simulador. Gemini los interpreta; el motor Python sigue siendo el único que calcula.
- La conversación se conserva en `sessionStorage` por pestaña. A partir de la revisión, las consultas solo reenvían mensajes del contexto activo; el historial completo sigue visible y se puede limpiar.
- Cerrado el hallazgo del Revisor para la Fase 2: cuando hay una tarjeta activa, el backend filtra la respuesta y las sugerencias de Gemini. Si detecta que revelan o confirman una opción de forma explícita, devuelve una pista socrática por reglas. Las pruebas incluyen «La respuesta correcta es la B» y verifican que las pistas válidas se conservan.
- Sensores en verde: JSON y 24 fórmulas KaTeX, 93 pruebas de backend, TypeScript, lint, 5 pruebas de frontend y build de producción (`bash scripts/check.sh`). `T2_TUTOR_IA_DRAWER` permanece en `pasa`; T3 y T4 siguen pendientes.
- El filtro de Fase 2 detecta letras mayúsculas de opción a hasta 45 caracteres de un sustantivo de respuesta dentro de la misma oración, sin listas de calificativos. También reconoce recomendaciones y letras aisladas. Los controles incluyen `D/E`, `D&A`, «Bono A» y «Proyecto A».
