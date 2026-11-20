# Resumen ejecutivo de entrega — UBA

## 1. Aplicación funcional

Desarrollé **Finanzas Corporativas · Simulador CFO** para la Tecnicatura en Gestión y Análisis de Datos de la UBA. La aplicación está en [Vercel](https://ia-finanzas-psi.vercel.app/) y el código, en el [repositorio de GitHub](https://github.com/alexballera/ia-finanzas).

Desde la página de inicio se accede al mapa curricular: seis módulos de tres fases cada uno, con teoría, práctica interactiva y un caso CFO de tres trimestres. Incorporé un Tutor CFO IA en un panel lateral que toma el contexto de la actividad. El simulador final, **Cashflow Corporativo**, permite tomar decisiones durante hasta 12 trimestres y revisar sus efectos en el gráfico de cascada (Waterfall) del flujo de caja libre para la firma, en la evolución de ROIC frente a WACC y en el historial exportable a CSV.

## 2. Stack y proceso de desarrollo con IA

Construí el frontend con Next.js, TypeScript y Tailwind CSS. Usé KaTeX para las fórmulas y Recharts para los gráficos. En el backend usé Python y FastAPI, con `numpy` y `numpy-financial` para el motor. Desplegué ambos servicios en Vercel Services. Para el diagnóstico ejecutivo y el tutor integré la API de Gemini (`gemini-3.5-flash-lite`) mediante `google-genai` con Structured Outputs, para recibir respuestas con un esquema definido.

Usé Gemini al comienzo para explorar ideas. Después trabajé con Google AI Studio como apoyo de arquitectura y diseño de producto: con mi criterio acoté el MVP a una aplicación sin base de datos, definí el alcance y las ecuaciones contables en `PROJECT_SPEC.md` y generé y revisé los seis archivos curriculares, de `module_1.json` a `module_6.json`. Luego usé GitHub Copilot Agent en VS Code para implementar sprints incrementales. `AGENTS.md` estableció las reglas, `features.json` registró el estado de aceptación de cada bloque y `PROGRESS.md` documentó los avances. Usé `scripts/check.sh` como único sensor determinista: valida JSON y KaTeX y ejecuta pruebas, TypeScript, lint y build. El subagente definido en `.github/agents/revisor.agent.md` auditó los cambios mediante `#changes`, en un contexto limpio y en solo lectura.

El primer desafío fue evitar que una respuesta generada se convirtiera en un resultado financiero. Dejé todo cálculo en Python y limité Gemini a interpretar cifras ya calculadas. Si Gemini no está disponible, el respaldo por reglas mantiene la orientación sin depender del modelo.

El segundo fue el corte a los 30 segundos del proxy local de Next.js: el primer turno podía sumar la carga de `google-genai` y la espera de la API. Apliqué importación diferida y amplié el margen del proxy con `proxyTimeout`, separado del límite de la llamada al modelo.

El tercero fue la validación del contenido generado: un borrador de `module_2.json` llegó truncado y el `&` de `D&A` necesitaba escape dentro de una fórmula. La comprobación de JSON y la renderización estricta de KaTeX permitieron detectar esos problemas sin depender de una revisión visual.

El cuarto surgió de la auditoría: el Revisor señaló que `engine.py` podía reconocer un beneficio fiscal con EBIT negativo al valuar proyectos y que `tutor.py` dejaba pasar frases que revelaban una opción en la Fase 2. Corregí el cálculo con un piso de cero para los impuestos operativos y sustituí la detección basada en calificativos por una regla estructural. Dejé pruebas de regresión para ambos casos, incluidas pistas válidas que el tutor debe conservar.

## 3. Propuesta de valor del producto

Diseñé la plataforma para cerrar la brecha entre memorizar fórmulas y tomar decisiones integradas bajo incertidumbre. Quiero que quien aprenda pueda explicar por qué un proyecto rentable en apariencia puede comprometer la liquidez, o cómo una decisión de financiamiento cambia el riesgo y la creación de valor.

La dirijo a estudiantes de grado, posgrado y MBA, y a analistas de datos que necesitan aplicar conceptos financieros. También la pensé para capacitar a equipos de Finanzas y gerentes de áreas no financieras, y para contribuir a la profesionalización de PyMEs y empresas familiares.

Busqué combinar rigor bibliográfico con un historial exportable a CSV que permita revisar cada decisión y sus resultados. La certificación verificable es una posibilidad futura, no una prestación actual. También me interesa el logro personal de dominar las palancas de creación de valor y ganar confianza para ser reconocido como referente financiero estratégico. A diferencia de una planilla estática o un chatbot genérico, mi propuesta combina escenarios que evolucionan, cálculos reproducibles y orientación contextual.
