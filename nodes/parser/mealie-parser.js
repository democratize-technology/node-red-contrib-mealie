/**
 * Parser domain node for Mealie API
 * Handles multiple parser operations in a single configurable node
 */

const { executeWithClient } = require('../../lib/client-wrapper');
const { ValidationError } = require('../../lib/errors');
const { createMealieNode } = require('../../lib/base-node');

// Helper for parseUrl operation
async function handleParseUrlOperation(node, msg) {
    const url = msg.payload?.url || node.url;

    if (!url) {
        throw new ValidationError('No URL provided for parseUrl operation. Specify in node config or msg.payload.url');
    }

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.parser.parseUrl(url);
        },
        node,
        msg
    );
}

// Helper for parseText operation
async function handleParseTextOperation(node, msg) {
    const ingredientText = msg.payload?.ingredientText || node.ingredientText;

    if (!ingredientText) {
        throw new ValidationError('No ingredient text provided for parseText operation. Specify in node config or msg.payload.ingredientText');
    }

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.parser.parseIngredientText(ingredientText);
        },
        node,
        msg
    );
}

// Define allowed operations for parser node
const ALLOWED_OPERATIONS = [
    'parseUrl', 'parseText'
];

// Define operation handlers
const OPERATION_HANDLERS = {
    parseUrl: handleParseUrlOperation,
    parseText: handleParseTextOperation
};

module.exports = function(RED) {
    // Create the node using the base handler
    const MealieParserNode = createMealieNode(RED, null, {
        nodeType: 'mealie-parser',
        allowedOperations: ALLOWED_OPERATIONS,
        operationHandlers: OPERATION_HANDLERS
    });

    RED.nodes.registerType('mealie-parser', MealieParserNode);
};