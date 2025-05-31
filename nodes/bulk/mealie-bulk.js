/**
 * Bulk domain node for Mealie API
 * Handles multiple bulk operations in a single configurable node
 */

const { executeWithClient } = require('../../lib/client-wrapper');
const { ValidationError } = require('../../lib/errors');
const { setSuccessStatus, setErrorStatus } = require('../../lib/node-status');

module.exports = function(RED) {
    function MealieBulkNode(config) {
        RED.nodes.createNode(this, config);
        
        // Copy config properties to node
        this.name = config.name;
        this.server = config.server;
        this.operation = config.operation;
        this.recipeIds = config.recipeIds;
        this.urls = config.urls;
        this.importData = config.importData;
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
                    case 'exportRecipes':
                        result = await handleExportRecipesOperation(node, msg);
                        break;
                    case 'importRecipes':
                        result = await handleImportRecipesOperation(node, msg);
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
                setSuccessStatus(node, operation);
                
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
                setErrorStatus(node, error.message);
                
                // Log error to runtime
                node.error(error.message, msg);
                
                // Send error message on the same output
                send(msg);
                done(error);
            }
        });
        
        // Helper for exportRecipes operation
        async function handleExportRecipesOperation(node, msg) {
            const recipeIds = msg.payload?.recipeIds || node.recipeIds;
            
            if (!recipeIds) {
                throw new ValidationError('No recipe IDs provided for exportRecipes operation. Specify in node config or msg.payload.recipeIds');
            }
            
            // Parse the recipe IDs if it's a string
            const parsedRecipeIds = typeof recipeIds === 'string' ? JSON.parse(recipeIds) : recipeIds;
            
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
            
            if (urls) {
                // Parse the URLs if it's a string
                const parsedUrls = typeof urls === 'string' ? JSON.parse(urls) : urls;
                
                return await executeWithClient(
                    node.config,
                    async (client) => {
                        return await client.bulk.importRecipesFromUrls(parsedUrls);
                    },
                    node,
                    msg
                );
            } else {
                // Parse the import data if it's a string
                const parsedImportData = typeof importData === 'string' ? JSON.parse(importData) : importData;
                
                return await executeWithClient(
                    node.config,
                    async (client) => {
                        return await client.bulk.importRecipes(parsedImportData);
                    },
                    node,
                    msg
                );
            }
        }
    }
    
    RED.nodes.registerType('mealie-bulk', MealieBulkNode);
};