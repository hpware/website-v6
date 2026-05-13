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

/**
 * Normalizes timestamp from legacy string format to Date
 * Legacy format: "2025-07-06 03:03:46.940988+00" (string)
 * New format: 1234567890 (number timestamp)
 */
export function normalizeTimestamp(timestamp: any): Date {
  if (timestamp == null) return new Date();

  // If it's already a Date instance, return it unchanged
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // If it's already a number (new format)
  if (typeof timestamp === "number") {
    return new Date(timestamp);
  }

  // If it's a string (legacy PostgreSQL timestamp)
  if (typeof timestamp === "string") {
    return new Date(timestamp);
  }

  return new Date();
}
