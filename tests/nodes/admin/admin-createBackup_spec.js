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

describe('mealie-admin Node with createBackup operation', function () {
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
                name: 'Test Admin CreateBackup',
                server: 'server1',
                operation: 'createBackup',
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
                n1.should.have.property('name', 'Test Admin CreateBackup');
                n1.should.have.property('operation', 'createBackup');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should create a backup successfully', function (done) {
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
                operation: 'createBackup',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset createBackup stub to return specific data
        mockClient.admin.createBackup = sinon.stub().resolves({
            id: 'backup-123',
            name: 'Backup_2023-05-01_123456',
            created_at: '2023-05-01T12:34:56.000Z',
            path: '/backups/Backup_2023-05-01_123456.zip',
            size: 1024 * 1024  // 1MB
        });

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'createBackup');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('id', 'backup-123');
                    msg.payload.data.should.have.property('name', 'Backup_2023-05-01_123456');
                    msg.payload.data.should.have.property('created_at', '2023-05-01T12:34:56.000Z');
                    msg.payload.data.should.have.property('path', '/backups/Backup_2023-05-01_123456.zip');
                    msg.payload.data.should.have.property('size');

                    // Verify the stub was called
                    sinon.assert.calledOnce(mockClient.admin.createBackup);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should create a backup when operation is specified in msg.payload', function (done) {
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

        // Reset createBackup stub to return specific data
        mockClient.admin.createBackup = sinon.stub().resolves({
            id: 'backup-456',
            name: 'Backup_2023-05-02_123456',
            created_at: '2023-05-02T12:34:56.000Z',
            path: '/backups/Backup_2023-05-02_123456.zip',
            size: 2 * 1024 * 1024  // 2MB
        });

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'createBackup');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('id', 'backup-456');
                    msg.payload.data.should.have.property('name', 'Backup_2023-05-02_123456');
                    msg.payload.data.should.have.property('created_at', '2023-05-02T12:34:56.000Z');

                    // Verify the stub was called
                    sinon.assert.calledOnce(mockClient.admin.createBackup);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node with operation in the payload
            n1.receive({ payload: { operation: 'createBackup' } });
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
                type: 'mealie-admin',
                name: 'Test Admin Node',
                server: 'server1',
                operation: 'createBackup',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Make the createBackup stub throw an error
        mockClient.admin.createBackup = sinon.stub().rejects(new Error('API Error: Failed to create backup'));

        helper.load([rewiredAdminNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'createBackup');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property('message', 'API Error: Failed to create backup');

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
