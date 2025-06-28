// Utility functions for handling database data across different providers
export function parseJsonField(field: any): any[] {
  if (typeof field === "string") {
    try {
      return JSON.parse(field);
    } catch {
      return [];
    }
  } else if (Array.isArray(field)) {
    return field;
  } else if (field && typeof field === "object") {
    return field;
  }
  return [];
}

export function stringifyForDatabase(data: any): any {
  // For SQLite development, we need to stringify
  // For PostgreSQL production, we can pass the object directly
  const databaseUrl = process.env.DATABASE_URL || ""
  const isDevMode = !process.env.NODE_ENV || process.env.NODE_ENV === "development"
  const isSQLite = databaseUrl.includes("file:") || databaseUrl.includes("sqlite")
  
  if (isDevMode || isSQLite) {
    return JSON.stringify(data);
  }
  return data;
}
