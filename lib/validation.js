/**
 * Input validation and sanitization utilities for Mealie Node-RED nodes
 */

const { ValidationError } = require('./errors');
const { z } = require('zod');

// Constants for validation limits
const MAX_STRING_LENGTH = 10000;
const MAX_ARRAY_LENGTH = 1000;
const MAX_OBJECT_KEYS = 100;
const MAX_JSON_SIZE = 1024 * 1024; // 1MB

// Zod schemas
const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format').max(100);
const idSchema = z.union([
    z.number().int().min(0),
    z.string().min(1).max(100).transform((val, ctx) => {
        // Try to convert numeric strings to numbers
        const trimmed = val.trim();
        const num = Number(trimmed);
        if (!isNaN(num) && Number.isInteger(num) && num >= 0) {
            return num;
        }
        if (trimmed === '') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'ID cannot be empty'
            });
            return z.NEVER;
        }
        return trimmed;
    })
]);
const operationSchema = z.string().min(1).max(50);

const recipeSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(5000).optional(),
    summary: z.string().max(5000).optional(),
    instructions: z.string().max(20000).optional(),
    notes: z.string().max(5000).optional(),
    recipeIngredient: z.array(z.any()).max(MAX_ARRAY_LENGTH).optional(),
    recipeInstructions: z.array(z.any()).max(MAX_ARRAY_LENGTH).optional(),
    tags: z.array(z.any()).max(MAX_ARRAY_LENGTH).optional(),
    categories: z.array(z.any()).max(MAX_ARRAY_LENGTH).optional(),
    prepTime: z.number().min(0).optional(),
    cookTime: z.number().min(0).optional(),
    totalTime: z.number().min(0).optional(),
    recipeYield: z.union([z.string().max(50), z.number().min(0)]).optional()
});

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

    try {
        let schema = z.string();
        
        if (!required) {
            schema = z.union([z.string(), z.null(), z.undefined()]).transform(val => 
                val === null || val === undefined ? '' : String(val)
            );
        }
        
        let result = schema.parse(input);
        
        if (trim && typeof result === 'string') {
            result = result.trim();
        }
        
        const finalSchema = z.string().min(minLength).max(maxLength);
        if (pattern) {
            finalSchema.regex(pattern, 'String does not match required pattern');
        }
        
        return finalSchema.parse(result);
    } catch (error) {
        if (error.name === 'ZodError') {
            throw new ValidationError(error.issues?.[0]?.message || 'String validation error');
        }
        throw error;
    }
}

/**
 * Validate a slug format (used for recipe slugs, etc.)
 * @param {string} slug - The slug to validate
 * @param {boolean} required - Whether the slug is required
 * @param {string} context - Context for error messages (e.g., 'recipe slug for get operation')
 * @returns {string} - Validated slug
 */
function validateSlug(slug, required = true, context = 'slug') {
    try {
        if (!required) {
            const optionalSchema = z.union([slugSchema, z.null(), z.undefined()]).transform(val => 
                val === null || val === undefined ? '' : val
            );
            return optionalSchema.parse(slug);
        }
        
        return slugSchema.parse(slug);
    } catch (error) {
        if (error.name === 'ZodError') {
            if (slug === null || slug === undefined) {
                if (context.includes(' for ')) {
                    const parts = context.split(' for ');
                    throw new ValidationError(`No ${parts[0]} provided for ${parts[1]}. Specify in node config or msg.payload.slug`);
                } else {
                    throw new ValidationError(`No ${context} provided. Specify in node config or msg.payload.slug`);
                }
            }
            throw new ValidationError(error.issues?.[0]?.message || 'Invalid slug format');
        }
        throw error;
    }
}

/**
 * Validate an ID (numeric or string)
 * @param {any} id - The ID to validate
 * @param {boolean} required - Whether the ID is required
 * @param {string} context - Context for error messages (e.g., 'asset ID for get asset action')
 * @returns {string|number} - Validated ID
 */
function validateId(id, required = true, context = 'ID') {
    try {
        if (!required) {
            const optionalSchema = z.union([idSchema, z.null(), z.undefined()]).transform(val => 
                val === null || val === undefined ? null : val
            );
            return optionalSchema.parse(id);
        }
        
        return idSchema.parse(id);
    } catch (error) {
        if (error.name === 'ZodError') {
            if (id === null || id === undefined) {
                if (context.includes(' for ')) {
                    const parts = context.split(' for ');
                    throw new ValidationError(`No ${parts[0]} provided for ${parts[1]}`);
                } else {
                    throw new ValidationError(`No ${context} provided`);
                }
            }
            throw new ValidationError(error.issues?.[0]?.message || 'Invalid ID format');
        }
        throw error;
    }
}

/**
 * Validate operation parameter
 * @param {string} operation - The operation to validate
 * @param {array} allowedOperations - List of allowed operations
 * @returns {string} - Validated operation
 */
function validateOperation(operation, allowedOperations) {
    try {
        let validOperation = operationSchema.parse(operation);
        
        // Trim whitespace for comparison
        if (typeof validOperation === 'string') {
            validOperation = validOperation.trim();
        }
        
        if (!allowedOperations.includes(validOperation)) {
            throw new ValidationError(`Unsupported operation: ${validOperation}. Allowed: ${allowedOperations.join(', ')}`);
        }
        
        return validOperation;
    } catch (error) {
        if (error.name === 'ZodError') {
            throw new ValidationError(error.issues?.[0]?.message || 'Invalid operation format');
        }
        throw error;
    }
}

/**
 * Validate and sanitize recipe data object
 * @param {any} recipeData - The recipe data to validate
 * @returns {object} - Validated recipe data
 */
function validateRecipeData(recipeData) {
    try {
        return recipeSchema.parse(recipeData);
    } catch (error) {
        if (error.name === 'ZodError') {
            throw new ValidationError(error.issues?.[0]?.message || 'Recipe data validation error');
        }
        throw error;
    }
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