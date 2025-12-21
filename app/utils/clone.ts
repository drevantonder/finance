/**
 * Deep clone a value using JSON round-trip.
 * Strips Vue reactive proxies and functions.
 */
export function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}
