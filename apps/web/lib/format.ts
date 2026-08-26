// Display-only number formatting: every rendered number outside the live
// quiz runner shows AT MOST two decimal places (66.666… -> 66.67, 66.5 stays
// 66.5, integers stay integers). The quiz itself may carry more precision.

export function fmtNum(value: number | null | undefined, maxDigits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "0"
  if (!Number.isFinite(value)) return "0"
  const factor = 10 ** maxDigits
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor
  // Trim trailing zeros so "66.50" renders as "66.5" and "66.00" as "66".
  return String(rounded)
}

/** Percentage variant: formats then appends "%". */
export function fmtPct(value: number | null | undefined, maxDigits = 2): string {
  return `${fmtNum(value, maxDigits)}%`
}
