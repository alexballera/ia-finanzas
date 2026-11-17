import type {
  CreditRating,
  EndReason,
  FinancingOption,
  ProjectCategory,
} from "@/lib/types";

import type { BadgeTone } from "../ui";

export const FINANCING_ORDER: readonly FinancingOption[] = [
  "CASH_100",
  "DEBT_50_CASH_50",
  "DEBT_100",
  "EQUITY_100",
  "DEBT_REPAY",
];

export const FINANCING_LABELS: Record<FinancingOption, string> = {
  CASH_100: "100% caja",
  DEBT_50_CASH_50: "50% deuda / 50% caja",
  DEBT_100: "100% deuda",
  EQUITY_100: "Emisión de acciones",
  DEBT_REPAY: "Cancelación con caja",
};

export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  GROWTH_CAPEX: "Capex de crecimiento",
  EFFICIENCY_CAPEX: "Capex de eficiencia",
  NWC_OPTIMIZATION: "Optimización de NWC",
  DEBT_REPAYMENT: "Desapalancamiento",
};

export const RATING_TONES: Record<CreditRating, BadgeTone> = {
  "AAA/A": "emerald",
  BBB: "sky",
  BB: "amber",
  CCC: "rose",
};

export const END_REASON_TEXT: Record<EndReason, { title: string; detail: string }> = {
  GOAL_ACHIEVED: {
    title: "Objetivo cumplido",
    detail: "La gestión financiera alcanzó la meta del escenario.",
  },
  INSOLVENCY: {
    title: "Insolvencia",
    detail:
      "La caja quedó en negativo sin capacidad crediticia para cubrirla: la empresa no pudo seguir operando.",
  },
  OBJECTIVE_NOT_MET: {
    title: "Objetivo no alcanzado",
    detail: "Se agotaron los trimestres sin cumplir la meta del escenario.",
  },
};

/** Colores de los gráficos (paleta de Tailwind), para SVG que no admite clases utilitarias. */
export const CHART_COLORS = {
  emerald: "#34d399",
  rose: "#fb7185",
  cyan: "#22d3ee",
  amber: "#fbbf24",
  sky: "#38bdf8",
  axis: "#94a3b8",
  axisLine: "#334155",
  grid: "#1e293b",
  zeroLine: "#64748b",
  background: "#0f172a",
};
