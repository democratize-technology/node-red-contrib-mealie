/**
 * Client wrapper for managing Mealie client instances
 * Enhanced with LRU cache and better memory management
 */

const { ConfigurationError, withErrorHandling } = require('./errors');

// Using Map instead of LRUMap since we need explicit deletion capability

/**
 * LRU Cache wrapper with TTL and stats for client management
 */
class LRUClientCache {
    constructor(maxSize = 50, ttl = 15 * 60 * 1000) {
        this.maxSize = maxSize;
        this.ttl = ttl;
        this.cache = new Map(); // Use Map for explicit deletion support
        this.accessOrder = new Map(); // Track access order for LRU
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            currentSize: 0
        };
    }

    get(key) {
        const entry = this.cache.get(key);
        
        if (!entry) {
            this.stats.misses++;
            return null;
        }

        // Check if entry is expired
        if (this.ttl > 0 && entry.createdAt && (Date.now() - entry.createdAt) > this.ttl) {
            this.delete(key);
            this.stats.misses++;
            return null;
        }

        // Update last used time and access order for LRU
        const now = Date.now();
        entry.lastUsed = now;
        this.accessOrder.set(key, now);

        this.stats.hits++;
        return entry.client || entry; // Return client if wrapped, otherwise return entry directly
    }

    set(key, client) {
        // Handle LRU eviction if at capacity
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this._evictLRU();
            this.stats.evictions++;
        }

        // Wrap client with timestamp info
        const now = Date.now();
        const entry = {
            client: client,
            createdAt: now,
            lastUsed: now
        };

        this.cache.set(key, entry);
        this.accessOrder.set(key, now);
        this.stats.currentSize = this.cache.size;
    }

    _evictLRU() {
        // Find the least recently used entry
        let oldestKey = null;
        let oldestTime = Infinity;
        
        for (const [key, accessTime] of this.accessOrder.entries()) {
            if (accessTime < oldestTime) {
                oldestTime = accessTime;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.delete(oldestKey);
        }
    }

    delete(key) {
        // Actually delete the entry
        if (this.cache.has(key)) {
            this.cache.delete(key);
            this.stats.currentSize = this.cache.size;
        }
        
        // Remove from access order tracking
        this.accessOrder.delete(key);
    }
    
    has(key) {
        return this.cache.has(key);
    }

    cleanupExpired() {
        if (this.ttl <= 0) return 0;
        
        const now = Date.now();
        let cleaned = 0;
        
        // Collect expired keys
        const expiredKeys = [];
        for (const [key, entry] of this.cache.entries()) {
            if (entry.createdAt && (now - entry.createdAt) > this.ttl) {
                expiredKeys.push(key);
            }
        }
        
        // Remove expired entries
        for (const key of expiredKeys) {
            this.delete(key);
            cleaned++;
        }
        
        return cleaned;
    }

    clear() {
        this.cache.clear();
        this.accessOrder.clear();
        this.stats.currentSize = 0;
    }

    get size() {
        return this.cache.size;
    }

    getStats() {
        return {
            ...this.stats,
            hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
        };
    }
    
    // Method expected by tests - return entries from underlying cache
    entries() {
        return this.cache.entries();
    }
}

// Initialize LRU cache with configurable limits
const MAX_CACHE_SIZE = parseInt(process.env.MEALIE_CLIENT_CACHE_SIZE || '50', 10);
const CLIENT_TTL = parseInt(process.env.MEALIE_CLIENT_TTL || '900000', 10); // 15 minutes default

const clientCache = new LRUClientCache(MAX_CACHE_SIZE, CLIENT_TTL);
const shutdownManager = require('./shutdown-manager');

// Set up periodic cleanup for expired entries
let cleanupInterval = null; // Initialize as null for tests
if (process.env.NODE_ENV !== 'test' && CLIENT_TTL > 0) {
    // Clean up every 5 minutes in production
    cleanupInterval = setInterval(() => {
        clientCache.cleanupExpired();
    }, 5 * 60 * 1000);
}

// Function to gracefully clean up resources
function cleanup() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }
    clientCache.clear();
}

/**
 * Get or create an authenticated Mealie client
 * @param {object} config - The server configuration node
 * @returns {Promise<MealieClient>} - Authenticated Mealie client
 */
async function getClient(config) {
    if (!config) {
        throw new ConfigurationError('No server configuration provided');
    }

    // Check cache first
    const cached = clientCache.get(config.id);
    if (cached) {
        return cached;
    }

    // Create new client
    const client = await config.getMealieClient();

    // Cache the client
    clientCache.set(config.id, client);

    return client;
}

/**
 * Execute a Mealie operation with error handling
 * @param {object} config - The server configuration node
 * @param {Function} operation - The operation to execute with the client
 * @param {object} node - The Node-RED node instance
 * @param {object} msg - The message object
 * @returns {Promise<any>} - Result of the operation
 */
async function executeWithClient(config, operation, node, msg) {
    return withErrorHandling(async () => {
        const client = await getClient(config);
        return operation(client);
    }, node, msg);
}

/**
 * Clear client from cache (e.g., after authentication errors)
 * @param {object} config - The server configuration node
 */
function clearClient(config) {
    if (config && config.id) {
        clientCache.delete(config.id);
    }
}

/**
 * Get cache statistics for monitoring
 * @returns {object} Cache statistics
 */
function getCacheStats() {
    return {
        ...clientCache.getStats(),
        maxSize: MAX_CACHE_SIZE,
        ttl: CLIENT_TTL
    };
}

// Register cleanup with centralized shutdown manager
if (process.env.NODE_ENV !== 'test') {
    shutdownManager.register(cleanup, 'client-wrapper');
}

module.exports = {
    getClient,
    executeWithClient,
    clearClient,
    cleanup,
    getCacheStats,
    // Export for testing purposes
    _clientCache: clientCache, // Maintain backward compatibility
    // Add test helpers only in test environment
    ...(process.env.NODE_ENV === 'test' ? {
        __testHelpers: {
            cleanupStaleClients: () => clientCache.cleanupExpired(),
            getCleanupInterval: () => cleanupInterval,
            getLRUCache: () => clientCache
        }
    } : {})
};