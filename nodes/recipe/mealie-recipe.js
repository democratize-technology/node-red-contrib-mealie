/**
 * Recipe domain node for Mealie API
 * Handles multiple recipe operations in a single configurable node
 */

const { executeWithClient } = require('../../lib/client-wrapper');
const { ValidationError } = require('../../lib/errors');

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
        
        // Handle input message
        node.on('input', async function(msg, send, done) {
            // Ensure backward compatibility with Node-RED < 1.0
            send = send || function() { node.send.apply(node, arguments); };
            done = done || function(error) { if (error) { node.error(error, msg); } };
            
            try {
                // Determine operation (from config or payload)
                const operation = msg.payload?.operation || node.operation;
                
                if (!operation) {
                    throw new ValidationError('No operation specified. Set in node config or msg.payload.operation');
                }
                
                // Execute the appropriate operation
                let result;
                
                switch (operation) {
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
                    default:
                        throw new ValidationError(`Unsupported operation: ${operation}`);
                }
                
                // Send successful result
                msg.payload = {
                    success: true,
                    operation: operation,
                    data: result
                };
                
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
                
                // Set node status to show error
                node.status({fill: "red", shape: "dot", text: error.message});
                
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
            
            if (!slug) {
                throw new ValidationError('No recipe slug provided for get operation. Specify in node config or msg.payload.slug');
            }
            
            return await executeWithClient(
                node.config,
                async (client) => {
                    return await client.recipes.getRecipe(slug);
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
            
            if (!recipeData) {
                throw new ValidationError('No recipe data provided for create operation. Specify in node config or msg.payload.recipeData');
            }
            
            // Parse the recipe data if it's a string
            const parsedRecipeData = typeof recipeData === 'string' ? JSON.parse(recipeData) : recipeData;
            
            return await executeWithClient(
                node.config,
                async (client) => {
                    return await client.recipes.createRecipe(parsedRecipeData);
                },
                node,
                msg
            );
        }
        
        // Helper for update operation
        async function handleUpdateOperation(node, msg) {
            const slug = msg.payload?.slug || node.slug;
            const recipeData = msg.payload?.recipeData || node.recipeData;
            
            if (!slug) {
                throw new ValidationError('No recipe slug provided for update operation. Specify in node config or msg.payload.slug');
            }
            
            if (!recipeData) {
                throw new ValidationError('No recipe data provided for update operation. Specify in node config or msg.payload.recipeData');
            }
            
            // Parse the recipe data if it's a string
            const parsedRecipeData = typeof recipeData === 'string' ? JSON.parse(recipeData) : recipeData;
            
            return await executeWithClient(
                node.config,
                async (client) => {
                    return await client.recipes.updateRecipe(slug, parsedRecipeData);
                },
                node,
                msg
            );
        }
        
        // Helper for delete operation
        async function handleDeleteOperation(node, msg) {
            const slug = msg.payload?.slug || node.slug;
            
            if (!slug) {
                throw new ValidationError('No recipe slug provided for delete operation. Specify in node config or msg.payload.slug');
            }
            
            return await executeWithClient(
                node.config,
                async (client) => {
                    return await client.recipes.deleteRecipe(slug);
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
            
            if (!slug) {
                throw new ValidationError('No recipe slug provided for image operation. Specify in node config or msg.payload.slug');
            }
            
            return await executeWithClient(
                node.config,
                async (client) => {
                    switch (imageAction) {
                        case 'get':
                            return await client.recipes.getRecipeImage(slug);
                        case 'upload':
                            if (!imageData) {
                                throw new ValidationError('No image data provided for image upload action');
                            }
                            return await client.recipes.uploadRecipeImage(slug, imageData);
                        default:
                            throw new ValidationError(`Unsupported image action: ${imageAction}`);
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
            
            if (!slug) {
                throw new ValidationError('No recipe slug provided for asset operation. Specify in node config or msg.payload.slug');
            }
            
            return await executeWithClient(
                node.config,
                async (client) => {
                    switch (assetAction) {
                        case 'list':
                            return await client.recipes.getRecipeAssets(slug);
                        case 'get':
                            if (!assetId) {
                                throw new ValidationError('No asset ID provided for get asset action');
                            }
                            return await client.recipes.getRecipeAsset(slug, assetId);
                        case 'upload':
                            if (!assetData) {
                                throw new ValidationError('No asset data provided for upload asset action');
                            }
                            return await client.recipes.uploadRecipeAsset(slug, assetData);
                        case 'delete':
                            if (!assetId) {
                                throw new ValidationError('No asset ID provided for delete asset action');
                            }
                            return await client.recipes.deleteRecipeAsset(slug, assetId);
                        default:
                            throw new ValidationError(`Unsupported asset action: ${assetAction}`);
                    }
                },
                node,
                msg
            );
        }
    }
    
    RED.nodes.registerType('mealie-recipe', MealieRecipeNode);
};