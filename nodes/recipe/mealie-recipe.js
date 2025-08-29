/**
 * Recipe domain node for Mealie API
 * Handles multiple recipe operations in a single configurable node
 */

const { executeWithClient } = require('../../lib/client-wrapper');
const { ValidationError } = require('../../lib/errors');
const { validateSlug, validateId, processInputData, validateOperation } = require('../../lib/validation');
const { createMealieNode } = require('../../lib/base-node');

// Helper for get operation
async function handleGetOperation(node, msg) {
    const slug = msg.payload?.slug || node.slug;
    const validSlug = validateSlug(slug, true, 'recipe slug for get operation');

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.recipes.getRecipe(validSlug);
        },
        node,
        msg
    );
}

// Helper for search operation
async function handleSearchOperation(node, msg) {
    const queryParams = msg.payload?.params || msg.payload || {};

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.recipes.getAllRecipes(queryParams);
        },
        node,
        msg
    );
}

// Helper for create operation
async function handleCreateOperation(node, msg) {
    const recipeData = msg.payload?.recipeData || node.recipeData;

    // Validate and process recipe data (handles both JSON strings and objects)
    const validRecipeData = processInputData(recipeData, 'recipe', 'create operation');

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.recipes.createRecipe(validRecipeData);
        },
        node,
        msg
    );
}

// Helper for update operation
async function handleUpdateOperation(node, msg) {
    const slug = msg.payload?.slug || node.slug;
    const recipeData = msg.payload?.recipeData || node.recipeData;

    const validSlug = validateSlug(slug, true, 'recipe slug for update operation');
    const validRecipeData = processInputData(recipeData, 'recipe', 'update operation');

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.recipes.updateRecipe(validSlug, validRecipeData);
        },
        node,
        msg
    );
}

// Helper for delete operation
async function handleDeleteOperation(node, msg) {
    const slug = msg.payload?.slug || node.slug;
    const validSlug = validateSlug(slug, true, 'recipe slug for delete operation');

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.recipes.deleteRecipe(validSlug);
        },
        node,
        msg
    );
}

// Helper for image operation
async function handleImageOperation(node, msg) {
    const slug = msg.payload?.slug || node.slug;
    const imageAction = msg.payload?.imageAction || 'get';
    const imageData = msg.payload?.imageData;

    const validSlug = validateSlug(slug, true, 'recipe slug for image operation');
    const validImageAction = validateOperation(imageAction, ['get', 'upload']);

    return await executeWithClient(
        node.config,
        async (client) => {
            switch (validImageAction) {
            case 'get':
                return await client.recipes.getRecipeImage(validSlug);
            case 'upload':
                if (!imageData) {
                    throw new ValidationError('No image data provided for image upload action');
                }
                return await client.recipes.uploadRecipeImage(validSlug, imageData);
            }
        },
        node,
        msg
    );
}

// Helper for asset operation
async function handleAssetOperation(node, msg) {
    const slug = msg.payload?.slug || node.slug;
    const assetId = msg.payload?.assetId;
    const assetAction = msg.payload?.assetAction || 'list';
    const assetData = msg.payload?.assetData;

    const validSlug = validateSlug(slug, true, 'recipe slug for asset operation');
    const validAssetAction = validateOperation(assetAction, ['list', 'get', 'upload', 'delete']);

    return await executeWithClient(
        node.config,
        async (client) => {
            switch (validAssetAction) {
            case 'list':
                return await client.recipes.getRecipeAssets(validSlug);
            case 'get': {
                const validAssetId = validateId(assetId, true, 'asset ID for get asset action');
                return await client.recipes.getRecipeAsset(validSlug, validAssetId);
            }
            case 'upload':
                if (!assetData) {
                    throw new ValidationError('No asset data provided for upload asset action');
                }
                return await client.recipes.uploadRecipeAsset(validSlug, assetData);
            case 'delete': {
                const validDeleteAssetId = validateId(assetId, true, 'asset ID for delete asset action');
                return await client.recipes.deleteRecipeAsset(validSlug, validDeleteAssetId);
            }
            }
        },
        node,
        msg
    );
}

// Define allowed operations for recipe node
const ALLOWED_OPERATIONS = [
    'get', 'search', 'create', 'update', 'delete', 'image', 'asset'
];

// Define operation handlers
const OPERATION_HANDLERS = {
    get: handleGetOperation,
    search: handleSearchOperation,
    create: handleCreateOperation,
    update: handleUpdateOperation,
    delete: handleDeleteOperation,
    image: handleImageOperation,
    asset: handleAssetOperation
};

module.exports = function(RED) {
    // Create the node using the base handler
    const MealieRecipeNode = createMealieNode(RED, null, {
        nodeType: 'mealie-recipe',
        allowedOperations: ALLOWED_OPERATIONS,
        operationHandlers: OPERATION_HANDLERS
    });

    RED.nodes.registerType('mealie-recipe', MealieRecipeNode);
};