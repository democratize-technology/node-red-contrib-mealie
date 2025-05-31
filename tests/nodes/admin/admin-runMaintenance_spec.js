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

describe('mealie-admin Node with runMaintenance operation', function () {
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
                name: 'Test Admin RunMaintenance',
                server: 'server1',
                operation: 'runMaintenance',
                taskName: 'cleanup-images',
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
                n1.should.have.property('name', 'Test Admin RunMaintenance');
                n1.should.have.property('operation', 'runMaintenance');
                n1.should.have.property('taskName', 'cleanup-images');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should run a maintenance task with taskName from node configuration', function (done) {
        const taskName = 'cleanup-images';

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
                operation: 'runMaintenance',
                taskName: taskName,
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset runMaintenanceTask stub to return specific data
        mockClient.admin.runMaintenanceTask = sinon.stub().resolves({
            success: true,
            message: 'Maintenance task started',
            task: taskName,
        });

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'runMaintenance');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('success', true);
                    msg.payload.data.should.have.property('message', 'Maintenance task started');
                    msg.payload.data.should.have.property('task', taskName);

                    // Verify the stub was called with the correct parameters
                    sinon.assert.calledOnce(mockClient.admin.runMaintenanceTask);
                    sinon.assert.calledWith(mockClient.admin.runMaintenanceTask, taskName);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should run a maintenance task with taskName from msg.payload', function (done) {
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
                operation: 'runMaintenance',
                // No taskName set in the node config
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        const taskName = 'purge-old-data';

        // Reset runMaintenanceTask stub to return specific data
        mockClient.admin.runMaintenanceTask = sinon.stub().resolves({
            success: true,
            message: 'Maintenance task started',
            task: taskName,
        });

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'runMaintenance');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('success', true);
                    msg.payload.data.should.have.property('message', 'Maintenance task started');
                    msg.payload.data.should.have.property('task', taskName);

                    // Verify the stub was called with the correct parameters
                    sinon.assert.calledOnce(mockClient.admin.runMaintenanceTask);
                    sinon.assert.calledWith(mockClient.admin.runMaintenanceTask, taskName);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node with taskName in the payload
            n1.receive({
                payload: {
                    taskName: taskName,
                },
            });
        });
    });

    it('should fail if no task name is provided', function (done) {
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
                operation: 'runMaintenance',
                // No taskName provided
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
                    msg.payload.should.have.property('operation', 'runMaintenance');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property(
                        'message',
                        'No task name provided for runMaintenance operation. Specify in node config or msg.payload.taskName',
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
        const taskName = 'invalid-task';

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
                operation: 'runMaintenance',
                taskName: taskName,
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Make the runMaintenanceTask stub throw an error
        mockClient.admin.runMaintenanceTask = sinon.stub().rejects(new Error('API Error: Invalid maintenance task'));

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'runMaintenance');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property('message', 'API Error: Invalid maintenance task');

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
