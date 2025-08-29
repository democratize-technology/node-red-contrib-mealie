/**
 * Planning domain node for Mealie API
 * Handles multiple meal planning operations in a single configurable node
 */

const { executeWithClient } = require('../../lib/client-wrapper');
const { ValidationError } = require('../../lib/errors');
const { validateId, processInputData } = require('../../lib/validation');
const { createMealieNode } = require('../../lib/base-node');

// Helper for get operation
async function handleGetOperation(node, msg) {
    const mealPlanId = msg.payload?.mealPlanId || node.mealPlanId;
    const queryParams = msg.payload?.queryParams || node.queryParams || {};

    return await executeWithClient(
        node.config,
        async (client) => {
            if (mealPlanId) {
                const validMealPlanId = validateId(mealPlanId, true, 'meal plan ID for get operation');
                return await client.mealPlans.getMealPlan(validMealPlanId);
            } else {
                // If no ID provided, get all meal plans with optional query parameters
                const parsedQueryParams = typeof queryParams === 'string' ? JSON.parse(queryParams) : queryParams;
                return await client.mealPlans.getAllMealPlans(parsedQueryParams);
            }
        },
        node,
        msg
    );
}

// Helper for create operation
async function handleCreateOperation(node, msg) {
    const planData = msg.payload?.planData || node.planData;

    // Validate and process plan data
    const validPlanData = processInputData(planData, 'plan', 'create operation');

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.mealPlans.createMealPlan(validPlanData);
        },
        node,
        msg
    );
}

// Helper for update operation
async function handleUpdateOperation(node, msg) {
    const mealPlanId = msg.payload?.mealPlanId || node.mealPlanId;
    const planData = msg.payload?.planData || node.planData;

    if (!mealPlanId) {
        throw new ValidationError('No meal plan ID provided for update operation. Specify in node config or msg.payload.mealPlanId');
    }
    const validMealPlanId = validateId(mealPlanId, true, 'meal plan ID for update operation');
    const validPlanData = processInputData(planData, 'plan', 'update operation');

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.mealPlans.updateMealPlan(validMealPlanId, validPlanData);
        },
        node,
        msg
    );
}

// Helper for delete operation
async function handleDeleteOperation(node, msg) {
    const mealPlanId = msg.payload?.mealPlanId || node.mealPlanId;
    if (!mealPlanId) {
        throw new ValidationError('No meal plan ID provided for delete operation. Specify in node config or msg.payload.mealPlanId');
    }
    const validMealPlanId = validateId(mealPlanId, true, 'meal plan ID for delete operation');

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.mealPlans.deleteMealPlan(validMealPlanId);
        },
        node,
        msg
    );
}

// Define allowed operations for planning node
const ALLOWED_OPERATIONS = [
    'get', 'create', 'update', 'delete'
];

// Define operation handlers
const OPERATION_HANDLERS = {
    get: handleGetOperation,
    create: handleCreateOperation,
    update: handleUpdateOperation,
    delete: handleDeleteOperation
};

module.exports = function(RED) {
    // Create the node using the base handler
    const MealiePlanningNode = createMealieNode(RED, null, {
        nodeType: 'mealie-planning',
        allowedOperations: ALLOWED_OPERATIONS,
        operationHandlers: OPERATION_HANDLERS
    });

    RED.nodes.registerType('mealie-planning', MealiePlanningNode);
};