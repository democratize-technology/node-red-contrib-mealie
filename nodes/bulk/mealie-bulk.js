/**
 * Bulk domain node for Mealie API
 * Handles multiple bulk operations in a single configurable node
 */

const { executeWithClient } = require('../../lib/client-wrapper');
const { ValidationError } = require('../../lib/errors');
const { createMealieNode } = require('../../lib/base-node');

// Helper for exportRecipes operation
async function handleExportRecipesOperation(node, msg) {
    const recipeIds = msg.payload?.recipeIds || node.recipeIds;

    if (!recipeIds) {
        throw new ValidationError('No recipe IDs provided for exportRecipes operation. Specify in node config or msg.payload.recipeIds');
    }

    // Parse recipe IDs if it's a string
    const parsedRecipeIds = typeof recipeIds === 'string' ? JSON.parse(recipeIds) : recipeIds;

    if (!Array.isArray(parsedRecipeIds)) {
        throw new ValidationError('Recipe IDs must be an array');
    }

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.bulk.exportRecipes(parsedRecipeIds);
        },
        node,
        msg
    );
}

// Helper for importRecipes operation
async function handleImportRecipesOperation(node, msg) {
    const urls = msg.payload?.urls || node.urls;
    const importData = msg.payload?.importData || node.importData;

    if (!urls && !importData) {
        throw new ValidationError('No URLs or import data provided for importRecipes operation. Specify URLs in node config or msg.payload.urls, or import data in msg.payload.importData');
    }

    return await executeWithClient(
        node.config,
        async (client) => {
            if (urls) {
                // Parse URLs if it's a string
                const parsedUrls = typeof urls === 'string' ? JSON.parse(urls) : urls;
                return await client.bulk.importRecipesFromUrls(parsedUrls);
            } else {
                // Parse import data if it's a string
                const parsedImportData = typeof importData === 'string' ? JSON.parse(importData) : importData;
                return await client.bulk.importRecipes(parsedImportData);
            }
        },
        node,
        msg
    );
}

// Define allowed operations for bulk node
const ALLOWED_OPERATIONS = [
    'exportRecipes', 'importRecipes'
];

// Define operation handlers
const OPERATION_HANDLERS = {
    exportRecipes: handleExportRecipesOperation,
    importRecipes: handleImportRecipesOperation
};

module.exports = function(RED) {
    // Create the node using the base handler
    const MealieBulkNode = createMealieNode(RED, null, {
        nodeType: 'mealie-bulk',
        allowedOperations: ALLOWED_OPERATIONS,
        operationHandlers: OPERATION_HANDLERS
    });

    RED.nodes.registerType('mealie-bulk', MealieBulkNode);
};