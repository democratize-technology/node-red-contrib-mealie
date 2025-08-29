/**
 * Household domain node for Mealie API
 * Handles multiple household operations in a single configurable node
 */

const { executeWithClient } = require('../../lib/client-wrapper');
const { ValidationError } = require('../../lib/errors');
const { createMealieNode } = require('../../lib/base-node');

// Helper for get operation
async function handleGetOperation(node, msg) {
    const householdId = msg.payload?.householdId || node.householdId;

    return await executeWithClient(
        node.config,
        async (client) => {
            if (householdId) {
                return await client.households.getHousehold(householdId);
            } else {
                return await client.households.getAllHouseholds();
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
            return await client.households.getHouseholdMembers(householdId);
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
            return await client.households.getHouseholdPreferences(householdId);
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
    const parsedPreferencesData = typeof preferencesData === 'string' ? JSON.parse(preferencesData) : preferencesData;

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.households.updateHouseholdPreferences(householdId, parsedPreferencesData);
        },
        node,
        msg
    );
}

// Define allowed operations for household node
const ALLOWED_OPERATIONS = [
    'get', 'getMembers', 'getPreferences', 'updatePreferences'
];

// Define operation handlers
const OPERATION_HANDLERS = {
    get: handleGetOperation,
    getMembers: handleGetMembersOperation,
    getPreferences: handleGetPreferencesOperation,
    updatePreferences: handleUpdatePreferencesOperation
};

module.exports = function(RED) {
    // Create the node using the base handler
    const MealieHouseholdNode = createMealieNode(RED, null, {
        nodeType: 'mealie-household',
        allowedOperations: ALLOWED_OPERATIONS,
        operationHandlers: OPERATION_HANDLERS
    });

    RED.nodes.registerType('mealie-household', MealieHouseholdNode);
};