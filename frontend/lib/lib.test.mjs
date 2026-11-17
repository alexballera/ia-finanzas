// Tests de las funciones puras de lib/. Se corren con `npm test` (node --test);
// Node importa los .ts directamente quitando los tipos.
import assert from "node:assert/strict";
import { test } from "node:test";

import { buildHistoryCsv, historyCsvFileName } from "./csvExport.ts";
import { buildWaterfallChartData } from "./waterfall.ts";

/** Arma los ítems como lo hace `engine.build_waterfall` en el backend. */
function waterfall({ ebit, taxes, depreciation, capex, deltaNwc }) {
  const deltas = [
    ["EBIT", "EBIT", ebit],
    ["OPERATING_TAXES", "Impuestos Operativos", -taxes],
    ["DEPRECIATION", "Depreciación y Amortización", depreciation],
    ["CAPEX", "Capex", -capex],
    ["DELTA_NWC", "Variación NWC", -deltaNwc],
  ];
  const items = [];
  let cumulative = 0;
  for (const [key, label, value] of deltas) {
    cumulative += value;
    items.push({ key, label, value, kind: "DELTA", cumulative });
    if (key === "OPERATING_TAXES") {
      items.push({ key: "NOPAT", label: "NOPAT", value: cumulative, kind: "SUBTOTAL", cumulative });
    }
  }
  items.push({ key: "FCFF", label: "FCL (FCFF)", value: cumulative, kind: "TOTAL", cumulative });
  return items;
}

const byKey = (bars) => Object.fromEntries(bars.map((bar) => [bar.key, bar]));

test("barras positivas, negativas, subtotal y total de un trimestre normal", () => {
  const bars = buildWaterfallChartData(
    waterfall({ ebit: 1500, taxes: 450, depreciation: 500, capex: 500, deltaNwc: 0 }),
  );
  const bar = byKey(bars);

  assert.deepEqual(
    bars.map((item) => item.key),
    ["EBIT", "OPERATING_TAXES", "NOPAT", "DEPRECIATION", "CAPEX", "DELTA_NWC", "FCFF"],
  );
  assert.deepEqual([bar.EBIT.range, bar.EBIT.tone], [[0, 1500], "positive"]);
  assert.deepEqual([bar.OPERATING_TAXES.range, bar.OPERATING_TAXES.tone], [[1050, 1500], "negative"]);
  assert.deepEqual([bar.NOPAT.range, bar.NOPAT.tone, bar.NOPAT.value], [[0, 1050], "subtotal", 1050]);
  assert.deepEqual([bar.DEPRECIATION.range, bar.DEPRECIATION.tone], [[1050, 1550], "positive"]);
  assert.deepEqual([bar.CAPEX.range, bar.CAPEX.tone], [[1050, 1550], "negative"]);
  assert.deepEqual([bar.DELTA_NWC.range, bar.DELTA_NWC.value], [[1050, 1050], 0]);
  assert.deepEqual([bar.FCFF.range, bar.FCFF.tone, bar.FCFF.value], [[0, 1050], "total", 1050]);
});

test("cada barra DELTA empieza donde terminó la anterior", () => {
  const bars = buildWaterfallChartData(
    waterfall({ ebit: 2100, taxes: 630, depreciation: 800, capex: 4100, deltaNwc: 500 }),
  );
  const deltas = bars.filter((bar) => bar.kind === "DELTA");

  assert.equal(deltas[0].start, 0);
  for (let index = 1; index < deltas.length; index += 1) {
    assert.equal(deltas[index].start, deltas[index - 1].end);
  }
  assert.equal(deltas.at(-1).end, byKey(bars).FCFF.value);
});

test("un Capex mayor que el flujo operativo cruza el cero y deja un FCL negativo", () => {
  const bar = byKey(
    buildWaterfallChartData(
      waterfall({ ebit: 1200, taxes: 360, depreciation: 600, capex: 4100, deltaNwc: 500 }),
    ),
  );

  // Capex baja de 1.440 a -2.660: el rango contiene al cero.
  assert.deepEqual([bar.CAPEX.start, bar.CAPEX.end, bar.CAPEX.range], [1440, -2660, [-2660, 1440]]);
  assert.equal(bar.CAPEX.tone, "negative");
  assert.deepEqual([bar.DELTA_NWC.range, bar.DELTA_NWC.tone], [[-3160, -2660], "negative"]);
  // El total negativo se apoya en cero y cuelga hacia abajo.
  assert.deepEqual([bar.FCFF.range, bar.FCFF.value, bar.FCFF.tone], [[-3160, 0], -3160, "total"]);
});

test("EBIT negativo: sin impuestos operativos y subtotal por debajo de cero", () => {
  const bar = byKey(
    buildWaterfallChartData(
      waterfall({ ebit: -300, taxes: 0, depreciation: 400, capex: 400, deltaNwc: -1500 }),
    ),
  );

  assert.deepEqual([bar.EBIT.range, bar.EBIT.tone], [[-300, 0], "negative"]);
  assert.deepEqual([bar.NOPAT.range, bar.NOPAT.tone], [[-300, 0], "subtotal"]);
  // Depreciación sube de -300 a 100 cruzando el cero.
  assert.deepEqual([bar.DEPRECIATION.range, bar.DEPRECIATION.tone], [[-300, 100], "positive"]);
  // Liberar capital de trabajo (delta_nwc negativo) suma caja.
  assert.deepEqual([bar.DELTA_NWC.range, bar.DELTA_NWC.tone], [[-300, 1200], "positive"]);
  assert.equal(bar.FCFF.value, 1200);
});

test("el CSV del historial lleva BOM, encabezado y escapa comas y valores nulos", () => {
  const entry = {
    quarter: 1,
    selected_project_id: null,
    financing_option: null,
    shock_id: "RF_HIKE",
    revenue: 12000,
    ebitda: 2000.123456789,
    net_income: 987,
    free_cash_flow_firm: -1950.5,
    cash: 0,
    total_debt: 6000,
    shareholders_equity: 15500,
    interest_coverage: 16.666666666,
    credit_rating: "AAA/A",
    wacc: 0.0964,
    roic_annualized: 0.21,
    eva_annualized: 2272,
    emergency_debt: 0,
    game_status: "ACTIVE",
  };
  const csv = buildHistoryCsv([entry, { ...entry, quarter: 2, selected_project_id: 'P01, "A"' }]);
  const lines = csv.split("\r\n");

  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.equal(lines.length, 4);
  assert.equal(lines[0].slice(1).split(",").length, 18);
  assert.ok(lines[0].slice(1).startsWith("quarter,selected_project_id,financing_option,shock_id,"));
  assert.equal(
    lines[1],
    "1,,,RF_HIKE,12000,2000.123457,987,-1950.5,0,6000,15500,16.666667,AAA/A,0.0964,0.21,2272,0,ACTIVE",
  );
  assert.ok(lines[2].startsWith('2,"P01, ""A""",,RF_HIKE,'));
  assert.equal(
    historyCsvFileName("Metalúrgica Austral S.A.", "sim_mod_1"),
    "metalurgica-austral-s-a_sim_mod_1_historial.csv",
  );
});
