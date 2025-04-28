/**
 * Parser domain node for Mealie API
 * Handles multiple parser operations in a single configurable node
 */

const { executeWithClient } = require('../../lib/client-wrapper');
const { ValidationError } = require('../../lib/errors');

module.exports = function(RED) {
    function MealieParserNode(config) {
        RED.nodes.createNode(this, config);
        
        // Copy config properties to node
        this.name = config.name;
        this.server = config.server;
        this.operation = config.operation;
        this.url = config.url;
        this.ingredientText = config.ingredientText;
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
                    case 'parseUrl':
                        result = await handleParseUrlOperation(node, msg);
                        break;
                    case 'parseText':
                        result = await handleParseTextOperation(node, msg);
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
        
        // Helper for parseUrl operation
        async function handleParseUrlOperation(node, msg) {
            const url = msg.payload?.url || node.url;
            
            if (!url) {
                throw new ValidationError('No URL provided for parseUrl operation. Specify in node config or msg.payload.url');
            }
            
            return await executeWithClient(
                node.config,
                async (client) => {
                    return await client.parser.parseUrl(url);
                },
                node,
                msg
            );
        }
        
        // Helper for parseText operation
        async function handleParseTextOperation(node, msg) {
            const ingredientText = msg.payload?.ingredientText || node.ingredientText;
            
            if (!ingredientText) {
                throw new ValidationError('No ingredient text provided for parseText operation. Specify in node config or msg.payload.ingredientText');
            }
            
            return await executeWithClient(
                node.config,
                async (client) => {
                    return await client.parser.parseIngredientText(ingredientText);
                },
                node,
                msg
            );
        }
    }
    
    RED.nodes.registerType('mealie-parser', MealieParserNode);
};