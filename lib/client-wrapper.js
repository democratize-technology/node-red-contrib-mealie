/**
 * Client wrapper for managing Mealie client instances
 */

const { ConfigurationError, withErrorHandling } = require('./errors');

/**
 * Cache of authenticated Mealie clients
 * Key: config node ID
 * Value: { client: MealieClient, lastUsed: timestamp }
 */
const clientCache = new Map();

// Clean up stale clients every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const CLIENT_TIMEOUT = 15 * 60 * 1000; // 15 minutes

function cleanupStaleClients() {
    const now = Date.now();
    for (const [key, value] of clientCache.entries()) {
        if (now - value.lastUsed > CLIENT_TIMEOUT) {
            clientCache.delete(key);
        }
    }
}

let cleanupInterval = null;

// Only start the interval if not in test environment
if (process.env.NODE_ENV !== 'test') {
    cleanupInterval = setInterval(cleanupStaleClients, CLEANUP_INTERVAL);
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
        cached.lastUsed = Date.now();
        return cached.client;
    }

    // Create new client
    const client = await config.getMealieClient();

    // Cache the client
    clientCache.set(config.id, {
        client,
        lastUsed: Date.now()
    });

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

module.exports = {
    getClient,
    executeWithClient,
    clearClient,
    cleanup, // For testing purposes
    _clientCache: clientCache, // For testing purposes
    // Add test helpers only in test environment
    ...(process.env.NODE_ENV === 'test' ? {
        __testHelpers: {
            cleanupStaleClients,
            getCleanupInterval: () => cleanupInterval
        }
    } : {})
};