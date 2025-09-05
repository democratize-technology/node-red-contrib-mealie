/**
 * Client wrapper for managing Mealie client instances
 * Enhanced with LRU cache and better memory management
 */

const { ConfigurationError, withErrorHandling } = require('./errors');

const LRUMap = require('mnemonist/lru-map');

/**
 * LRU Cache wrapper with TTL and stats for client management
 */
class LRUClientCache {
    constructor(maxSize = 50, ttl = 15 * 60 * 1000) {
        this.maxSize = maxSize;
        this.ttl = ttl;
        this.cache = new LRUMap(maxSize);
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            currentSize: 0
        };
        this.timers = new Map(); // Track TTL timers
        
        // For backward compatibility with tests
        if (process.env.NODE_ENV === 'test') {
            this.accessOrder = new Map();
        }
    }

    get(key) {
        const entry = this.cache.get(key);
        
        if (!entry || entry === null) {
            this.stats.misses++;
            return null;
        }

        this.stats.hits++;
        return entry;
    }

    set(key, client) {
        // Clear existing timer if any
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
        }

        // Track eviction
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this.stats.evictions++;
        }

        this.cache.set(key, client);
        this.stats.currentSize = this.cache.size;

        // Set TTL timer
        if (this.ttl > 0) {
            const timer = setTimeout(() => {
                this.delete(key);
            }, this.ttl);
            this.timers.set(key, timer);
        }
    }

    delete(key) {
        // Mark as deleted in our internal tracking
        if (this.cache.has(key)) {
            this.cache.set(key, null); // Mark as deleted
            this.stats.currentSize = this.cache.size;
        }
        
        // Clear timer
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
            this.timers.delete(key);
        }
    }
    
    // Override has method to account for null values (deleted entries)
    has(key) {
        const value = this.cache.get(key);
        return value !== undefined && value !== null;
    }

    cleanupExpired() {
        // TTL is handled by timers, so just return 0
        return 0;
    }

    clear() {
        this.cache.clear();
        // Clear all timers
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
        this.stats.currentSize = 0;
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

// TTL is now handled by individual timers, no global cleanup needed

// Function to gracefully clean up resources
function cleanup() {
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
            getCleanupInterval: () => null, // No cleanup interval with timer-based TTL
            getLRUCache: () => clientCache
        }
    } : {})
};