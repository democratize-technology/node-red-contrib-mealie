/**
 * Utility domain node for Mealie API
 * Handles multiple utility operations in a single configurable node
 */

const { executeWithClient } = require('../../lib/client-wrapper');
const { createMealieNode } = require('../../lib/base-node');

// Helper for getSchema operation
async function handleGetSchemaOperation(node, msg) {
    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.utilities.getSchema();
        },
        node,
        msg
    );
}

// Helper for getVersion operation
async function handleGetVersionOperation(node, msg) {
    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.utilities.getVersion();
        },
        node,
        msg
    );
}

// Define allowed operations for utility node
const ALLOWED_OPERATIONS = [
    'getSchema', 'getVersion'
];

// Define operation handlers
const OPERATION_HANDLERS = {
    getSchema: handleGetSchemaOperation,
    getVersion: handleGetVersionOperation
};

module.exports = function(RED) {
    // Create the node using the base handler
    const MealieUtilityNode = createMealieNode(RED, null, {
        nodeType: 'mealie-utility',
        allowedOperations: ALLOWED_OPERATIONS,
        operationHandlers: OPERATION_HANDLERS
    });

    RED.nodes.registerType('mealie-utility', MealieUtilityNode);
};