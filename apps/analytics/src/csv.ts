export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ""
  let s = String(value)
  // Formula injection defense per .claude/skills/security-review + csv-export-pipeline:
  // neutralize cells starting with = + - @ \t \r by prefixing a single quote.
  if (s.length > 0 && (s[0] === "=" || s[0] === "+" || s[0] === "-" || s[0] === "@" || s[0] === "\t" || s[0] === "\r")) {
    s = "'" + s
  }
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function csvRow(values: unknown[]): string {
  return values.map(csvEscape).join(",") + "\n"
}
