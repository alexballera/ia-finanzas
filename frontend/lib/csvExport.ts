/** Exportación del historial de una partida a CSV (dataset para análisis). */

import type { HistoryEntry, ScenarioId } from "./types";

const BOM = "\uFEFF";

// Mismo orden y nombres que `history_summary` en el backend.
const COLUMNS: readonly (keyof HistoryEntry)[] = [
  "quarter",
  "selected_project_id",
  "financing_option",
  "shock_id",
  "revenue",
  "ebitda",
  "net_income",
  "free_cash_flow_firm",
  "cash",
  "total_debt",
  "shareholders_equity",
  "interest_coverage",
  "credit_rating",
  "wacc",
  "roic_annualized",
  "eva_annualized",
  "emergency_debt",
  "dividends",
  "game_status",
];

function toCell(value: string | number | null | undefined): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "number") {
    // Punto decimal y hasta 6 decimales: legible por planillas y por pandas/R.
    return String(Number(value.toFixed(6)));
  }
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** CSV con BOM UTF-8, separador coma y fin de línea CRLF (RFC 4180). */
export function buildHistoryCsv(history: readonly HistoryEntry[]): string {
  const rows = [
    COLUMNS.join(","),
    ...history.map((entry) =>
      COLUMNS.map((column) =>
        column === "dividends" ? toCell(entry.dividends) : toCell(entry[column]),
      ).join(","),
    ),
  ];
  return `${BOM}${rows.join("\r\n")}\r\n`;
}

export function historyCsvFileName(companyName: string, scenarioId: ScenarioId): string {
  const slug = companyName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "empresa"}_${scenarioId}_historial.csv`;
}

/** Genera el CSV y dispara su descarga en el navegador. */
export function exportHistoryToCsv(
  companyName: string,
  scenarioId: ScenarioId,
  history: readonly HistoryEntry[],
): void {
  const blob = new Blob([buildHistoryCsv(history)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = historyCsvFileName(companyName, scenarioId);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
