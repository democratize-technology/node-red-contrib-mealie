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

describe('mealie-household Node with getMembers operation', function () {
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
                name: 'Test Household GetMembers',
                server: 'server1',
                operation: 'getMembers',
                householdId: 'household-123',
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
                n1.should.have.property('name', 'Test Household GetMembers');
                n1.should.have.property('operation', 'getMembers');
                n1.should.have.property('householdId', 'household-123');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should retrieve household members when householdId is provided in node config', function (done) {
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
                operation: 'getMembers',
                householdId: 'household-123',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Set up mock for household operation
        mockClient.household = {
            getHouseholdMembers: sinon.stub().resolves([
                { id: 'user-123', name: 'John Doe', email: 'john@example.com' },
                { id: 'user-456', name: 'Jane Smith', email: 'jane@example.com' }
            ])
        };

        helper.load([rewiredHouseholdNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'getMembers');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.be.an.Array();
                    msg.payload.data.should.have.length(2);
                    msg.payload.data[0].should.have.property('name', 'John Doe');
                    msg.payload.data[1].should.have.property('name', 'Jane Smith');

                    // Verify the stub was called with the right argument
                    sinon.assert.calledOnce(mockClient.household.getHouseholdMembers);
                    sinon.assert.calledWith(mockClient.household.getHouseholdMembers, 'household-123');

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should retrieve household members when householdId is provided in msg.payload', function (done) {
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
                operation: 'getMembers',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset stub
        mockClient.household.getHouseholdMembers = sinon.stub().resolves([
            { id: 'user-789', name: 'Bob Johnson', email: 'bob@example.com' }
        ]);

        helper.load([rewiredHouseholdNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'getMembers');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.be.an.Array();
                    msg.payload.data.should.have.length(1);
                    msg.payload.data[0].should.have.property('name', 'Bob Johnson');

                    // Verify the stub was called with the right argument
                    sinon.assert.calledOnce(mockClient.household.getHouseholdMembers);
                    sinon.assert.calledWith(mockClient.household.getHouseholdMembers, 'household-456');

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node with householdId in the payload
            n1.receive({ payload: { householdId: 'household-456' } });
        });
    });

    it('should throw an error when no householdId is provided', function (done) {
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
                operation: 'getMembers',
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
                    msg.payload.should.have.property('operation', 'getMembers');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property(
                        'message',
                        'No household ID provided for getMembers operation. Specify in node config or msg.payload.householdId'
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
                operation: 'getMembers',
                householdId: 'household-999',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Make the getHouseholdMembers stub throw an error
        mockClient.household.getHouseholdMembers = sinon.stub().rejects(new Error('Cannot retrieve members'));

        helper.load([rewiredHouseholdNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'getMembers');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property('message', 'Cannot retrieve members');

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
