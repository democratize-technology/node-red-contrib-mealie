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

describe('mealie-household Node with get operation', function () {
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
                name: 'Test Household Get',
                server: 'server1',
                operation: 'get',
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
                n1.should.have.property('name', 'Test Household Get');
                n1.should.have.property('operation', 'get');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should retrieve all households when no householdId is provided', function (done) {
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
                operation: 'get',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Set up mock for household operations
        mockClient.households.getAllHouseholds = sinon.stub().resolves([
            { id: 'household-123', name: 'Household 1' },
            { id: 'household-456', name: 'Household 2' },
        ]);
        mockClient.households.getHousehold = sinon.stub().resolves({});

        helper.load([rewiredHouseholdNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'get');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.be.an.Array();
                    msg.payload.data.should.have.length(2);
                    msg.payload.data[0].should.have.property('name', 'Household 1');
                    msg.payload.data[1].should.have.property('name', 'Household 2');

                    // Verify the correct stub was called
                    sinon.assert.calledOnce(mockClient.households.getAllHouseholds);
                    sinon.assert.notCalled(mockClient.households.getHousehold);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should retrieve a specific household when householdId is provided in node config', function (done) {
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
                operation: 'get',
                householdId: 'household-123',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset stubs
        mockClient.households.getAllHouseholds = sinon.stub().resolves([]);
        mockClient.households.getHousehold = sinon.stub().resolves({
            id: 'household-123',
            name: 'Household 1',
            members: ['user-123', 'user-456']
        });

        helper.load([rewiredHouseholdNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'get');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('id', 'household-123');
                    msg.payload.data.should.have.property('name', 'Household 1');

                    // Verify the correct stub was called with the right argument
                    sinon.assert.notCalled(mockClient.households.getAllHouseholds);
                    sinon.assert.calledOnce(mockClient.households.getHousehold);
                    sinon.assert.calledWith(mockClient.households.getHousehold, 'household-123');

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should retrieve a specific household when householdId is provided in msg.payload', function (done) {
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
                operation: 'get',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset stubs
        mockClient.households.getAllHouseholds = sinon.stub().resolves([]);
        mockClient.households.getHousehold = sinon.stub().resolves({
            id: 'household-456',
            name: 'Household 2',
            members: ['user-789']
        });

        helper.load([rewiredHouseholdNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'get');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('id', 'household-456');
                    msg.payload.data.should.have.property('name', 'Household 2');

                    // Verify the correct stub was called with the right argument
                    sinon.assert.notCalled(mockClient.households.getAllHouseholds);
                    sinon.assert.calledOnce(mockClient.households.getHousehold);
                    sinon.assert.calledWith(mockClient.households.getHousehold, 'household-456');

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node with householdId in the payload
            n1.receive({ payload: { householdId: 'household-456' } });
        });
    });

    it('should handle errors gracefully', function (done) {
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
                operation: 'get',
                householdId: 'household-999',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Make the getHousehold stub throw an error
        mockClient.households.getHousehold = sinon.stub().rejects(new Error('Household not found'));

        helper.load([rewiredHouseholdNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'get');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property('message', 'Household not found');

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
