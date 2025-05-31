/**
 * Client wrapper for managing Mealie client instances
 */

const { ConfigurationError, withErrorHandling, NetworkError, RateLimitError, AuthenticationError, ValidationError, MealieError } = require('./errors');
const { retry, handleWhen, ExponentialBackoff } = require('cockatiel');

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

// Retry policy configuration
const retryPolicy = retry(
    handleWhen((error) => {
        // Retry on network errors
        if (error.name === 'FetchError' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            return true;
        }
        
        // Retry on rate limiting (429)
        if (error.statusCode === 429) {
            return true;
        }
        
        // Retry on temporary server errors (5xx)
        if (error.statusCode >= 500 && error.statusCode < 600) {
            return true;
        }
        
        // Don't retry on authentication errors or client errors
        return false;
    }),
    {
        maxAttempts: 3,
        backoff: new ExponentialBackoff({
            initialDelay: process.env.NODE_ENV === 'test' ? 10 : 1000,  // Faster for tests
            maxDelay: process.env.NODE_ENV === 'test' ? 100 : 30000,    // Faster for tests
            exponent: 2,         // Double each time
            jitter: process.env.NODE_ENV !== 'test'   // Disable jitter in tests for predictability
        })
    }
);

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
 * Execute a Mealie operation with error handling and retry logic
 * @param {object} config - The server configuration node
 * @param {Function} operation - The operation to execute with the client
 * @param {object} node - The Node-RED node instance
 * @param {object} msg - The message object
 * @returns {Promise<any>} - Result of the operation
 */
async function executeWithClient(config, operation, node, msg) {
    try {
        return await retryPolicy.execute(async ({ attempt }) => {
            if (attempt > 1) {
                node.log(`Retry attempt ${attempt} of 3`);
            }
            
            const client = await getClient(config);
            return await operation(client);
        });
    } catch (error) {
        // Transform error after retries are exhausted
        let transformedError = error;
        
        // Transform known error types
        if (error.name === 'FetchError' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            transformedError = new NetworkError(`Connection failed: ${error.message}`, error);
        } else if (error.statusCode === 429) {
            transformedError = new RateLimitError('Rate limit exceeded', error);
        } else if (error.statusCode === 401 || error.statusCode === 403) {
            transformedError = new AuthenticationError('Authentication failed', error);
        } else if (error.statusCode === 400) {
            transformedError = new ValidationError('Invalid request data', error);
        } else if (!(error instanceof MealieError)) {
            transformedError = new MealieError(error.message, 'UNKNOWN_ERROR', error);
        }
        
        throw transformedError;
    }
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
    _clientCache: clientCache // For testing purposes
};