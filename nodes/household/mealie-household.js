/**
 * Household domain node for Mealie API
 * Handles multiple household operations in a single configurable node
 */

const { executeWithClient } = require('../../lib/client-wrapper');
const { ValidationError } = require('../../lib/errors');
const { setSuccessStatus, setErrorStatus, clearStatusTimer } = require('../../lib/node-status');

module.exports = function(RED) {
    function MealieHouseholdNode(config) {
        RED.nodes.createNode(this, config);

        // Copy config properties to node
        this.name = config.name;
        this.server = config.server;
        this.operation = config.operation;
        this.householdId = config.householdId;
        this.preferencesData = config.preferencesData;
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
                case 'get':
                    result = await handleGetOperation(node, msg);
                    break;
                case 'getMembers':
                    result = await handleGetMembersOperation(node, msg);
                    break;
                case 'getPreferences':
                    result = await handleGetPreferencesOperation(node, msg);
                    break;
                case 'updatePreferences':
                    result = await handleUpdatePreferencesOperation(node, msg);
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

                // Send to the output
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

        // Helper for get operation
        async function handleGetOperation(node, msg) {
            const householdId = msg.payload?.householdId || node.householdId;

            return await executeWithClient(
                node.config,
                async (client) => {
                    if (householdId) {
                        return await client.household.getHousehold(householdId);
                    } else {
                        // If no ID provided, get all households
                        return await client.household.getAllHouseholds();
                    }
                },
                node,
                msg
            );
        }

        // Helper for getMembers operation
        async function handleGetMembersOperation(node, msg) {
            const householdId = msg.payload?.householdId || node.householdId;

            if (!householdId) {
                throw new ValidationError('No household ID provided for getMembers operation. Specify in node config or msg.payload.householdId');
            }

            return await executeWithClient(
                node.config,
                async (client) => {
                    return await client.household.getHouseholdMembers(householdId);
                },
                node,
                msg
            );
        }

        // Helper for getPreferences operation
        async function handleGetPreferencesOperation(node, msg) {
            const householdId = msg.payload?.householdId || node.householdId;

            if (!householdId) {
                throw new ValidationError('No household ID provided for getPreferences operation. Specify in node config or msg.payload.householdId');
            }

            return await executeWithClient(
                node.config,
                async (client) => {
                    return await client.household.getHouseholdPreferences(householdId);
                },
                node,
                msg
            );
        }

        // Helper for updatePreferences operation
        async function handleUpdatePreferencesOperation(node, msg) {
            const householdId = msg.payload?.householdId || node.householdId;
            const preferencesData = msg.payload?.preferencesData || node.preferencesData;

            if (!householdId) {
                throw new ValidationError('No household ID provided for updatePreferences operation. Specify in node config or msg.payload.householdId');
            }

            if (!preferencesData) {
                throw new ValidationError('No preferences data provided for updatePreferences operation. Specify in node config or msg.payload.preferencesData');
            }

            // Parse the preferences data if it's a string
            const parsedPreferencesData = typeof preferencesData === 'string'
                ? JSON.parse(preferencesData)
                : preferencesData;

            return await executeWithClient(
                node.config,
                async (client) => {
                    return await client.household.updateHouseholdPreferences(householdId, parsedPreferencesData);
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

    RED.nodes.registerType('mealie-household', MealieHouseholdNode);
};