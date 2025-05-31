/**
 * Shopping domain node for Mealie API
 * Handles multiple shopping list operations in a single configurable node
 */

const { executeWithClient } = require('../../lib/client-wrapper');
const { ValidationError } = require('../../lib/errors');
const { validateOperation, validateId, processInputData } = require('../../lib/validation');
const { setSuccessStatus, setErrorStatus, clearStatusTimer } = require('../../lib/node-status');

module.exports = function(RED) {
    function MealieShoppingNode(config) {
        RED.nodes.createNode(this, config);
        
        // Copy config properties to node
        this.name = config.name;
        this.server = config.server;
        this.operation = config.operation;
        this.shoppingListId = config.shoppingListId;
        this.itemId = config.itemId;
        this.recipeId = config.recipeId;
        this.listData = config.listData;
        this.itemData = config.itemData;
        this.config = RED.nodes.getNode(this.server);
        
        const node = this;
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
                    'getList', 'createList', 'updateList', 'deleteList', 'getItems', 'createItem', 'addRecipe'
                ]);
                
                // Execute the appropriate operation
                let result;
                
                switch (validOperation) {
                case 'getList':
                    result = await handleGetListOperation(node, msg);
                    break;
                case 'createList':
                    result = await handleCreateListOperation(node, msg);
                    break;
                case 'updateList':
                    result = await handleUpdateListOperation(node, msg);
                    break;
                case 'deleteList':
                    result = await handleDeleteListOperation(node, msg);
                    break;
                case 'getItems':
                    result = await handleGetItemsOperation(node, msg);
                    break;
                case 'createItem':
                    result = await handleCreateItemOperation(node, msg);
                    break;
                case 'addRecipe':
                    result = await handleAddRecipeOperation(node, msg);
                    break;
                }
                
                // Send successful result
                msg.payload = {
                    success: true,
                    operation: validOperation,
                    data: result
                };
                
                // Set node status to show success
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
                
                // Set node status to show error
                clearStatusTimer(statusTimer);
                statusTimer = setErrorStatus(node, error.message);
                
                // Log error to runtime
                node.error(error.message, msg);
                
                // Send error message on the same output
                send(msg);
                done(error);
            }
        });
        
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
        
        // Clean up timer on node close
        node.on('close', function() {
            clearStatusTimer(statusTimer);
        });
    }
    
    RED.nodes.registerType('mealie-shopping', MealieShoppingNode);
};