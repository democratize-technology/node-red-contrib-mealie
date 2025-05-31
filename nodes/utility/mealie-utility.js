/**
 * Utility domain node for Mealie API
 * Handles multiple utility operations in a single configurable node
 */

const { executeWithClient } = require('../../lib/client-wrapper');
const { ValidationError } = require('../../lib/errors');
const { setSuccessStatus, setErrorStatus, clearStatusTimer } = require('../../lib/node-status');

module.exports = function(RED) {
    function MealieUtilityNode(config) {
        RED.nodes.createNode(this, config);

        // Copy config properties to node
        this.name = config.name;
        this.server = config.server;
        this.operation = config.operation;
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
                case 'getSchema':
                    result = await handleGetSchemaOperation(node, msg);
                    break;
                case 'getVersion':
                    result = await handleGetVersionOperation(node, msg);
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

        // Helper for getSchema operation
        async function handleGetSchemaOperation(node, msg) {
            return await executeWithClient(
                node.config,
                async (client) => {
                    return await client.utilities.getSchema();
                },
                node,
                msg
            );
        }

        // Helper for getVersion operation
        async function handleGetVersionOperation(node, msg) {
            return await executeWithClient(
                node.config,
                async (client) => {
                    return await client.utilities.getVersion();
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

    RED.nodes.registerType('mealie-utility', MealieUtilityNode);
};