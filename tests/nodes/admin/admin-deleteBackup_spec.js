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

describe('mealie-admin Node with deleteBackup operation', function () {
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
        name: 'Test Admin DeleteBackup',
        server: 'server1',
        operation: 'deleteBackup',
        backupId: 'backup-123',
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
        n1.should.have.property('name', 'Test Admin DeleteBackup');
        n1.should.have.property('operation', 'deleteBackup');
        n1.should.have.property('backupId', 'backup-123');
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it('should delete a backup with backupId from node configuration', function (done) {
    const backupId = 'backup-123';

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
        operation: 'deleteBackup',
        backupId: backupId,
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset deleteBackup stub to return specific data
    mockClient.admin.deleteBackup = sinon.stub().resolves({
      success: true,
      message: 'Backup deleted successfully',
    });

    helper.load([rewiredAdminNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'deleteBackup');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('success', true);
          msg.payload.data.should.have.property('message', 'Backup deleted successfully');

          // Verify the stub was called with the correct parameters
          sinon.assert.calledOnce(mockClient.admin.deleteBackup);
          sinon.assert.calledWith(mockClient.admin.deleteBackup, backupId);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node
      n1.receive({});
    });
  });

  it('should delete a backup with backupId from msg.payload', function (done) {
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
        operation: 'deleteBackup',
        // No backupId set in the node config
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    const backupId = 'backup-456';

    // Reset deleteBackup stub to return specific data
    mockClient.admin.deleteBackup = sinon.stub().resolves({
      success: true,
      message: 'Backup deleted successfully',
    });

    helper.load([rewiredAdminNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'deleteBackup');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('success', true);
          msg.payload.data.should.have.property('message', 'Backup deleted successfully');

          // Verify the stub was called with the correct parameters
          sinon.assert.calledOnce(mockClient.admin.deleteBackup);
          sinon.assert.calledWith(mockClient.admin.deleteBackup, backupId);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node with backupId in the payload
      n1.receive({
        payload: {
          backupId: backupId,
        },
      });
    });
  });

  it('should fail if no backup ID is provided', function (done) {
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
        operation: 'deleteBackup',
        // No backupId provided
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
          msg.payload.should.have.property('operation', 'deleteBackup');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property(
            'message',
            'No backup ID provided for deleteBackup operation. Specify in node config or msg.payload.backupId',
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
    const backupId = 'backup-999';

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
        operation: 'deleteBackup',
        backupId: backupId,
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Make the deleteBackup stub throw an error
    mockClient.admin.deleteBackup = sinon.stub().rejects(new Error('API Error: Backup not found'));

    helper.load([rewiredAdminNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', false);
          msg.payload.should.have.property('operation', 'deleteBackup');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property('message', 'API Error: Backup not found');

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
