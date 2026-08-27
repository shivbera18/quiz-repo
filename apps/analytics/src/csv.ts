export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ""
  let s = String(value)
  // Formula injection defense per .claude/skills/security-review + csv-export-pipeline:
  // neutralize cells where the first non-whitespace char is = + - @ | % \t \r
  // (OWASP: leading spaces/tabs can bypass a naive s[0] check, Excel still executes).
  // We prefix a single quote WITHOUT trimming, so original whitespace is preserved.
  const firstNonWs = s.search(/[^ \t\r\n]/)
  const c = firstNonWs === -1 ? "" : s[firstNonWs]
  if (c === "=" || c === "+" || c === "-" || c === "@" || c === "|" || c === "%" || c === "\t" || c === "\r") {
    s = "'" + s
  } else if (s.length > 0 && (s[0] === "\t" || s[0] === "\r")) {
    // Fallback for leading control chars where search above may have skipped \t
    s = "'" + s
  }
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function csvRow(values: unknown[]): string {
  return values.map(csvEscape).join(",") + "\n"
}
