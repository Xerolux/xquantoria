import { useRef, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function useRequestCache<T>(ttl: number = 60000) {
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());

  const get = useCallback((key: string): T | null => {
    const entry = cacheRef.current.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > ttl) {
      cacheRef.current.delete(key);
      return null;
    }
    
    return entry.data;
  }, [ttl]);

  const set = useCallback((key: string, data: T): void => {
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
    });
  }, []);

  const invalidate = useCallback((key: string): void => {
    cacheRef.current.delete(key);
  }, []);

  const clear = useCallback((): void => {
    cacheRef.current.clear();
  }, []);

  const wrap = useCallback(
    async <R extends T>(
      key: string,
      fetcher: () => Promise<R>
    ): Promise<R> => {
      const cached = get(key);
      if (cached !== null) {
        return cached as R;
      }

      const data = await fetcher();
      set(key, data);
      return data;
    },
    [get, set]
  );

  return { get, set, invalidate, clear, wrap };
}

export default useRequestCache;
