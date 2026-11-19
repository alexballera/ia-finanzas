#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Validando JSON y fórmulas KaTeX de los módulos"
node - frontend/data/module_*.json <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

const requireFrontend = createRequire(path.resolve("frontend/package.json"));
const katex = requireFrontend("katex");
const files = process.argv.slice(2);
if (files.length === 0) throw new Error("No se encontraron archivos module_*.json.");

for (const file of files) {
  const moduleData = JSON.parse(fs.readFileSync(file, "utf8"));
  const concepts = moduleData.phase_1_theory?.concepts;
  if (!Array.isArray(concepts)) throw new Error(`${file}: falta phase_1_theory.concepts.`);
  for (const [index, concept] of concepts.entries()) {
    if (typeof concept.formula_latex !== "string" || concept.formula_latex.length === 0) {
      throw new Error(`${file}: concepto ${index + 1} sin formula_latex.`);
    }
    try {
      katex.renderToString(concept.formula_latex, { throwOnError: true, displayMode: true });
    } catch (error) {
      throw new Error(`${file}: fórmula KaTeX inválida en "${concept.title}": ${error.message}`);
    }
  }
  console.log(`  OK ${file} (${concepts.length} fórmulas)`);
}
NODE

echo "==> Ejecutando pytest del backend"
if [[ -x backend/.venv/Scripts/python.exe ]]; then
  backend/.venv/Scripts/python.exe -m pytest -q backend/tests
elif [[ -x backend/.venv/bin/python ]]; then
  backend/.venv/bin/python -m pytest -q backend/tests
else
  (cd backend && pytest -q)
fi

echo "==> Verificando TypeScript, lint, tests y build del frontend"
(
  cd frontend
  npx tsc --noEmit
  npm run lint
  npm test
  npm run build
)

echo "==> Todos los sensores pasaron."
