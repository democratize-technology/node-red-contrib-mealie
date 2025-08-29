/**
 * Client wrapper for managing Mealie client instances
 * Enhanced with LRU cache and better memory management
 */

const { ConfigurationError, withErrorHandling } = require('./errors');

/**
 * LRU Cache implementation for client management
 * Automatically evicts least recently used clients when size limit reached
 */
class LRUClientCache {
    constructor(maxSize = 50, ttl = 15 * 60 * 1000) {
        this.maxSize = maxSize;
        this.ttl = ttl; // Time to live in milliseconds
        this.cache = new Map();
        this.accessOrder = new Map(); // Track access order for LRU
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            currentSize: 0
        };
    }

    /**
     * Get a client from cache
     * @param {string} key - Cache key (config ID)
     * @returns {object|null} Cached client or null if not found/expired
     */
    get(key) {
        const entry = this.cache.get(key);
        
        if (!entry) {
            this.stats.misses++;
            return null;
        }

        const now = Date.now();
        
        // Check if entry has expired
        if (now - entry.createdAt > this.ttl) {
            this.delete(key);
            this.stats.misses++;
            return null;
        }

        // Update access time and move to end (most recently used)
        entry.lastUsed = now;
        this.accessOrder.delete(key);
        this.accessOrder.set(key, now);
        
        this.stats.hits++;
        return entry.client;
    }

    /**
     * Set a client in cache
     * @param {string} key - Cache key (config ID)
     * @param {object} client - Client instance to cache
     */
    set(key, client) {
        const now = Date.now();
        
        // If already exists, update it
        if (this.cache.has(key)) {
            const entry = this.cache.get(key);
            entry.client = client;
            entry.lastUsed = now;
            this.accessOrder.delete(key);
            this.accessOrder.set(key, now);
            return;
        }

        // Check if we need to evict
        if (this.cache.size >= this.maxSize) {
            this.evictLRU();
        }

        // Add new entry
        this.cache.set(key, {
            client,
            createdAt: now,
            lastUsed: now
        });
        this.accessOrder.set(key, now);
        this.stats.currentSize = this.cache.size;
    }

    /**
     * Delete a specific entry
     * @param {string} key - Cache key to delete
     */
    delete(key) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
            this.accessOrder.delete(key);
            this.stats.currentSize = this.cache.size;
        }
    }

    /**
     * Evict least recently used entry
     */
    evictLRU() {
        // Find the least recently used key
        let lruKey = null;
        let oldestTime = Infinity;
        
        for (const [key, time] of this.accessOrder.entries()) {
            if (time < oldestTime) {
                oldestTime = time;
                lruKey = key;
            }
        }

        if (lruKey) {
            this.delete(lruKey);
            this.stats.evictions++;
        }
    }

    /**
     * Clean up expired entries
     * More efficient than checking all entries periodically
     */
    cleanupExpired() {
        const now = Date.now();
        const keysToDelete = [];
        
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.createdAt > this.ttl) {
                keysToDelete.push(key);
            }
        }

        for (const key of keysToDelete) {
            this.delete(key);
        }

        return keysToDelete.length;
    }

    /**
     * Clear all entries
     */
    clear() {
        this.cache.clear();
        this.accessOrder.clear();
        this.stats.currentSize = 0;
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            ...this.stats,
            hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
        };
    }
}

// Initialize LRU cache with configurable limits
const MAX_CACHE_SIZE = parseInt(process.env.MEALIE_CLIENT_CACHE_SIZE || '50', 10);
const CLIENT_TTL = parseInt(process.env.MEALIE_CLIENT_TTL || '900000', 10); // 15 minutes default

const clientCache = new LRUClientCache(MAX_CACHE_SIZE, CLIENT_TTL);

// Adaptive cleanup interval based on usage
let cleanupInterval = null;
let cleanupIntervalTime = 5 * 60 * 1000; // Start with 5 minutes

function adaptiveCleanup() {
    const cleaned = clientCache.cleanupExpired();
    
    // Adjust cleanup interval based on activity
    if (cleaned === 0 && clientCache.cache.size < MAX_CACHE_SIZE / 2) {
        // Less frequent cleanup if cache is small and no expired entries
        cleanupIntervalTime = Math.min(cleanupIntervalTime * 1.5, 15 * 60 * 1000);
    } else if (cleaned > 5 || clientCache.cache.size > MAX_CACHE_SIZE * 0.8) {
        // More frequent cleanup if many expired or cache is nearly full
        cleanupIntervalTime = Math.max(cleanupIntervalTime * 0.75, 60 * 1000);
    }
    
    // Reschedule with new interval
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
    }
    
    if (process.env.NODE_ENV !== 'test') {
        cleanupInterval = setInterval(adaptiveCleanup, cleanupIntervalTime);
    }
}

// Start adaptive cleanup only in production
if (process.env.NODE_ENV !== 'test') {
    cleanupInterval = setInterval(adaptiveCleanup, cleanupIntervalTime);
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
        cleanupInterval: cleanupIntervalTime,
        maxSize: MAX_CACHE_SIZE,
        ttl: CLIENT_TTL
    };
}

// Clean up on process exit
if (process.env.NODE_ENV !== 'test') {
    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
}

module.exports = {
    getClient,
    executeWithClient,
    clearClient,
    cleanup,
    getCacheStats,
    // Export for testing purposes
    _clientCache: clientCache.cache, // Maintain backward compatibility
    // Add test helpers only in test environment
    ...(process.env.NODE_ENV === 'test' ? {
        __testHelpers: {
            cleanupStaleClients: () => clientCache.cleanupExpired(),
            getCleanupInterval: () => cleanupInterval,
            getLRUCache: () => clientCache
        }
    } : {})
};