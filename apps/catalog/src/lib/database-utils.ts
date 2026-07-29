// Copied from the monolith's lib/database-utils.ts -- small enough (two
// functions) that it's not worth a shared package just for catalog-svc's use.
export function parseJsonField(field: unknown): any[] {
  if (typeof field === "string") {
    try {
      return JSON.parse(field)
    } catch {
      return []
    }
  } else if (Array.isArray(field)) {
    return field
  } else if (field && typeof field === "object") {
    return field as any[]
  }
  return []
}

export function stringifyForDatabase(data: unknown): string {
  if (data === null || data === undefined) return "[]"
  if (typeof data === "string") {
    try {
      JSON.parse(data)
      return data
    } catch {
      return JSON.stringify([data])
    }
  }
  try {
    return JSON.stringify(data)
  } catch {
    return "[]"
  }
}
