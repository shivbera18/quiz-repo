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

export function stringifyForDatabase(data: any): string {
  // Always return a JSON string for consistent database storage
  if (data === null || data === undefined) {
    return "[]";
  }
  
  if (typeof data === "string") {
    // If it's already a string, check if it's valid JSON
    try {
      JSON.parse(data);
      return data; // Valid JSON string, return as-is
    } catch {
      // Not valid JSON, wrap it in an array and stringify
      return JSON.stringify([data]);
    }
  }
  
  // For arrays, objects, or other types, stringify them
  try {
    return JSON.stringify(data);
  } catch {
    // If stringify fails, return empty array
    return "[]";
  }
}
