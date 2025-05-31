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

describe('mealie-admin Node with getGroups operation', function () {
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
                name: 'Test Admin GetGroups',
                server: 'server1',
                operation: 'getGroups',
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
                n1.should.have.property('name', 'Test Admin GetGroups');
                n1.should.have.property('operation', 'getGroups');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should retrieve all groups', function (done) {
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
                operation: 'getGroups',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset getAllGroups stub to return specific data
        mockClient.admin.getAllGroups = sinon.stub().resolves([
            { id: 'group-123', name: 'Group 1' },
            { id: 'group-456', name: 'Group 2' },
        ]);

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'getGroups');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.be.an.Array().and.have.length(2);
                    msg.payload.data[0].should.have.property('id', 'group-123');
                    msg.payload.data[0].should.have.property('name', 'Group 1');
                    msg.payload.data[1].should.have.property('id', 'group-456');
                    msg.payload.data[1].should.have.property('name', 'Group 2');

                    // Verify the stub was called
                    sinon.assert.calledOnce(mockClient.admin.getAllGroups);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should retrieve a specific group', function (done) {
        const groupId = 'group-123';

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
                operation: 'getGroups',
                groupId: groupId,
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset getGroup stub to return specific data
        mockClient.admin.getGroup = sinon.stub().resolves({
            id: groupId,
            name: 'Group 1',
            users: ['user-123', 'user-456'],
        });

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'getGroups');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('id', groupId);
                    msg.payload.data.should.have.property('name', 'Group 1');
                    msg.payload.data.should.have.property('users').which.is.an.Array().and.have.length(2);

                    // Verify the stub was called with the correct parameters
                    sinon.assert.calledOnce(mockClient.admin.getGroup);
                    sinon.assert.calledWith(mockClient.admin.getGroup, groupId);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should retrieve a group when groupId is specified in msg.payload', function (done) {
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
                operation: 'getGroups',
                // No groupId set in the node config
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        const groupId = 'group-456';

        // Reset getGroup stub to return specific data
        mockClient.admin.getGroup = sinon.stub().resolves({
            id: groupId,
            name: 'Group 2',
            users: ['user-789'],
        });

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'getGroups');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('id', groupId);
                    msg.payload.data.should.have.property('name', 'Group 2');
                    msg.payload.data.should.have.property('users').which.is.an.Array().and.have.length(1);

                    // Verify the stub was called with the correct parameters
                    sinon.assert.calledOnce(mockClient.admin.getGroup);
                    sinon.assert.calledWith(mockClient.admin.getGroup, groupId);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node with groupId in the payload
            n1.receive({
                payload: {
                    groupId: groupId,
                },
            });
        });
    });

    it('should handle API errors gracefully', function (done) {
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
                operation: 'getGroups',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Make the getAllGroups stub throw an error
        mockClient.admin.getAllGroups = sinon.stub().rejects(new Error('API Error'));

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'getGroups');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property('message', 'API Error');

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
