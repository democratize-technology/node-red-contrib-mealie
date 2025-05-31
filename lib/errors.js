/**
 * Error handling utilities for Mealie Node-RED nodes
 */

const { retry, ExponentialBackoff, handleWhen } = require('cockatiel');

// Retry configuration constants
const RETRY_CONFIG = {
    ENABLED: process.env.MEALIE_RETRY_ENABLED !== 'false', // Allow opt-out via environment variable
    MAX_ATTEMPTS: 3,
    INITIAL_DELAY: process.env.NODE_ENV === 'test' ? 10 : 1000, // 1 second or 10ms for tests
    MAX_DELAY: process.env.NODE_ENV === 'test' ? 40 : 30000, // 30 seconds or 40ms for tests
    JITTER_FACTOR: 0.3 // Increased jitter to prevent retry storms
};

class MealieError extends Error {
    constructor(message, code = 'UNKNOWN_ERROR', details = null) {
        super(message);
        this.name = 'MealieError';
        this.code = code;
        this.details = details;
    }
}

class NetworkError extends MealieError {
    constructor(message, details = null) {
        super(message, 'NETWORK_ERROR', details);
        this.name = 'NetworkError';
    }
}

class AuthenticationError extends MealieError {
    constructor(message, details = null) {
        super(message, 'AUTH_ERROR', details);
        this.name = 'AuthenticationError';
    }
}

class ValidationError extends MealieError {
    constructor(message, details = null) {
        super(message, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}

class ConfigurationError extends MealieError {
    constructor(message, details = null) {
        super(message, 'CONFIG_ERROR', details);
        this.name = 'ConfigurationError';
    }
}

class RateLimitError extends MealieError {
    constructor(message, details = null) {
        super(message, 'RATE_LIMIT_ERROR', details);
        this.name = 'RateLimitError';
    }
}

/**
 * Handle Mealie errors and send to error output
 * @param {Error} error - The error to handle
 * @param {object} node - The Node-RED node instance
 * @param {object} msg - The message object
 */
function handleError(error, node, msg) {
    // Log error to Node-RED console
    node.error(`Mealie Error: ${error.message}`);

    // Transform message for error output
    msg.payload = {
        success: false,
        error: {
            message: error.message,
            code: error instanceof MealieError ? error.code : 'UNKNOWN_ERROR',
            details: error instanceof MealieError ? error.details : error
        }
    };

    // Send to second output (error output)
    node.send([null, msg]);
}

// Create retry policy with exponential backoff
const retryPolicy = retry(
    handleWhen(err => {
        // Retry on NetworkError or RateLimitError instances
        if (err instanceof NetworkError || err instanceof RateLimitError) {
            return true;
        }

        // Retry on 5xx server errors
        if (err.statusCode && err.statusCode >= 500) {
            return true;
        }

        // Don't retry on auth or validation errors
        if (err.statusCode === 401 || err.statusCode === 403 || err.statusCode === 400) {
            return false;
        }

        // Don't retry on other client errors (4xx)
        if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
            return false;
        }

        return false;
    }),
    {
        maxAttempts: RETRY_CONFIG.MAX_ATTEMPTS,
        backoff: new ExponentialBackoff({
            initialDelay: RETRY_CONFIG.INITIAL_DELAY,
            maxDelay: RETRY_CONFIG.MAX_DELAY,
            randomizationFactor: RETRY_CONFIG.JITTER_FACTOR
        })
    }
);

/**
 * Transform various error types into appropriate MealieError subclasses
 * @param {Error} error - The error to transform
 * @returns {MealieError} - The transformed error
 */
function transformError(error) {
    // Network errors
    if (error.name === 'FetchError' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return new NetworkError(`Connection failed: ${error.message}`, error);
    }

    // Rate limiting
    if (error.statusCode === 429) {
        return new RateLimitError('Rate limit exceeded', error);
    }

    // Authentication errors
    if (error.statusCode === 401 || error.statusCode === 403) {
        return new AuthenticationError('Authentication failed', error);
    }

    // Validation errors
    if (error.statusCode === 400) {
        return new ValidationError('Invalid request data', error);
    }

    // Already a MealieError - return as-is
    if (error instanceof MealieError) {
        return error;
    }

    // Generic error transformation
    const mealieError = new MealieError(error.message, 'UNKNOWN_ERROR', error);
    // Preserve statusCode for retry policy
    if (error.statusCode) {
        mealieError.statusCode = error.statusCode;
    }
    return mealieError;
}

/**
 * Wrap async Mealie operations with error handling and retry logic
 * @param {Function} operation - The async operation to execute
 * @param {object} node - The Node-RED node instance
 */
async function withErrorHandling(operation, node) {
    // If retries are disabled, execute operation directly with error transformation
    if (!RETRY_CONFIG.ENABLED) {
        try {
            return await operation();
        } catch (error) {
            throw transformError(error);
        }
    }

    return retryPolicy.execute(async (context) => {
        // Log retry attempts (but not on first attempt)
        if (context.attempt > 0) {
            node.log(`Retry attempt ${context.attempt + 1}`);
        }

        try {
            return await operation();
        } catch (error) {
            throw transformError(error);
        }
    });
}

module.exports = {
    MealieError,
    NetworkError,
    AuthenticationError,
    ValidationError,
    ConfigurationError,
    RateLimitError,
    transformError,
    withErrorHandling,
    handleError
};