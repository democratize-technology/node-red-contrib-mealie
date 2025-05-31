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

describe('mealie-admin Node with updateGroup operation', function () {
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
                name: 'Test Admin UpdateGroup',
                server: 'server1',
                operation: 'updateGroup',
                groupId: 'group-123',
                groupData: '{"name":"Updated Group"}',
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
                n1.should.have.property('name', 'Test Admin UpdateGroup');
                n1.should.have.property('operation', 'updateGroup');
                n1.should.have.property('groupId', 'group-123');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should update a group with node configuration', function (done) {
        const groupId = 'group-123';
        const groupData = {
            name: 'Updated Group',
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
                operation: 'updateGroup',
                groupId: groupId,
                groupData: JSON.stringify(groupData),
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset updateGroup stub to return specific data
        mockClient.admin.updateGroup = sinon.stub().resolves({
            id: groupId,
            name: 'Updated Group',
            users: ['user-123', 'user-456'],
        });

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'updateGroup');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('id', groupId);
                    msg.payload.data.should.have.property('name', 'Updated Group');
                    msg.payload.data.should.have.property('users').which.is.an.Array().and.have.length(2);

                    // Verify the stub was called with the correct parameters
                    sinon.assert.calledOnce(mockClient.admin.updateGroup);
                    sinon.assert.calledWith(mockClient.admin.updateGroup, groupId, groupData);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should update a group with parameters from msg.payload', function (done) {
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
                // No groupId or groupData set in the node config
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        const groupId = 'group-456';
        const groupData = {
            name: 'Payload Updated Group',
            users: ['user-789'],
            preferences: { someOption: true },
        };

        // Reset updateGroup stub to return specific data
        mockClient.admin.updateGroup = sinon.stub().resolves({
            id: groupId,
            name: 'Payload Updated Group',
            users: ['user-789'],
            preferences: { someOption: true },
        });

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'updateGroup');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('id', groupId);
                    msg.payload.data.should.have.property('name', 'Payload Updated Group');
                    msg.payload.data.should.have.property('users').which.is.an.Array().and.have.length(1);
                    msg.payload.data.should.have.property('preferences').which.is.an.Object();

                    // Verify the stub was called with the correct parameters
                    sinon.assert.calledOnce(mockClient.admin.updateGroup);
                    sinon.assert.calledWith(mockClient.admin.updateGroup, groupId, groupData);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node with operation, groupId and groupData in the payload
            n1.receive({
                payload: {
                    operation: 'updateGroup',
                    groupId: groupId,
                    groupData: groupData,
                },
            });
        });
    });

    it('should fail if no group ID is provided', function (done) {
        const groupData = {
            name: 'Updated Group',
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
                operation: 'updateGroup',
                // No groupId provided
                groupData: JSON.stringify(groupData),
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
                    msg.payload.should.have.property('operation', 'updateGroup');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property(
                        'message',
                        'No group ID provided for updateGroup operation. Specify in node config or msg.payload.groupId',
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
                operation: 'updateGroup',
                groupId: 'group-123',
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
                    msg.payload.should.have.property('operation', 'updateGroup');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property(
                        'message',
                        'No group data provided for updateGroup operation. Specify in node config or msg.payload.groupData',
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
        const groupId = 'group-123';
        const groupData = {
            name: 'Updated Group',
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
                operation: 'updateGroup',
                groupId: groupId,
                groupData: JSON.stringify(groupData),
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Make the updateGroup stub throw an error
        mockClient.admin.updateGroup = sinon.stub().rejects(new Error('API Error: Group not found'));

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'updateGroup');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property('message', 'API Error: Group not found');

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
