require('should');

const helper = require('node-red-node-test-helper');
const configNode = require('../../../nodes/config/mealie-server-config');
const sinon = require('sinon');
const { mockClient } = require('../../_fixtures/mock-client');
const proxyquire = require('proxyquire').noCallThru();

// The planning node requires these modules
const rewiredPlanningNode = proxyquire('../../../nodes/planning/mealie-planning', {
    '../../lib/client-wrapper': {
        executeWithClient: async (config, operation) => {
            // Directly execute the operation with our mock client
            return operation(mockClient);
        },
    },
});

// Explicitly register node types
helper.init(require.resolve('node-red'));

describe('mealie-planning Node with delete operation', function () {
    this.timeout(5000);

    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload();
        sinon.restore();
        helper.stopServer(done);
    });

    it('should be loaded', function (done) {
        const flow = [
            {
                id: 'n1',
                type: 'mealie-planning',
                name: 'Test Planning Delete',
                server: 'server1',
                operation: 'delete',
                mealPlanId: 'plan-123',
            },
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
        ];

        helper.load([rewiredPlanningNode, configNode], flow, function () {
            try {
                const n1 = helper.getNode('n1');
                n1.should.have.property('name', 'Test Planning Delete');
                n1.should.have.property('operation', 'delete');
                n1.should.have.property('mealPlanId', 'plan-123');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should delete a meal plan with mealPlanId from node configuration', function (done) {
        const mealPlanId = 'plan-123';

        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-planning',
                name: 'Test Planning Node',
                server: 'server1',
                operation: 'delete',
                mealPlanId: mealPlanId,
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset deleteMealPlan stub to return specific data
        mockClient.mealPlans = {
            deleteMealPlan: sinon.stub().resolves({
                success: true,
                message: 'Meal plan deleted successfully',
            }),
        };

        helper.load([rewiredPlanningNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'delete');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('success', true);
                    msg.payload.data.should.have.property('message', 'Meal plan deleted successfully');

                    // Verify the stub was called with the correct parameters
                    sinon.assert.calledOnce(mockClient.mealPlans.deleteMealPlan);
                    sinon.assert.calledWith(mockClient.mealPlans.deleteMealPlan, mealPlanId);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should delete a meal plan with mealPlanId from msg.payload', function (done) {
        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-planning',
                name: 'Test Planning Node',
                server: 'server1',
                operation: 'delete',
                // No mealPlanId set in the node config
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        const mealPlanId = 'plan-456';

        // Reset deleteMealPlan stub to return specific data
        mockClient.mealPlans.deleteMealPlan = sinon.stub().resolves({
            success: true,
            message: 'Meal plan deleted successfully',
        });

        helper.load([rewiredPlanningNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'delete');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('success', true);

                    // Verify the stub was called with the correct parameters
                    sinon.assert.calledOnce(mockClient.mealPlans.deleteMealPlan);
                    sinon.assert.calledWith(mockClient.mealPlans.deleteMealPlan, mealPlanId);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node with mealPlanId in the payload
            n1.receive({
                payload: {
                    mealPlanId: mealPlanId,
                },
            });
        });
    });

    it('should fail if no meal plan ID is provided', function (done) {
        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-planning',
                name: 'Test Planning Node',
                server: 'server1',
                operation: 'delete',
                // No mealPlanId provided
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        helper.load([rewiredPlanningNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'delete');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property(
                        'message',
                        'No meal plan ID provided for delete operation. Specify in node config or msg.payload.mealPlanId',
                    );
                    msg.payload.error.should.have.property('code', 'VALIDATION_ERROR');

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should handle API errors gracefully', function (done) {
        const mealPlanId = 'plan-999';

        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-planning',
                name: 'Test Planning Node',
                server: 'server1',
                operation: 'delete',
                mealPlanId: mealPlanId,
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Make the deleteMealPlan stub throw an error
        mockClient.mealPlans.deleteMealPlan = sinon.stub().rejects(new Error('API Error: Meal plan not found'));

        helper.load([rewiredPlanningNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'delete');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property('message', 'API Error: Meal plan not found');

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });
});
