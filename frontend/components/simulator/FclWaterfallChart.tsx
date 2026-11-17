"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
  type TooltipContentProps,
} from "recharts";

import { formatSignedThousandsUsd, formatThousandsUsd } from "@/lib/format";
import type { WaterfallItem } from "@/lib/types";
import { buildWaterfallChartData, type WaterfallBar, type WaterfallTone } from "@/lib/waterfall";

import { CHART_COLORS } from "./labels";

const TONE_COLORS: Record<WaterfallTone, string> = {
  positive: CHART_COLORS.emerald,
  negative: CHART_COLORS.rose,
  subtotal: CHART_COLORS.cyan,
  total: CHART_COLORS.amber,
};

const LEGEND: readonly { tone: WaterfallTone; label: string }[] = [
  { tone: "positive", label: "Suma caja" },
  { tone: "negative", label: "Consume caja" },
  { tone: "subtotal", label: "Subtotal (NOPAT)" },
  { tone: "total", label: "Total (FCL)" },
];

function WaterfallTooltip({ active, payload }: TooltipContentProps) {
  const bar = payload?.[0]?.payload as WaterfallBar | undefined;
  if (!active || bar === undefined) {
    return null;
  }
  const isDelta = bar.kind === "DELTA";
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-white">{bar.label}</p>
      <p className="mt-1 text-slate-300 tabular-nums">
        {isDelta ? "Variación: " : "Nivel: "}
        <span className="font-semibold" style={{ color: TONE_COLORS[bar.tone] }}>
          {isDelta ? formatSignedThousandsUsd(bar.value) : formatThousandsUsd(bar.value)}
        </span>
      </p>
      {isDelta && (
        <p className="mt-0.5 text-slate-400 tabular-nums">
          Acumulado: {formatThousandsUsd(bar.end)}
        </p>
      )}
    </div>
  );
}

function WaterfallBarShape(props: BarShapeProps) {
  const bar = props.payload as WaterfallBar;
  return <Rectangle {...props} fill={TONE_COLORS[bar.tone]} radius={3} />;
}

/** Puente EBIT → FCL del trimestre; las cifras ya vienen calculadas por el backend. */
export function FclWaterfallChart({ waterfall }: { waterfall: readonly WaterfallItem[] }) {
  const bars = buildWaterfallChartData(waterfall);

  return (
    <figure>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bars} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="shortLabel"
              interval={0}
              tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: CHART_COLORS.axisLine }}
            />
            <YAxis
              width={76}
              tickFormatter={formatThousandsUsd}
              tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <ReferenceLine y={0} stroke={CHART_COLORS.zeroLine} />
            <Tooltip content={WaterfallTooltip} cursor={{ fill: "rgba(148, 163, 184, 0.08)" }} />
            <Bar
              dataKey="range"
              shape={WaterfallBarShape}
              maxBarSize={56}
              minPointSize={2}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-400">
        {LEGEND.map(({ tone, label }) => (
          <span key={tone} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: TONE_COLORS[tone] }}
              aria-hidden
            />
            {label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
