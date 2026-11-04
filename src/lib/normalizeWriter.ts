/**
 * Normalizes writer field from legacy format to string
 * Legacy format: ["howard"] (array)
 * New format: {name: "howard", id: "..."} (object) or "howard" (string)
 */
export function normalizeWriter(writer: any): string {
  if (!writer) return "Unknown";
  
  // If it's an array (legacy PostgreSQL format)
  if (Array.isArray(writer)) {
    return writer[0] || "Unknown";
  }
  
  // If it's an object (new Convex format)
  if (typeof writer === "object" && writer.name) {
    return writer.name;
  }
  
  // If it's already a string
  if (typeof writer === "string") {
    return writer;
  }
  
  return "Unknown";
}

