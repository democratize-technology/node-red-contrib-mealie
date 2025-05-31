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

describe('mealie-admin Node with getBackups operation', function () {
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
                name: 'Test Admin GetBackups',
                server: 'server1',
                operation: 'getBackups',
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
                n1.should.have.property('name', 'Test Admin GetBackups');
                n1.should.have.property('operation', 'getBackups');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should retrieve all backups', function (done) {
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
                operation: 'getBackups',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset getBackups stub to return specific data
        mockClient.admin.getBackups = sinon.stub().resolves([
            { id: 'backup-123', name: 'Backup 2023-01-01', created_at: '2023-01-01T00:00:00.000Z', size: 1024 },
            { id: 'backup-456', name: 'Backup 2023-02-01', created_at: '2023-02-01T00:00:00.000Z', size: 2048 },
        ]);

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'getBackups');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.be.an.Array().and.have.length(2);
                    msg.payload.data[0].should.have.property('id', 'backup-123');
                    msg.payload.data[0].should.have.property('name', 'Backup 2023-01-01');
                    msg.payload.data[1].should.have.property('id', 'backup-456');
                    msg.payload.data[1].should.have.property('name', 'Backup 2023-02-01');

                    // Verify the stub was called
                    sinon.assert.calledOnce(mockClient.admin.getBackups);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should retrieve backups when operation is specified in msg.payload', function (done) {
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
                // No operation set in the node config
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset getBackups stub to return specific data
        mockClient.admin.getBackups = sinon.stub().resolves([
            { id: 'backup-123', name: 'Backup 2023-01-01', created_at: '2023-01-01T00:00:00.000Z', size: 1024 },
            { id: 'backup-456', name: 'Backup 2023-02-01', created_at: '2023-02-01T00:00:00.000Z', size: 2048 },
        ]);

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'getBackups');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.be.an.Array().and.have.length(2);

                    // Verify the stub was called
                    sinon.assert.calledOnce(mockClient.admin.getBackups);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node with operation in the payload
            n1.receive({
                payload: {
                    operation: 'getBackups',
                },
            });
        });
    });

    it('should handle empty backup list', function (done) {
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
                operation: 'getBackups',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset getBackups stub to return empty array
        mockClient.admin.getBackups = sinon.stub().resolves([]);

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'getBackups');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.be.an.Array().and.have.length(0);

                    // Verify the stub was called
                    sinon.assert.calledOnce(mockClient.admin.getBackups);

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
                operation: 'getBackups',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Make the getBackups stub throw an error
        mockClient.admin.getBackups = sinon.stub().rejects(new Error('API Error: Failed to retrieve backups'));

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'getBackups');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property('message', 'API Error: Failed to retrieve backups');

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
