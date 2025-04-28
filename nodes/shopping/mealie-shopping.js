/**
 * Shopping domain node for Mealie API
 * Handles multiple shopping list operations in a single configurable node
 */

const { executeWithClient } = require('../../lib/client-wrapper');
const { ValidationError } = require('../../lib/errors');

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
                    default:
                        throw new ValidationError(`Unsupported operation: ${operation}`);
                }
                
                // Send successful result
                msg.payload = {
                    success: true,
                    operation: operation,
                    data: result
                };
                
                // Set node status to show success
                node.status({fill: "green", shape: "dot", text: operation + " success"});
                
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
        
        // Helper for getList operation
        async function handleGetListOperation(node, msg) {
            const shoppingListId = msg.payload?.shoppingListId || node.shoppingListId;
            
            return await executeWithClient(
                node.config,
                async (client) => {
                    if (shoppingListId) {
                        return await client.shoppingLists.getShoppingList(shoppingListId);
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
            
            // Parse the list data if it's a string
            const parsedListData = typeof listData === 'string' ? JSON.parse(listData) : listData;
            
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
            
            if (!listData) {
                throw new ValidationError('No list data provided for updateList operation. Specify in node config or msg.payload.listData');
            }
            
            // Parse the list data if it's a string
            const parsedListData = typeof listData === 'string' ? JSON.parse(listData) : listData;
            
            return await executeWithClient(
                node.config,
                async (client) => {
                    return await client.shoppingLists.updateShoppingList(shoppingListId, parsedListData);
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
            
            return await executeWithClient(
                node.config,
                async (client) => {
                    return await client.shoppingLists.deleteShoppingList(shoppingListId);
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
            
            return await executeWithClient(
                node.config,
                async (client) => {
                    return await client.shoppingLists.getShoppingListItems(shoppingListId);
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
            
            if (!itemData) {
                throw new ValidationError('No item data provided for createItem operation. Specify in node config or msg.payload.itemData');
            }
            
            // Parse the item data if it's a string
            const parsedItemData = typeof itemData === 'string' ? JSON.parse(itemData) : itemData;
            
            return await executeWithClient(
                node.config,
                async (client) => {
                    return await client.shoppingLists.createShoppingListItem(shoppingListId, parsedItemData);
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
            
            return await executeWithClient(
                node.config,
                async (client) => {
                    return await client.shoppingLists.addRecipeToShoppingList(shoppingListId, recipeId);
                },
                node,
                msg
            );
        }
    }
    
    RED.nodes.registerType('mealie-shopping', MealieShoppingNode);
};