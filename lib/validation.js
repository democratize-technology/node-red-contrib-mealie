/**
 * Input validation and sanitization utilities for Mealie Node-RED nodes
 */

const { ValidationError } = require('./errors');

// Constants for validation limits
const MAX_STRING_LENGTH = 10000;
const MAX_ARRAY_LENGTH = 1000;
const MAX_OBJECT_KEYS = 100;
const MAX_JSON_SIZE = 1024 * 1024; // 1MB

/**
 * Safely parse JSON with size and error handling
 * @param {string} jsonString - The JSON string to parse
 * @param {number} maxSize - Maximum allowed size in bytes
 * @returns {object} - Parsed JSON object
 */
function safeJsonParse(jsonString, maxSize = MAX_JSON_SIZE) {
    if (typeof jsonString !== 'string') {
        throw new ValidationError('Input must be a string for JSON parsing');
    }

    // Check size limit
    if (jsonString.length > maxSize) {
        throw new ValidationError(`JSON string exceeds maximum size limit of ${maxSize} bytes`);
    }

    try {
        const parsed = JSON.parse(jsonString);

        // Additional validation for object structure
        validateObjectStructure(parsed);

        return parsed;
    } catch (error) {
        if (error instanceof ValidationError) {
            throw error;
        }
        throw new ValidationError(`Invalid JSON format: ${error.message}`);
    }
}

/**
 * Validate object structure to prevent prototype pollution and excessive nesting
 * @param {any} obj - Object to validate
 * @param {number} depth - Current nesting depth
 * @param {number} maxDepth - Maximum allowed nesting depth
 */
function validateObjectStructure(obj, depth = 0, maxDepth = 10) {
    if (depth > maxDepth) {
        throw new ValidationError(`Object nesting exceeds maximum depth of ${maxDepth}`);
    }

    if (obj === null || typeof obj !== 'object') {
        return;
    }

    if (Array.isArray(obj)) {
        if (obj.length > MAX_ARRAY_LENGTH) {
            throw new ValidationError(`Array length exceeds maximum of ${MAX_ARRAY_LENGTH}`);
        }

        for (const item of obj) {
            validateObjectStructure(item, depth + 1, maxDepth);
        }
        return;
    }

    // Check for prototype pollution attempts
    const keys = Object.keys(obj);
    if (keys.length > MAX_OBJECT_KEYS) {
        throw new ValidationError(`Object has too many keys (maximum: ${MAX_OBJECT_KEYS})`);
    }

    for (const key of keys) {
        // Check for dangerous keys
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            throw new ValidationError(`Dangerous key detected: ${key}`);
        }

        validateObjectStructure(obj[key], depth + 1, maxDepth);
    }
}

/**
 * Sanitize and validate a string input
 * @param {any} input - Input to validate as string
 * @param {object} options - Validation options
 * @returns {string} - Sanitized string
 */
function validateString(input, options = {}) {
    const {
        required = false,
        maxLength = MAX_STRING_LENGTH,
        minLength = 0,
        pattern = null,
        trim = true
    } = options;

    if (input === null || input === undefined) {
        if (required) {
            throw new ValidationError('Required string value is missing');
        }
        return '';
    }

    if (typeof input !== 'string') {
        // Try to convert to string
        try {
            input = String(input);
        } catch (error) {
            throw new ValidationError('Value cannot be converted to string');
        }
    }

    if (trim) {
        input = input.trim();
    }

    if (input.length < minLength) {
        throw new ValidationError(`String length must be at least ${minLength} characters`);
    }

    if (input.length > maxLength) {
        throw new ValidationError(`String length exceeds maximum of ${maxLength} characters`);
    }

    if (pattern && !pattern.test(input)) {
        throw new ValidationError('String does not match required pattern');
    }

    return input;
}

/**
 * Validate a slug format (used for recipe slugs, etc.)
 * @param {string} slug - The slug to validate
 * @param {boolean} required - Whether the slug is required
 * @param {string} context - Context for error messages (e.g., 'recipe slug for get operation')
 * @returns {string} - Validated slug
 */
function validateSlug(slug, required = true, context = 'slug') {
    if (slug === null || slug === undefined) {
        if (required) {
            if (context.includes(' for ')) {
                // Format: "recipe slug for get operation" -> "No recipe slug provided for get operation. Specify..."
                const parts = context.split(' for ');
                throw new ValidationError(`No ${parts[0]} provided for ${parts[1]}. Specify in node config or msg.payload.slug`);
            } else {
                throw new ValidationError(`No ${context} provided. Specify in node config or msg.payload.slug`);
            }
        }
        return '';
    }

    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

    return validateString(slug, {
        required,
        maxLength: 100,
        minLength: required ? 1 : 0,
        pattern: slugPattern,
        trim: true
    });
}

/**
 * Validate an ID (numeric or string)
 * @param {any} id - The ID to validate
 * @param {boolean} required - Whether the ID is required
 * @param {string} context - Context for error messages (e.g., 'asset ID for get asset action')
 * @returns {string|number} - Validated ID
 */
function validateId(id, required = true, context = 'ID') {
    if (id === null || id === undefined) {
        if (required) {
            if (context.includes(' for ')) {
                // Format: "asset ID for get asset action" -> "No asset ID provided for get asset action"
                const parts = context.split(' for ');
                throw new ValidationError(`No ${parts[0]} provided for ${parts[1]}`);
            } else {
                throw new ValidationError(`No ${context} provided`);
            }
        }
        return null;
    }

    // Accept both string and numeric IDs
    if (typeof id === 'number') {
        if (!Number.isInteger(id) || id < 0) {
            throw new ValidationError('Numeric ID must be a non-negative integer');
        }
        return id;
    }

    if (typeof id === 'string') {
        const trimmedId = id.trim();
        if (trimmedId === '') {
            if (required) {
                throw new ValidationError('ID cannot be empty');
            }
            return null;
        }

        // Check if it's a numeric string
        const numericId = Number(trimmedId);
        if (!isNaN(numericId) && Number.isInteger(numericId) && numericId >= 0) {
            return numericId;
        }

        // Validate as string ID (UUID-like or other formats)
        if (trimmedId.length > 100) {
            throw new ValidationError('String ID length exceeds maximum of 100 characters');
        }

        return trimmedId;
    }

    throw new ValidationError('ID must be a number or string');
}

/**
 * Validate operation parameter
 * @param {string} operation - The operation to validate
 * @param {array} allowedOperations - List of allowed operations
 * @returns {string} - Validated operation
 */
function validateOperation(operation, allowedOperations) {
    const validOperation = validateString(operation, {
        required: true,
        maxLength: 50,
        trim: true
    });

    if (!allowedOperations.includes(validOperation)) {
        throw new ValidationError(`Unsupported operation: ${validOperation}. Allowed: ${allowedOperations.join(', ')}`);
    }

    return validOperation;
}

/**
 * Validate and sanitize recipe data object
 * @param {any} recipeData - The recipe data to validate
 * @returns {object} - Validated recipe data
 */
function validateRecipeData(recipeData) {
    if (!recipeData || typeof recipeData !== 'object') {
        throw new ValidationError('Recipe data must be a valid object');
    }

    // Create a clean copy to avoid mutation
    const cleanData = {};

    // Validate name (required)
    if (recipeData.name) {
        cleanData.name = validateString(recipeData.name, {
            required: true,
            maxLength: 255,
            minLength: 1
        });
    }

    // Validate description (optional)
    if (recipeData.description !== undefined) {
        cleanData.description = validateString(recipeData.description, {
            maxLength: 5000
        });
    }

    // Validate other common recipe fields
    const optionalStringFields = ['summary', 'instructions', 'notes'];
    for (const field of optionalStringFields) {
        if (recipeData[field] !== undefined) {
            cleanData[field] = validateString(recipeData[field], {
                maxLength: field === 'instructions' ? 20000 : 5000
            });
        }
    }

    // Validate arrays (ingredients, tags, etc.)
    const arrayFields = ['recipeIngredient', 'recipeInstructions', 'tags', 'categories'];
    for (const field of arrayFields) {
        if (recipeData[field] !== undefined) {
            if (!Array.isArray(recipeData[field])) {
                throw new ValidationError(`${field} must be an array`);
            }
            if (recipeData[field].length > MAX_ARRAY_LENGTH) {
                throw new ValidationError(`${field} array exceeds maximum length`);
            }
            cleanData[field] = recipeData[field];
        }
    }

    // Validate numeric fields (but allow string values like "4 servings" for recipeYield)
    const strictNumericFields = ['prepTime', 'cookTime', 'totalTime'];
    for (const field of strictNumericFields) {
        if (recipeData[field] !== undefined) {
            const value = Number(recipeData[field]);
            if (isNaN(value) || value < 0) {
                throw new ValidationError(`${field} must be a non-negative number`);
            }
            cleanData[field] = value;
        }
    }

    // Handle recipeYield specially - can be string or number
    if (recipeData.recipeYield !== undefined) {
        if (typeof recipeData.recipeYield === 'string') {
            // Allow string values like "4 servings"
            cleanData.recipeYield = validateString(recipeData.recipeYield, { maxLength: 50 });
        } else if (typeof recipeData.recipeYield === 'number') {
            if (recipeData.recipeYield < 0) {
                throw new ValidationError('recipeYield must be a non-negative number');
            }
            cleanData.recipeYield = recipeData.recipeYield;
        } else {
            throw new ValidationError('recipeYield must be a string or number');
        }
    }

    return cleanData;
}

/**
 * Process and validate input data (handles both JSON strings and objects)
 * @param {any} data - Input data to process
 * @param {string} type - Type of data ('recipe', 'list', etc.)
 * @param {string} context - Context for error messages
 * @returns {object} - Processed and validated data
 */
function processInputData(data, type = 'generic', context = null) {
    if (!data) {
        if (context) {
            throw new ValidationError(`No ${type} data provided for ${context}. Specify in node config or msg.payload.${type}Data`);
        }
        throw new ValidationError(`No ${type} data provided`);
    }

    let processedData;

    // Handle string input (JSON parsing)
    if (typeof data === 'string') {
        processedData = safeJsonParse(data);
    } else if (typeof data === 'object') {
        // Validate object structure even if it's already an object
        validateObjectStructure(data);
        processedData = data;
    } else {
        throw new ValidationError(`${type} data must be an object or JSON string`);
    }

    // Apply specific validation based on type
    switch (type) {
    case 'recipe':
        return validateRecipeData(processedData);
    default:
        return processedData;
    }
}

module.exports = {
    safeJsonParse,
    validateObjectStructure,
    validateString,
    validateSlug,
    validateId,
    validateOperation,
    validateRecipeData,
    processInputData,
    // Export constants for testing
    MAX_STRING_LENGTH,
    MAX_ARRAY_LENGTH,
    MAX_OBJECT_KEYS,
    MAX_JSON_SIZE
};