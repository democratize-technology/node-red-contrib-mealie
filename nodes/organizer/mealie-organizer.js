/**
 * Organizer domain node for Mealie API
 * Handles multiple organizer operations in a single configurable node
 */

const { executeWithClient } = require('../../lib/client-wrapper');
const { ValidationError } = require('../../lib/errors');
const { setSuccessStatus, setErrorStatus, clearStatusTimer } = require('../../lib/node-status');

module.exports = function(RED) {
    function MealieOrganizerNode(config) {
        RED.nodes.createNode(this, config);

        // Copy config properties to node
        this.name = config.name;
        this.server = config.server;
        this.operation = config.operation;
        this.categoryId = config.categoryId;
        this.tagId = config.tagId;
        this.cookbookId = config.cookbookId;
        this.cookbookData = config.cookbookData;
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

                if (!operation) {
                    throw new ValidationError('No operation specified. Set in node config or msg.payload.operation');
                }

                // Execute the appropriate operation
                let result;

                switch (operation) {
                case 'getCategories':
                    result = await handleGetCategoriesOperation(node, msg);
                    break;
                case 'getTags':
                    result = await handleGetTagsOperation(node, msg);
                    break;
                case 'getCookbooks':
                    result = await handleGetCookbooksOperation(node, msg);
                    break;
                case 'createCookbook':
                    result = await handleCreateCookbookOperation(node, msg);
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
                clearStatusTimer(statusTimer);
                statusTimer = setSuccessStatus(node, operation);

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

        // Clean up timer on node close
        node.on('close', function() {
            clearStatusTimer(statusTimer);
        });
    }

    RED.nodes.registerType('mealie-organizer', MealieOrganizerNode);
};