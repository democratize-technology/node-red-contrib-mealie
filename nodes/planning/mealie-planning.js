/**
 * Planning domain node for Mealie API
 * Handles multiple meal planning operations in a single configurable node
 */

const { executeWithClient } = require('../../lib/client-wrapper');
const { ValidationError } = require('../../lib/errors');

module.exports = function(RED) {
    function MealiePlanningNode(config) {
        RED.nodes.createNode(this, config);
        
        // Copy config properties to node
        this.name = config.name;
        this.server = config.server;
        this.operation = config.operation;
        this.mealPlanId = config.mealPlanId;
        this.planData = config.planData;
        this.queryParams = config.queryParams;
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
                    case 'create':
                        result = await handleCreateOperation(node, msg);
                        break;
                    case 'update':
                        result = await handleUpdateOperation(node, msg);
                        break;
                    case 'delete':
                        result = await handleDeleteOperation(node, msg);
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
        
        // Helper for get operation
        async function handleGetOperation(node, msg) {
            const mealPlanId = msg.payload?.mealPlanId || node.mealPlanId;
            const queryParams = msg.payload?.queryParams || node.queryParams;
            
            // Parse query params if it's a string
            const parsedQueryParams = typeof queryParams === 'string' ? JSON.parse(queryParams) : queryParams || {};
            
            return await executeWithClient(
                node.config,
                async (client) => {
                    if (mealPlanId) {
                        return await client.mealPlans.getMealPlan(mealPlanId);
                    } else {
                        // If no ID provided, get all meal plans with optional query params
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
            
            if (!planData) {
                throw new ValidationError('No plan data provided for create operation. Specify in node config or msg.payload.planData');
            }
            
            // Parse the plan data if it's a string
            const parsedPlanData = typeof planData === 'string' ? JSON.parse(planData) : planData;
            
            return await executeWithClient(
                node.config,
                async (client) => {
                    return await client.mealPlans.createMealPlan(parsedPlanData);
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
            
            if (!planData) {
                throw new ValidationError('No plan data provided for update operation. Specify in node config or msg.payload.planData');
            }
            
            // Parse the plan data if it's a string
            const parsedPlanData = typeof planData === 'string' ? JSON.parse(planData) : planData;
            
            return await executeWithClient(
                node.config,
                async (client) => {
                    return await client.mealPlans.updateMealPlan(mealPlanId, parsedPlanData);
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
            
            return await executeWithClient(
                node.config,
                async (client) => {
                    return await client.mealPlans.deleteMealPlan(mealPlanId);
                },
                node,
                msg
            );
        }
    }
    
    RED.nodes.registerType('mealie-planning', MealiePlanningNode);
};