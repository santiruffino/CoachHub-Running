/**
 * Cache Service
 * 
 * Provides a simple caching mechanism using sessionStorage with expiration times.
 * Useful for reducing API calls and improving perceived performance.
 */

interface CacheItem<T> {
    data: T;
    expiry: number;
}

class CacheService {
    private readonly prefix = 'coachhub_cache_';

    /**
     * Get an item from the cache
     * @param key - Cache key
     * @returns The cached data if available and not expired, otherwise null
     */
    get<T>(key: string): T | null {
        if (typeof window === 'undefined') return null;

        const fullKey = this.prefix + key;
        const itemStr = sessionStorage.getItem(fullKey);

        if (!itemStr) return null;

        try {
            const item: CacheItem<T> = JSON.parse(itemStr);
            const now = Date.now();

            if (now > item.expiry) {
                sessionStorage.removeItem(fullKey);
                return null;
            }

            return item.data;
        } catch (error) {
            console.error('Error parsing cache item', error);
            sessionStorage.removeItem(fullKey);
            return null;
        }
    }

    /**
     * Set an item in the cache
     * @param key - Cache key
     * @param data - Data to cache
     * @param ttlSeconds - Time-to-live in seconds (default: 5 minutes)
     */
    set<T>(key: string, data: T, ttlSeconds: number = 300): void {
        if (typeof window === 'undefined') return;

        const fullKey = this.prefix + key;
        const expiry = Date.now() + ttlSeconds * 1000;

        const item: CacheItem<T> = {
            data,
            expiry
        };

        try {
            sessionStorage.setItem(fullKey, JSON.stringify(item));
        } catch (error) {
            console.warn('Cache set failed (likely quota exceeded)', error);
            // If sessionStorage is full, clear our prefix and try once more
            this.clear();
            try {
                sessionStorage.setItem(fullKey, JSON.stringify(item));
            } catch (retryError) {
                console.error('Final cache set failed', retryError);
            }
        }
    }

    /**
     * Remove an item from the cache
     * @param key - Cache key
     */
    remove(key: string): void {
        if (typeof window === 'undefined') return;
        sessionStorage.removeItem(this.prefix + key);
    }

    /**
     * Clear all items starting with our prefix
     */
    clear(): void {
        if (typeof window === 'undefined') return;

        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key?.startsWith(this.prefix)) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => sessionStorage.removeItem(key));
    }

    /**
     * Helper to generate a consistent key for API calls
     */
    generateApiKey(endpoint: string, params?: Record<string, any>): string {
        const paramStr = params ? JSON.stringify(params) : '';
        return `api_${endpoint}_${paramStr}`;
    }
}

export const cacheService = new CacheService();
