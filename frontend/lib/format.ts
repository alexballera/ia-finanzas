/** Formato de cifras del simulador: montos en miles de USD, tasas anualizadas. */

const INTEGER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

function decimal(value: number, digits: number): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** 1500 -> "$1.500k"; -320.4 -> "-$320k". */
export function formatThousandsUsd(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}$${INTEGER.format(Math.abs(rounded))}k`;
}

/** Igual que `formatThousandsUsd`, con signo explícito para variaciones y VAN. */
export function formatSignedThousandsUsd(value: number): string {
  return Math.round(value) > 0 ? `+${formatThousandsUsd(value)}` : formatThousandsUsd(value);
}

/** 0.0964 -> "9,64%". */
export function formatPercent(rate: number, digits = 2): string {
  return `${decimal(rate * 100, digits)}%`;
}

/** 0.0123 -> "+1,23 pp". */
export function formatPercentagePoints(rateDifference: number): string {
  const points = rateDifference * 100;
  const sign = points > 0 ? "+" : "";
  return `${sign}${decimal(points, 2)} pp`;
}

/** 16.666 -> "16,67x". */
export function formatMultiple(value: number): string {
  return `${decimal(value, 2)}x`;
}
