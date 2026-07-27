const failureTracker = new Map<string, { count: number; lastAt: number }>();

export function recordFailureDelayKey(key: string): number {
  const existing = failureTracker.get(key);
  const count = (existing?.count ?? 0) + 1;
  failureTracker.set(key, { count, lastAt: Date.now() });
  return count;
}

export function clearFailureDelayKey(key: string): void {
  failureTracker.delete(key);
}

export async function applyProgressiveLoginDelay(failedAttempts: number): Promise<void> {
  if (failedAttempts <= 0) return;
  const delayMs = Math.min(failedAttempts * 1000, 10_000);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}
