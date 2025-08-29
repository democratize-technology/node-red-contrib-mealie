/**
 * Shopping domain node for Mealie API
 * Handles multiple shopping list operations in a single configurable node
 */

const { executeWithClient } = require('../../lib/client-wrapper');
const { ValidationError } = require('../../lib/errors');
const { validateId, processInputData } = require('../../lib/validation');
const { createMealieNode } = require('../../lib/base-node');

// Helper for getList operation
async function handleGetListOperation(node, msg) {
    const shoppingListId = msg.payload?.shoppingListId || node.shoppingListId;

    return await executeWithClient(
        node.config,
        async (client) => {
            if (shoppingListId) {
                const validShoppingListId = validateId(shoppingListId, true);
                return await client.shoppingLists.getShoppingList(validShoppingListId);
            } else {
                // If no ID provided, get all shopping lists
                return await client.shoppingLists.getAllShoppingLists();
            }
        },
        node,
        msg
    );
}

// Helper for createList operation
async function handleCreateListOperation(node, msg) {
    const listData = msg.payload?.listData || node.listData;

    if (!listData) {
        throw new ValidationError('No list data provided for createList operation. Specify in node config or msg.payload.listData');
    }

    // Parse and validate the list data
    const parsedListData = processInputData(listData, 'listData');

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.shoppingLists.createShoppingList(parsedListData);
        },
        node,
        msg
    );
}

// Helper for updateList operation
async function handleUpdateListOperation(node, msg) {
    const shoppingListId = msg.payload?.shoppingListId || node.shoppingListId;
    const listData = msg.payload?.listData || node.listData;

    if (!shoppingListId) {
        throw new ValidationError('No shopping list ID provided for updateList operation. Specify in node config or msg.payload.shoppingListId');
    }
    const validShoppingListId = validateId(shoppingListId, true);

    if (!listData) {
        throw new ValidationError('No list data provided for updateList operation. Specify in node config or msg.payload.listData');
    }

    // Parse and validate the list data
    const parsedListData = processInputData(listData, 'listData');

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.shoppingLists.updateShoppingList(validShoppingListId, parsedListData);
        },
        node,
        msg
    );
}

// Helper for deleteList operation
async function handleDeleteListOperation(node, msg) {
    const shoppingListId = msg.payload?.shoppingListId || node.shoppingListId;

    if (!shoppingListId) {
        throw new ValidationError('No shopping list ID provided for deleteList operation. Specify in node config or msg.payload.shoppingListId');
    }
    const validShoppingListId = validateId(shoppingListId, true);

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.shoppingLists.deleteShoppingList(validShoppingListId);
        },
        node,
        msg
    );
}

// Helper for getItems operation
async function handleGetItemsOperation(node, msg) {
    const shoppingListId = msg.payload?.shoppingListId || node.shoppingListId;

    if (!shoppingListId) {
        throw new ValidationError('No shopping list ID provided for getItems operation. Specify in node config or msg.payload.shoppingListId');
    }
    const validShoppingListId = validateId(shoppingListId, true);

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.shoppingLists.getShoppingListItems(validShoppingListId);
        },
        node,
        msg
    );
}

// Helper for createItem operation
async function handleCreateItemOperation(node, msg) {
    const shoppingListId = msg.payload?.shoppingListId || node.shoppingListId;
    const itemData = msg.payload?.itemData || node.itemData;

    if (!shoppingListId) {
        throw new ValidationError('No shopping list ID provided for createItem operation. Specify in node config or msg.payload.shoppingListId');
    }
    const validShoppingListId = validateId(shoppingListId, true);

    if (!itemData) {
        throw new ValidationError('No item data provided for createItem operation. Specify in node config or msg.payload.itemData');
    }

    // Parse and validate the item data
    const parsedItemData = processInputData(itemData, 'itemData');

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.shoppingLists.createShoppingListItem(validShoppingListId, parsedItemData);
        },
        node,
        msg
    );
}

// Helper for addRecipe operation
async function handleAddRecipeOperation(node, msg) {
    const shoppingListId = msg.payload?.shoppingListId || node.shoppingListId;
    const recipeId = msg.payload?.recipeId || node.recipeId;

    if (!shoppingListId) {
        throw new ValidationError('No shopping list ID provided for addRecipe operation. Specify in node config or msg.payload.shoppingListId');
    }

    if (!recipeId) {
        throw new ValidationError('No recipe ID provided for addRecipe operation. Specify in node config or msg.payload.recipeId');
    }

    const validShoppingListId = validateId(shoppingListId, true);
    const validRecipeId = validateId(recipeId, true);

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.shoppingLists.addRecipeToShoppingList(validShoppingListId, validRecipeId);
        },
        node,
        msg
    );
}

// Define allowed operations for shopping node
const ALLOWED_OPERATIONS = [
    'getList', 'createList', 'updateList', 'deleteList', 'getItems', 'createItem', 'addRecipe'
];

// Define operation handlers
const OPERATION_HANDLERS = {
    getList: handleGetListOperation,
    createList: handleCreateListOperation,
    updateList: handleUpdateListOperation,
    deleteList: handleDeleteListOperation,
    getItems: handleGetItemsOperation,
    createItem: handleCreateItemOperation,
    addRecipe: handleAddRecipeOperation
};

module.exports = function(RED) {
    // Create the node using the base handler
    const MealieShoppingNode = createMealieNode(RED, null, {
        nodeType: 'mealie-shopping',
        allowedOperations: ALLOWED_OPERATIONS,
        operationHandlers: OPERATION_HANDLERS
    });

    RED.nodes.registerType('mealie-shopping', MealieShoppingNode);
};