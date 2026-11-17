/** Mapeo puro de los datos del waterfall de FCL a barras graficables. */

import type { WaterfallItem, WaterfallKey, WaterfallKind } from "./types";

export type WaterfallTone = "positive" | "negative" | "subtotal" | "total";

export interface WaterfallBar {
  key: WaterfallKey;
  label: string;
  /** Etiqueta corta para el eje X. */
  shortLabel: string;
  /** Valor con signo de la barra: variación en las DELTA, nivel en subtotales y totales. */
  value: number;
  kind: WaterfallKind;
  /** Nivel del puente donde nace la barra. */
  start: number;
  /** Nivel del puente donde termina la barra. */
  end: number;
  /** `[mínimo, máximo]` de la barra: Recharts lo dibuja como barra flotante. */
  range: [number, number];
  tone: WaterfallTone;
}

const SHORT_LABELS: Record<WaterfallKey, string> = {
  EBIT: "EBIT",
  OPERATING_TAXES: "Imp. op.",
  NOPAT: "NOPAT",
  DEPRECIATION: "D&A",
  CAPEX: "Capex",
  DELTA_NWC: "Δ NWC",
  FCFF: "FCL",
};

/**
 * Las DELTA flotan entre el acumulado anterior y el nuevo; los subtotales y totales
 * se apoyan en cero. Un rango `[start, end]` cubre sin casos especiales las barras
 * negativas y las que cruzan el cero (por ejemplo, un Capex mayor que el NOPAT).
 */
export function buildWaterfallChartData(items: readonly WaterfallItem[]): WaterfallBar[] {
  return items.map((item) => {
    const isDelta = item.kind === "DELTA";
    const end = item.cumulative;
    const start = isDelta ? item.cumulative - item.value : 0;
    const tone: WaterfallTone = isDelta
      ? item.value < 0
        ? "negative"
        : "positive"
      : item.kind === "TOTAL"
        ? "total"
        : "subtotal";
    return {
      key: item.key,
      label: item.label,
      shortLabel: SHORT_LABELS[item.key] ?? item.label,
      // El backend envía -0.0 cuando no hay variación (por ejemplo, -delta_nwc con delta_nwc = 0).
      value: (isDelta ? item.value : item.cumulative) + 0,
      kind: item.kind,
      start,
      end,
      range: [Math.min(start, end), Math.max(start, end)],
      tone,
    };
  });
}
