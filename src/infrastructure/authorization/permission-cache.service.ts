import type { AuthorizationContext } from "@/shared/permissions/engine";

type CacheEntry = {
  context: AuthorizationContext;
  expiresAt: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function cacheKey(userId: string, companyId: string | null): string {
  return `permissions:${userId}:${companyId ?? "global"}`;
}

export function getCachedAuthorization(
  userId: string,
  companyId: string | null,
): AuthorizationContext | null {
  const entry = cache.get(cacheKey(userId, companyId));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(cacheKey(userId, companyId));
    return null;
  }
  return entry.context;
}

export function setCachedAuthorization(context: AuthorizationContext): void {
  cache.set(cacheKey(context.userId, context.companyId), {
    context,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function invalidateAuthorizationCache(userId: string, companyId?: string | null): void {
  if (companyId !== undefined) {
    cache.delete(cacheKey(userId, companyId));
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`permissions:${userId}:`)) {
      cache.delete(key);
    }
  }
}

export function clearAuthorizationCache(): void {
  cache.clear();
}
