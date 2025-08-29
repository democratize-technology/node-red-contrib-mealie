require('should');

const helper = require('node-red-node-test-helper');
const configNode = require('../../../nodes/config/mealie-server-config');
const sinon = require('sinon');
const { mockClient } = require('../../_fixtures/mock-client');
const proxyquire = require('proxyquire').noCallThru();

// The household node requires these modules
const rewiredHouseholdNode = proxyquire('../../../nodes/household/mealie-household', {
    '../../lib/client-wrapper': {
        executeWithClient: async (config, operation) => {
            // Directly execute the operation with our mock client
            return operation(mockClient);
        },
    },
});

// Explicitly register node types
helper.init(require.resolve('node-red'));

describe('mealie-household Node with updatePreferences operation', function () {
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
                type: 'mealie-household',
                name: 'Test Household UpdatePreferences',
                server: 'server1',
                operation: 'updatePreferences',
                householdId: 'household-123',
                preferencesData: '{"notificationTime":"09:00"}',
            },
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
        ];

        helper.load([rewiredHouseholdNode, configNode], flow, function () {
            try {
                const n1 = helper.getNode('n1');
                n1.should.have.property('name', 'Test Household UpdatePreferences');
                n1.should.have.property('operation', 'updatePreferences');
                n1.should.have.property('householdId', 'household-123');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should update household preferences when householdId and preferencesData are provided in node config', function (done) {
        const householdId = 'household-123';
        const preferencesData = {
            notificationTime: '09:00',
            recipeLandingType: 'recent',
            recipeCardType: 'compact',
            recipeShowNutrition: false,
            recipeShowAssets: true,
            enableNotifications: true
        };

        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-household',
                name: 'Test Household Node',
                server: 'server1',
                operation: 'updatePreferences',
                householdId: householdId,
                preferencesData: JSON.stringify(preferencesData),
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Set up mock for household operation
        mockClient.households.updateHouseholdPreferences = sinon.stub().resolves({
            id: 'pref-123',
            householdId: householdId,
            notificationTime: '09:00',
            recipeLandingType: 'recent',
            recipeCardType: 'compact',
            recipeShowNutrition: false,
            recipeShowAssets: true,
            enableNotifications: true
        });

        helper.load([rewiredHouseholdNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'updatePreferences');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('id', 'pref-123');
                    msg.payload.data.should.have.property('householdId', householdId);
                    msg.payload.data.should.have.property('notificationTime', '09:00');
                    msg.payload.data.should.have.property('recipeLandingType', 'recent');
                    msg.payload.data.should.have.property('recipeCardType', 'compact');

                    // Verify the stub was called with the right arguments
                    sinon.assert.calledOnce(mockClient.households.updateHouseholdPreferences);
                    sinon.assert.calledWith(mockClient.households.updateHouseholdPreferences, householdId, preferencesData);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should update household preferences when householdId and preferencesData are provided in msg.payload', function (done) {
        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-household',
                name: 'Test Household Node',
                server: 'server1',
                operation: 'updatePreferences',
                // No householdId or preferencesData in node config
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        const householdId = 'household-456';
        const preferencesData = {
            notificationTime: '10:00',
            recipeLandingType: 'all',
            recipeCardType: 'wide',
            recipeShowNutrition: true,
            recipeShowAssets: false,
            enableNotifications: false
        };

        // Reset stub for mock
        mockClient.households.updateHouseholdPreferences = sinon.stub().resolves({
            id: 'pref-456',
            householdId: householdId,
            notificationTime: '10:00',
            recipeLandingType: 'all',
            recipeCardType: 'wide',
            recipeShowNutrition: true,
            recipeShowAssets: false,
            enableNotifications: false
        });

        helper.load([rewiredHouseholdNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'updatePreferences');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('id', 'pref-456');
                    msg.payload.data.should.have.property('householdId', householdId);
                    msg.payload.data.should.have.property('notificationTime', '10:00');
                    msg.payload.data.should.have.property('recipeLandingType', 'all');
                    msg.payload.data.should.have.property('recipeCardType', 'wide');

                    // Verify the stub was called with the right arguments
                    sinon.assert.calledOnce(mockClient.households.updateHouseholdPreferences);
                    sinon.assert.calledWith(mockClient.households.updateHouseholdPreferences, householdId, preferencesData);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node with householdId and preferencesData in the payload
            n1.receive({
                payload: {
                    householdId: householdId,
                    preferencesData: preferencesData
                }
            });
        });
    });

    it('should allow householdId from config and preferencesData from msg.payload', function (done) {
        const householdId = 'household-123';
        const preferencesData = {
            notificationTime: '11:00',
            recipeLandingType: 'recent',
            recipeShowNutrition: true
        };

        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-household',
                name: 'Test Household Node',
                server: 'server1',
                operation: 'updatePreferences',
                householdId: householdId,
                // No preferencesData in node config
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset stub for mock
        mockClient.households.updateHouseholdPreferences = sinon.stub().resolves({
            id: 'pref-123',
            householdId: householdId,
            notificationTime: '11:00',
            recipeLandingType: 'recent',
            recipeShowNutrition: true
        });

        helper.load([rewiredHouseholdNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'updatePreferences');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('householdId', householdId);
                    msg.payload.data.should.have.property('notificationTime', '11:00');

                    // Verify the stub was called with the right arguments
                    sinon.assert.calledOnce(mockClient.households.updateHouseholdPreferences);
                    sinon.assert.calledWith(mockClient.households.updateHouseholdPreferences, householdId, preferencesData);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node with only preferencesData in the payload
            n1.receive({
                payload: {
                    preferencesData: preferencesData
                }
            });
        });
    });

    it('should fail if no household ID is provided', function (done) {
        const preferencesData = {
            notificationTime: '09:00',
            recipeLandingType: 'recent'
        };

        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-household',
                name: 'Test Household Node',
                server: 'server1',
                operation: 'updatePreferences',
                // No householdId provided
                preferencesData: JSON.stringify(preferencesData),
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        helper.load([rewiredHouseholdNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'updatePreferences');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property(
                        'message',
                        'No household ID provided for updatePreferences operation. Specify in node config or msg.payload.householdId'
                    );

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node without a householdId
            n1.receive({});
        });
    });

    it('should fail if no preferences data is provided', function (done) {
        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-household',
                name: 'Test Household Node',
                server: 'server1',
                operation: 'updatePreferences',
                householdId: 'household-123',
                // No preferencesData provided
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        helper.load([rewiredHouseholdNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'updatePreferences');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property(
                        'message',
                        'No preferences data provided for updatePreferences operation. Specify in node config or msg.payload.preferencesData'
                    );

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node without preferencesData
            n1.receive({});
        });
    });

    it('should handle errors gracefully', function (done) {
        const householdId = 'household-999';
        const preferencesData = {
            notificationTime: '09:00',
            recipeLandingType: 'recent'
        };

        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-household',
                name: 'Test Household Node',
                server: 'server1',
                operation: 'updatePreferences',
                householdId: householdId,
                preferencesData: JSON.stringify(preferencesData),
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Make the updateHouseholdPreferences stub throw an error
        mockClient.households.updateHouseholdPreferences = sinon.stub().rejects(new Error('Cannot update preferences: Household not found'));

        helper.load([rewiredHouseholdNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'updatePreferences');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property('message', 'Cannot update preferences: Household not found');

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
