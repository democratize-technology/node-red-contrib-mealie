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

describe('mealie-admin Node with updateUser operation', function () {
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
                name: 'Test Admin UpdateUser',
                server: 'server1',
                operation: 'updateUser',
                userId: 'user-123',
                userData: '{"fullName":"Updated User"}',
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
                n1.should.have.property('name', 'Test Admin UpdateUser');
                n1.should.have.property('operation', 'updateUser');
                n1.should.have.property('userId', 'user-123');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should update a user with node configuration', function (done) {
        const userId = 'user-123';
        const userData = {
            fullName: 'Updated User',
            email: 'updated@example.com',
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
                operation: 'updateUser',
                userId: userId,
                userData: JSON.stringify(userData),
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset updateUser stub to return specific data
        mockClient.admin.updateUser = sinon.stub().resolves({
            id: userId,
            username: 'testuser',
            email: 'updated@example.com',
            fullName: 'Updated User',
        });

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'updateUser');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('id', userId);
                    msg.payload.data.should.have.property('email', 'updated@example.com');
                    msg.payload.data.should.have.property('fullName', 'Updated User');

                    // Verify the stub was called with the correct parameters
                    sinon.assert.calledOnce(mockClient.admin.updateUser);
                    sinon.assert.calledWith(mockClient.admin.updateUser, userId, userData);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should update a user with parameters from msg.payload', function (done) {
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
                // No userId or userData set in the node config
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        const userId = 'user-456';
        const userData = {
            fullName: 'Payload Updated User',
            email: 'payload.updated@example.com',
            group: 'new-group',
        };

        // Reset updateUser stub to return specific data
        mockClient.admin.updateUser = sinon.stub().resolves({
            id: userId,
            username: 'payloaduser',
            email: 'payload.updated@example.com',
            fullName: 'Payload Updated User',
            group: 'new-group',
        });

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'updateUser');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('id', userId);
                    msg.payload.data.should.have.property('username', 'payloaduser');
                    msg.payload.data.should.have.property('email', 'payload.updated@example.com');
                    msg.payload.data.should.have.property('fullName', 'Payload Updated User');
                    msg.payload.data.should.have.property('group', 'new-group');

                    // Verify the stub was called with the correct parameters
                    sinon.assert.calledOnce(mockClient.admin.updateUser);
                    sinon.assert.calledWith(mockClient.admin.updateUser, userId, userData);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node with operation, userId and userData in the payload
            n1.receive({
                payload: {
                    operation: 'updateUser',
                    userId: userId,
                    userData: userData,
                },
            });
        });
    });

    it('should fail if no user ID is provided', function (done) {
        const userData = {
            fullName: 'Updated User',
            email: 'updated@example.com',
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
                operation: 'updateUser',
                // No userId provided
                userData: JSON.stringify(userData),
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
                    msg.payload.should.have.property('operation', 'updateUser');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property(
                        'message',
                        'No user ID provided for updateUser operation. Specify in node config or msg.payload.userId',
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

    it('should fail if no user data is provided', function (done) {
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
                operation: 'updateUser',
                userId: 'user-123',
                // No userData provided
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
                    msg.payload.should.have.property('operation', 'updateUser');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property(
                        'message',
                        'No user data provided for updateUser operation. Specify in node config or msg.payload.userData',
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
        const userId = 'user-123';
        const userData = {
            fullName: 'Updated User',
            email: 'updated@example.com',
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
                operation: 'updateUser',
                userId: userId,
                userData: JSON.stringify(userData),
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Make the updateUser stub throw an error
        mockClient.admin.updateUser = sinon.stub().rejects(new Error('API Error: User not found'));

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'updateUser');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property('message', 'API Error: User not found');

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
