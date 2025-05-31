/**
 * Recipe domain node for Mealie API
 * Handles multiple recipe operations in a single configurable node
 */

const { executeWithClient } = require('../../lib/client-wrapper');
const { ValidationError } = require('../../lib/errors');
const { validateOperation, validateSlug, validateId, processInputData } = require('../../lib/validation');
const { setSuccessStatus, setErrorStatus, clearStatusTimer } = require('../../lib/node-status');

module.exports = function(RED) {
    function MealieRecipeNode(config) {
        RED.nodes.createNode(this, config);

        // Copy config properties to node
        this.name = config.name;
        this.server = config.server;
        this.operation = config.operation;
        this.slug = config.slug;
        this.recipeData = config.recipeData;
        this.config = RED.nodes.getNode(this.server);

        const node = this;

        // Track status timer for cleanup
        let statusTimer;

        // Handle input message
        node.on('input', async function(msg, send, done) {
            // Ensure backward compatibility with Node-RED < 1.0
            send = send || function() { node.send.apply(node, arguments); };
            done = done || function(error) { if (error) { node.error(error, msg); } };

            try {
                // Determine operation (from config or payload)
                const operation = msg.payload?.operation || node.operation;

                // Validate operation
                const validOperation = validateOperation(operation, [
                    'get', 'search', 'create', 'update', 'delete', 'image', 'asset'
                ]);

                // Execute the appropriate operation
                let result;

                switch (validOperation) {
                case 'get':
                    result = await handleGetOperation(node, msg);
                    break;
                case 'search':
                    result = await handleSearchOperation(node, msg);
                    break;
                case 'create':
                    result = await handleCreateOperation(node, msg);
                    break;
                case 'update':
                    result = await handleUpdateOperation(node, msg);
                    break;
                case 'delete':
                    result = await handleDeleteOperation(node, msg);
                    break;
                case 'image':
                    result = await handleImageOperation(node, msg);
                    break;
                case 'asset':
                    result = await handleAssetOperation(node, msg);
                    break;
                }

                // Send successful result
                msg.payload = {
                    success: true,
                    operation: validOperation,
                    data: result
                };

                // Clear any existing status timer and set new success status
                clearStatusTimer(statusTimer);
                statusTimer = setSuccessStatus(node, validOperation);

                // Use single output pattern
                send(msg);
                done();
            } catch (error) {
                // Create standardized error response
                msg.payload = {
                    success: false,
                    operation: msg.payload?.operation || node.operation,
                    error: {
                        message: error.message,
                        code: error.code || 'UNKNOWN_ERROR',
                        details: error.details || null
                    }
                };

                // Clear any existing status timer and set new error status
                clearStatusTimer(statusTimer);
                statusTimer = setErrorStatus(node, error.message);

                // Log error to runtime
                node.error(error.message, msg);

                // Send error message on the same output
                send(msg);
                done(error);
            }
        });

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

        // Clean up status timer on node close
        node.on('close', function() {
            clearStatusTimer(statusTimer);
        });
    }

    RED.nodes.registerType('mealie-recipe', MealieRecipeNode);
};