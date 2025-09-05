/**
 * Input validation and sanitization utilities for Mealie Node-RED nodes
 */

const { ValidationError } = require('./errors');

// Constants for validation limits
const MAX_STRING_LENGTH = 10000;
const MAX_ARRAY_LENGTH = 1000;
const MAX_OBJECT_KEYS = 100;
const MAX_JSON_SIZE = 1024 * 1024; // 1MB

// Simple validation patterns
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_ID_STRING_LENGTH = 100;
const MAX_SLUG_LENGTH = 100;
const MAX_OPERATION_LENGTH = 50;

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

    if (jsonString.length > maxSize) {
        throw new ValidationError(`JSON string exceeds maximum size limit of ${maxSize} bytes`);
    }
    
    try {
        const parsed = JSON.parse(jsonString);
        
        // Basic prototype pollution protection
        if (typeof parsed === 'object' && parsed !== null) {
            validateObjectStructure(parsed);
        }
        
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

    // Handle required validation
    if (required && (input === null || input === undefined)) {
        throw new ValidationError('Required string value is missing');
    }

    // Convert input to string if not required and null/undefined
    if (!required && (input === null || input === undefined)) {
        return '';
    }

    // Convert input to string
    let result = String(input);

    // Trim if requested
    if (trim) {
        result = result.trim();
    }

    // Check minimum length
    if (result.length < minLength) {
        throw new ValidationError(`String must be at least ${minLength} characters`);
    }

    // Check maximum length
    if (result.length > maxLength) {
        throw new ValidationError('String length exceeds maximum allowed');
    }

    // Check pattern if provided
    if (pattern && !pattern.test(result)) {
        throw new ValidationError('String does not match required pattern');
    }

    return result;
}

/**
 * Validate a slug format (used for recipe slugs, etc.)
 * @param {string} slug - The slug to validate
 * @param {boolean} required - Whether the slug is required
 * @param {string} context - Context for error messages (e.g., 'recipe slug for get operation')
 * @returns {string} - Validated slug
 */
function validateSlug(slug, required = true, context = 'slug') {
    // Handle optional slugs
    if (!required && (slug === null || slug === undefined)) {
        return '';
    }

    // Handle required slugs that are missing
    if (slug === null || slug === undefined) {
        if (context.includes(' for ')) {
            const parts = context.split(' for ');
            throw new ValidationError(`No ${parts[0]} provided for ${parts[1]}. Specify in node config or msg.payload.slug`);
        } else {
            throw new ValidationError(`No ${context} provided. Specify in node config or msg.payload.slug`);
        }
    }

    // Convert to string and validate
    const slugStr = String(slug);

    // Check length
    if (slugStr.length > MAX_SLUG_LENGTH) {
        throw new ValidationError('Slug length exceeds maximum allowed');
    }

    // Check pattern
    if (!SLUG_PATTERN.test(slugStr)) {
        throw new ValidationError('Slug does not match required pattern');
    }

    return slugStr;
}

/**
 * Validate an ID (numeric or string)
 * @param {any} id - The ID to validate
 * @param {boolean} required - Whether the ID is required
 * @param {string} context - Context for error messages (e.g., 'asset ID for get asset action')
 * @returns {string|number} - Validated ID
 */
function validateId(id, required = true, context = 'ID') {
    // Handle optional IDs
    if (!required && (id === null || id === undefined)) {
        return null;
    }

    // Handle required IDs that are missing
    if (id === null || id === undefined) {
        if (context.includes(' for ')) {
            const parts = context.split(' for ');
            throw new ValidationError(`No ${parts[0]} provided for ${parts[1]}`);
        } else {
            throw new ValidationError(`No ${context} provided`);
        }
    }

    // Handle numbers
    if (typeof id === 'number') {
        if (!Number.isInteger(id) || id < 0) {
            throw new ValidationError('ID must be a non-negative integer');
        }
        return id;
    }

    // Handle strings
    if (typeof id === 'string') {
        const trimmed = id.trim();
        
        if (trimmed === '') {
            throw new ValidationError('ID cannot be empty');
        }
        
        // Check string length
        if (trimmed.length > MAX_ID_STRING_LENGTH) {
            throw new ValidationError('ID length exceeds maximum allowed');
        }
        
        // Try to convert numeric strings to numbers
        const num = Number(trimmed);
        if (!isNaN(num) && Number.isInteger(num) && num >= 0) {
            return num;
        }
        
        return trimmed;
    }

    // Reject other types
    throw new ValidationError('ID must be a number or string');
}

/**
 * Validate operation parameter
 * @param {string} operation - The operation to validate
 * @param {array} allowedOperations - List of allowed operations
 * @returns {string} - Validated operation
 */
function validateOperation(operation, allowedOperations) {
    if (!operation || typeof operation !== 'string') {
        throw new ValidationError('Operation must be a string');
    }

    const trimmed = operation.trim();

    if (trimmed === '') {
        throw new ValidationError('Operation cannot be empty');
    }

    if (trimmed.length > MAX_OPERATION_LENGTH) {
        throw new ValidationError('Operation name too long');
    }

    if (!allowedOperations.includes(trimmed)) {
        throw new ValidationError(`Unsupported operation: ${trimmed}. Allowed: ${allowedOperations.join(', ')}`);
    }

    return trimmed;
}

/**
 * Validate and sanitize recipe data object
 * @param {any} recipeData - The recipe data to validate
 * @returns {object} - Validated recipe data
 */
function validateRecipeData(recipeData) {
    if (!recipeData || typeof recipeData !== 'object' || Array.isArray(recipeData)) {
        throw new ValidationError('Recipe data must be a valid object');
    }

    const validated = {};

    // Validate string fields with length limits
    const stringFields = {
        name: { max: 255, min: 1 },
        description: { max: 5000 },
        summary: { max: 5000 },
        instructions: { max: 20000 },
        notes: { max: 5000 }
    };

    for (const [field, limits] of Object.entries(stringFields)) {
        if (field in recipeData && recipeData[field] !== null && recipeData[field] !== undefined) {
            const value = String(recipeData[field]);
            if (limits.min && value.length < limits.min) {
                throw new ValidationError(`${field} is too short`);
            }
            if (value.length > limits.max) {
                throw new ValidationError(`${field} length exceeds maximum allowed`);
            }
            validated[field] = value;
        }
    }

    // Validate numeric fields
    const numericFields = ['prepTime', 'cookTime', 'totalTime'];
    for (const field of numericFields) {
        if (field in recipeData && recipeData[field] !== null && recipeData[field] !== undefined) {
            const value = Number(recipeData[field]);
            if (isNaN(value) || value < 0) {
                throw new ValidationError(`${field} must be a non-negative number`);
            }
            validated[field] = value;
        }
    }

    // Validate array fields
    const arrayFields = ['recipeIngredient', 'recipeInstructions', 'tags', 'categories'];
    for (const field of arrayFields) {
        if (field in recipeData && recipeData[field] !== null && recipeData[field] !== undefined) {
            if (!Array.isArray(recipeData[field])) {
                throw new ValidationError(`${field} must be an array`);
            }
            if (recipeData[field].length > MAX_ARRAY_LENGTH) {
                throw new ValidationError(`${field} array too large`);
            }
            validated[field] = recipeData[field];
        }
    }

    // Validate recipeYield (can be string or number)
    if ('recipeYield' in recipeData && recipeData.recipeYield !== null && recipeData.recipeYield !== undefined) {
        if (typeof recipeData.recipeYield === 'string') {
            if (recipeData.recipeYield.length > 50) {
                throw new ValidationError('recipeYield string too long');
            }
            validated.recipeYield = recipeData.recipeYield;
        } else if (typeof recipeData.recipeYield === 'number') {
            if (recipeData.recipeYield < 0) {
                throw new ValidationError('recipeYield must be non-negative');
            }
            validated.recipeYield = recipeData.recipeYield;
        } else {
            throw new ValidationError('recipeYield must be string or number');
        }
    }

    return validated;
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