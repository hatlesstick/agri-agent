import { Global, Module } from "@nestjs/common";
import { CACHE_STORE } from "@/common/cache/cache.tokens";
import type { CacheStore } from "@/common/cache/cache-store";
import { InMemoryCacheStore } from "@/common/cache/InMemoryCacheStore";
import { API_ENV, type ApiEnv } from "@/config";

export const SHARED_CACHE_MAX_ENTRIES = 1000;

export function createCacheStore(env: ApiEnv): CacheStore {
  if (env.CACHE_DRIVER === "redis") throw new Error("CACHE_DRIVER=redis is not implemented yet; use memory");
  return new InMemoryCacheStore({ maxEntries: SHARED_CACHE_MAX_ENTRIES });
}

@Global()
@Module({
  providers: [{ provide: CACHE_STORE, inject: [API_ENV], useFactory: createCacheStore }],
  exports: [CACHE_STORE],
})
export class CacheModule {}
