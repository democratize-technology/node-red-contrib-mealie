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

describe('mealie-admin Node with deleteUser operation', function () {
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
                name: 'Test Admin DeleteUser',
                server: 'server1',
                operation: 'deleteUser',
                userId: 'user-123',
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
                n1.should.have.property('name', 'Test Admin DeleteUser');
                n1.should.have.property('operation', 'deleteUser');
                n1.should.have.property('userId', 'user-123');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should delete a user with node configuration', function (done) {
        const userId = 'user-123';

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
                operation: 'deleteUser',
                userId: userId,
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset deleteUser stub to return specific data
        mockClient.admin.deleteUser = sinon.stub().resolves({ success: true });

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'deleteUser');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('success', true);

                    // Verify the stub was called with the correct parameters
                    sinon.assert.calledOnce(mockClient.admin.deleteUser);
                    sinon.assert.calledWith(mockClient.admin.deleteUser, userId);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should delete a user with parameters from msg.payload', function (done) {
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
                // No userId set in the node config
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        const userId = 'user-456';

        // Reset deleteUser stub to return specific data
        mockClient.admin.deleteUser = sinon.stub().resolves({ success: true });

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'deleteUser');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('success', true);

                    // Verify the stub was called with the correct parameters
                    sinon.assert.calledOnce(mockClient.admin.deleteUser);
                    sinon.assert.calledWith(mockClient.admin.deleteUser, userId);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node with operation and userId in the payload
            n1.receive({
                payload: {
                    operation: 'deleteUser',
                    userId: userId,
                },
            });
        });
    });

    it('should fail if no user ID is provided', function (done) {
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
                operation: 'deleteUser',
                // No userId provided
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
                    msg.payload.should.have.property('operation', 'deleteUser');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property(
                        'message',
                        'No user ID provided for deleteUser operation. Specify in node config or msg.payload.userId',
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
                operation: 'deleteUser',
                userId: userId,
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Make the deleteUser stub throw an error
        mockClient.admin.deleteUser = sinon.stub().rejects(new Error('API Error: User not found'));

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'deleteUser');
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
