'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // time-to-live in milliseconds
}

interface CacheContextType {
    getOrFetch: <T>(
        key: string,
        fetcher: () => Promise<T>,
        ttl?: number
    ) => Promise<T>;
    invalidate: (key: string) => void;
    invalidatePattern: (pattern: string) => void;
    clearAll: () => void;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY_PREFIX = 'cache:';

export function CacheProvider({ children }: { children: React.ReactNode }) {
    const cacheRef = useRef<Map<string, CacheEntry<any>>>(new Map());
    const [, forceUpdate] = useState(0);

    // Load cache from session storage on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const keys = Object.keys(sessionStorage);
            const cacheKeys = keys.filter(k => k.startsWith(STORAGE_KEY_PREFIX));

            cacheKeys.forEach(storageKey => {
                const key = storageKey.replace(STORAGE_KEY_PREFIX, '');
                const stored = sessionStorage.getItem(storageKey);
                if (stored) {
                    try {
                        const entry: CacheEntry<any> = JSON.parse(stored);
                        // Check if entry is still valid
                        if (Date.now() - entry.timestamp < entry.ttl) {
                            cacheRef.current.set(key, entry);
                        } else {
                            // Remove expired entry
                            sessionStorage.removeItem(storageKey);
                        }
                    } catch (e) {
                        console.warn(`Failed to parse cache entry for ${key}`, e);
                    }
                }
            });
        } catch (e) {
            console.warn('Failed to load cache from session storage', e);
        }
    }, []);

    const persistToStorage = useCallback((key: string, entry: CacheEntry<any>) => {
        if (typeof window === 'undefined') return;

        try {
            sessionStorage.setItem(
                `${STORAGE_KEY_PREFIX}${key}`,
                JSON.stringify(entry)
            );
        } catch (e) {
            console.warn(`Failed to persist cache entry for ${key}`, e);
        }
    }, []);

    const getOrFetch = useCallback(async <T,>(
        key: string,
        fetcher: () => Promise<T>,
        ttl: number = DEFAULT_TTL
    ): Promise<T> => {
        const cached = cacheRef.current.get(key);

        // Check if cache is valid
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
            return cached.data as T;
        }

        // Cache miss or expired - fetch new data
        const data = await fetcher();
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl,
        };

        cacheRef.current.set(key, entry);
        persistToStorage(key, entry);

        return data;
    }, [persistToStorage]);

    const invalidate = useCallback((key: string) => {
        cacheRef.current.delete(key);

        if (typeof window !== 'undefined') {
            try {
                sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}${key}`);
            } catch (e) {
                console.warn(`Failed to remove cache entry for ${key}`, e);
            }
        }
    }, []);

    const invalidatePattern = useCallback((pattern: string) => {
        // Invalidate all keys matching pattern (e.g., "hrZones:*")
        const keysToDelete: string[] = [];

        cacheRef.current.forEach((_, key) => {
            if (key.includes(pattern.replace('*', ''))) {
                keysToDelete.push(key);
            }
        });

        keysToDelete.forEach(key => invalidate(key));
    }, [invalidate]);

    const clearAll = useCallback(() => {
        cacheRef.current.clear();

        if (typeof window !== 'undefined') {
            try {
                const keys = Object.keys(sessionStorage);
                const cacheKeys = keys.filter(k => k.startsWith(STORAGE_KEY_PREFIX));
                cacheKeys.forEach(k => sessionStorage.removeItem(k));
            } catch (e) {
                console.warn('Failed to clear cache from session storage', e);
            }
        }
    }, []);

    return (
        <CacheContext.Provider value={{ getOrFetch, invalidate, invalidatePattern, clearAll }}>
            {children}
        </CacheContext.Provider>
    );
}

export function useCache() {
    const context = useContext(CacheContext);
    if (!context) {
        throw new Error('useCache must be used within a CacheProvider');
    }
    return context;
}
