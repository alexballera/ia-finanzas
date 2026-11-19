# Guía para agentes

## Mapa del repositorio
- `frontend/`: Next.js, experiencia curricular, componentes, tipos, utilidades y datos `data/module_*.json`.
- `backend/`: FastAPI, modelos, escenarios, motor determinista y pruebas.
- `PROJECT_SPEC.md`: alcance aprobado y ecuaciones financieras de referencia.
- `features.json`: estado verificable de los bloques de V2.
- `PROGRESS.md`: bitácora breve de entregas.
- `.github/agents/revisor.agent.md`: auditor de cambios, solo lectura.

## Verificación
- Ejecutar el sensor completo desde la raíz: `bash scripts/check.sh`.
- El sensor valida JSON/KaTeX, backend pytest y frontend TypeScript, lint, tests y build.
- No declarar una tarea aprobada si el sensor correspondiente no termina exitosamente.

## Reglas críticas del proyecto
- Los montos del simulador están expresados en miles de USD (`$k`); los flujos son trimestrales y las tasas/métricas de retorno, anualizadas.
- Python (`backend/engine.py`) es el dueño exclusivo de los cálculos financieros y contables. El frontend presenta resultados y decisiones; no recalcula métricas.
- Toda ruta FastAPI pública lleva prefijo `/api/`, porque Vercel Services conserva el path original.
- En fórmulas LaTeX dentro de JSON, escribir `\\&` en el archivo para representar `\&` al parsear el JSON.
- No editar, borrar ni debilitar tests para hacer pasar una implementación. Corregir el comportamiento del producto.
- No abrir, leer, modificar ni registrar archivos `.env`; nunca copiar claves o secretos.
- Antes de cambiar contratos, revisar los modelos, callers y datos existentes. Mantener el balance contable y los estados guardados compatibles.
