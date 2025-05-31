/**
 * Error handling utilities for Mealie Node-RED nodes
 */

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

/**
 * Wrap async Mealie operations with error handling
 * @param {Function} operation - The async operation to execute
 * @param {object} node - The Node-RED node instance
 * @param {object} msg - The message object
 */
async function withErrorHandling(operation, node, msg) {
    try {
        return await operation();
    } catch (error) {
        // Transform known error types
        if (error.name === 'FetchError' || error.code === 'ECONNREFUSED') {
            throw new NetworkError(`Connection failed: ${error.message}`, error);
        }
        
        if (error.statusCode === 401 || error.statusCode === 403) {
            throw new AuthenticationError('Authentication failed', error);
        }
        
        if (error.statusCode === 400) {
            throw new ValidationError('Invalid request data', error);
        }
        
        // Re-throw as generic MealieError if unknown
        if (!(error instanceof MealieError)) {
            throw new MealieError(error.message, 'UNKNOWN_ERROR', error);
        }
        
        throw error;
    }
}

module.exports = {
    MealieError,
    NetworkError,
    AuthenticationError,
    ValidationError,
    ConfigurationError,
    withErrorHandling,
    handleError
};