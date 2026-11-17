"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import {
  formatPercent,
  formatPercentagePoints,
  formatSignedThousandsUsd,
} from "@/lib/format";
import type { HistoryEntry } from "@/lib/types";

import { CHART_COLORS } from "./labels";

interface RoicWaccPoint {
  label: string;
  /** ROIC y WACC en puntos porcentuales para el eje. */
  roicPct: number;
  waccPct: number;
  roic: number;
  wacc: number;
  eva: number;
  createsValue: boolean;
}

function toPoints(history: readonly HistoryEntry[]): RoicWaccPoint[] {
  return history.map((entry) => ({
    label: `Q${entry.quarter}`,
    roicPct: entry.roic_annualized * 100,
    waccPct: entry.wacc * 100,
    roic: entry.roic_annualized,
    wacc: entry.wacc,
    eva: entry.eva_annualized,
    createsValue: entry.roic_annualized > entry.wacc,
  }));
}

function RoicWaccTooltip({ active, payload }: TooltipContentProps) {
  const point = payload?.[0]?.payload as RoicWaccPoint | undefined;
  if (!active || point === undefined) {
    return null;
  }
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs shadow-lg tabular-nums">
      <p className="font-semibold text-white">{point.label}</p>
      <p className="mt-1" style={{ color: CHART_COLORS.sky }}>
        ROIC: {formatPercent(point.roic)}
      </p>
      <p style={{ color: CHART_COLORS.amber }}>WACC: {formatPercent(point.wacc)}</p>
      <p className={point.createsValue ? "text-emerald-300" : "text-rose-300"}>
        Diferencial: {formatPercentagePoints(point.roic - point.wacc)} · EVA{" "}
        {formatSignedThousandsUsd(point.eva)}
      </p>
    </div>
  );
}

interface RoicDotProps {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: RoicWaccPoint;
}

/** Punto verde cuando el ROIC supera al WACC (EVA positivo); rojo cuando no lo cubre. */
function RoicDot({ cx, cy, index, payload }: RoicDotProps) {
  if (cx === undefined || cy === undefined || payload === undefined) {
    return null;
  }
  return (
    <circle
      key={index}
      cx={cx}
      cy={cy}
      r={5}
      fill={payload.createsValue ? CHART_COLORS.emerald : CHART_COLORS.rose}
      stroke={CHART_COLORS.background}
      strokeWidth={2}
    />
  );
}

export function RoicWaccChart({ history }: { history: readonly HistoryEntry[] }) {
  if (history.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-slate-800 px-6 text-center text-sm text-slate-500">
        La tendencia aparece al cerrar el primer trimestre.
      </div>
    );
  }

  const points = toPoints(history);

  return (
    <figure>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="label"
              padding={{ left: 24, right: 24 }}
              tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: CHART_COLORS.axisLine }}
            />
            <YAxis
              width={52}
              domain={[
                (dataMin: number) => Math.floor(dataMin - 1),
                (dataMax: number) => Math.ceil(dataMax + 1),
              ]}
              tickFormatter={(value: number) => `${value}%`}
              tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={RoicWaccTooltip} cursor={{ stroke: CHART_COLORS.axisLine }} />
            <Line
              type="linear"
              dataKey="waccPct"
              stroke={CHART_COLORS.amber}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="roicPct"
              stroke={CHART_COLORS.sky}
              strokeWidth={2.5}
              dot={RoicDot}
              activeDot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4" style={{ backgroundColor: CHART_COLORS.sky }} aria-hidden />
          ROIC anualizado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-0 w-4 border-t-2 border-dashed"
            style={{ borderColor: CHART_COLORS.amber }}
            aria-hidden
          />
          WACC
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: CHART_COLORS.emerald }}
            aria-hidden
          />
          ROIC &gt; WACC: EVA positivo
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: CHART_COLORS.rose }}
            aria-hidden
          />
          ROIC &lt; WACC: destruye valor
        </span>
      </figcaption>
    </figure>
  );
}
