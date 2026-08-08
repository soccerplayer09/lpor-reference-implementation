/**
 * Format elapsed milliseconds into a human-readable string.
 * - < 1s: "0.12s"
 * - < 60s: "3.45s"
 * - >= 60s: "2m 15s"
 */
export function formatTime(ms: number): string {
  const seconds = ms / 1000
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}m ${remainingSeconds}s`
}
