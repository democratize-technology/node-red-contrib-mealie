/**
 * Organizer domain node for Mealie API
 * Handles multiple organizer operations in a single configurable node
 */

const { executeWithClient } = require('../../lib/client-wrapper');
const { ValidationError } = require('../../lib/errors');
const { createMealieNode } = require('../../lib/base-node');

// Helper for getCategories operation
async function handleGetCategoriesOperation(node, msg) {
    const categoryId = msg.payload?.categoryId || node.categoryId;

    return await executeWithClient(
        node.config,
        async (client) => {
            if (categoryId) {
                return await client.organizers.getCategory(categoryId);
            } else {
                return await client.organizers.getAllCategories();
            }
        },
        node,
        msg
    );
}

// Helper for getTags operation
async function handleGetTagsOperation(node, msg) {
    const tagId = msg.payload?.tagId || node.tagId;

    return await executeWithClient(
        node.config,
        async (client) => {
            if (tagId) {
                return await client.organizers.getTag(tagId);
            } else {
                return await client.organizers.getAllTags();
            }
        },
        node,
        msg
    );
}

// Helper for getCookbooks operation
async function handleGetCookbooksOperation(node, msg) {
    const cookbookId = msg.payload?.cookbookId || node.cookbookId;

    return await executeWithClient(
        node.config,
        async (client) => {
            if (cookbookId) {
                return await client.organizers.getCookbook(cookbookId);
            } else {
                return await client.organizers.getAllCookbooks();
            }
        },
        node,
        msg
    );
}

// Helper for createCookbook operation
async function handleCreateCookbookOperation(node, msg) {
    const cookbookData = msg.payload?.cookbookData || node.cookbookData;

    if (!cookbookData) {
        throw new ValidationError('No cookbook data provided for createCookbook operation. Specify in node config or msg.payload.cookbookData');
    }

    // Parse the cookbook data if it's a string
    const parsedCookbookData = typeof cookbookData === 'string' ? JSON.parse(cookbookData) : cookbookData;

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.organizers.createCookbook(parsedCookbookData);
        },
        node,
        msg
    );
}

// Define allowed operations for organizer node
const ALLOWED_OPERATIONS = [
    'getCategories', 'getTags', 'getCookbooks', 'createCookbook'
];

// Define operation handlers
const OPERATION_HANDLERS = {
    getCategories: handleGetCategoriesOperation,
    getTags: handleGetTagsOperation,
    getCookbooks: handleGetCookbooksOperation,
    createCookbook: handleCreateCookbookOperation
};

module.exports = function(RED) {
    // Create the node using the base handler
    const MealieOrganizerNode = createMealieNode(RED, null, {
        nodeType: 'mealie-organizer',
        allowedOperations: ALLOWED_OPERATIONS,
        operationHandlers: OPERATION_HANDLERS
    });

    RED.nodes.registerType('mealie-organizer', MealieOrganizerNode);
};