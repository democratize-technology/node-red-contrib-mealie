require('should');

const helper = require('node-red-node-test-helper');
const configNode = require('../../../nodes/config/mealie-server-config');
const sinon = require('sinon');
const { mockClient } = require('../../_fixtures/mock-client');
const proxyquire = require('proxyquire').noCallThru();

// The admin node requires these modules
const rewiredAdminNode = proxyquire('../../../nodes/admin/mealie-admin', {
    '../../lib/client-wrapper': {
        executeWithClient: async (config, operation) => {
            // Directly execute the operation with our mock client
            return operation(mockClient);
        },
    },
});

// Explicitly register node types
helper.init(require.resolve('node-red'));

describe('mealie-admin Node with createGroup operation', function () {
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
                type: 'mealie-admin',
                name: 'Test Admin CreateGroup',
                server: 'server1',
                operation: 'createGroup',
                groupData: '{"name":"Test Group"}',
            },
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
        ];

        helper.load([rewiredAdminNode, configNode], flow, function () {
            try {
                const n1 = helper.getNode('n1');
                n1.should.have.property('name', 'Test Admin CreateGroup');
                n1.should.have.property('operation', 'createGroup');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should create a group with node configuration', function (done) {
        const groupData = {
            name: 'Test Group',
            users: ['user-123', 'user-456'],
        };

        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-admin',
                name: 'Test Admin Node',
                server: 'server1',
                operation: 'createGroup',
                groupData: JSON.stringify(groupData),
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset createGroup stub to return specific data
        mockClient.admin.createGroup = sinon.stub().resolves({
            id: 'group-123',
            name: 'Test Group',
            users: ['user-123', 'user-456'],
        });

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'createGroup');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('id', 'group-123');
                    msg.payload.data.should.have.property('name', 'Test Group');
                    msg.payload.data.should.have.property('users').which.is.an.Array().and.have.length(2);

                    // Verify the stub was called with the correct parameters
                    sinon.assert.calledOnce(mockClient.admin.createGroup);
                    sinon.assert.calledWith(mockClient.admin.createGroup, groupData);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should create a group with parameters from msg.payload', function (done) {
        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-admin',
                name: 'Test Admin Node',
                server: 'server1',
                // No groupData set in the node config
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        const groupData = {
            name: 'Payload Group',
            users: ['user-789'],
        };

        // Reset createGroup stub to return specific data
        mockClient.admin.createGroup = sinon.stub().resolves({
            id: 'group-456',
            name: 'Payload Group',
            users: ['user-789'],
        });

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'createGroup');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('id', 'group-456');
                    msg.payload.data.should.have.property('name', 'Payload Group');
                    msg.payload.data.should.have.property('users').which.is.an.Array().and.have.length(1);

                    // Verify the stub was called with the correct parameters
                    sinon.assert.calledOnce(mockClient.admin.createGroup);
                    sinon.assert.calledWith(mockClient.admin.createGroup, groupData);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node with operation and groupData in the payload
            n1.receive({
                payload: {
                    operation: 'createGroup',
                    groupData: groupData,
                },
            });
        });
    });

    it('should fail if no group data is provided', function (done) {
        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-admin',
                name: 'Test Admin Node',
                server: 'server1',
                operation: 'createGroup',
                // No groupData provided
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'createGroup');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property(
                        'message',
                        'No group data provided for createGroup operation. Specify in node config or msg.payload.groupData',
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
        const groupData = {
            name: 'Test Group',
            users: ['user-123'],
        };

        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-admin',
                name: 'Test Admin Node',
                server: 'server1',
                operation: 'createGroup',
                groupData: JSON.stringify(groupData),
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Make the createGroup stub throw an error
        mockClient.admin.createGroup = sinon.stub().rejects(new Error('API Error: Group name already exists'));

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'createGroup');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property('message', 'API Error: Group name already exists');

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
