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

describe('mealie-admin Node with deleteGroup operation', function () {
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
        name: 'Test Admin DeleteGroup',
        server: 'server1',
        operation: 'deleteGroup',
        groupId: 'group-123',
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
        n1.should.have.property('name', 'Test Admin DeleteGroup');
        n1.should.have.property('operation', 'deleteGroup');
        n1.should.have.property('groupId', 'group-123');
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it('should delete a group with node configuration', function (done) {
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
        operation: 'deleteGroup',
        groupId: groupId,
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset deleteGroup stub to return specific data
    mockClient.admin.deleteGroup = sinon.stub().resolves({ success: true });

    helper.load([rewiredAdminNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'deleteGroup');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('success', true);

          // Verify the stub was called with the correct parameters
          sinon.assert.calledOnce(mockClient.admin.deleteGroup);
          sinon.assert.calledWith(mockClient.admin.deleteGroup, groupId);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node
      n1.receive({});
    });
  });

  it('should delete a group with parameters from msg.payload', function (done) {
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
        // No groupId set in the node config
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    const groupId = 'group-456';

    // Reset deleteGroup stub to return specific data
    mockClient.admin.deleteGroup = sinon.stub().resolves({ success: true });

    helper.load([rewiredAdminNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'deleteGroup');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('success', true);

          // Verify the stub was called with the correct parameters
          sinon.assert.calledOnce(mockClient.admin.deleteGroup);
          sinon.assert.calledWith(mockClient.admin.deleteGroup, groupId);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node with operation and groupId in the payload
      n1.receive({
        payload: {
          operation: 'deleteGroup',
          groupId: groupId,
        },
      });
    });
  });

  it('should fail if no group ID is provided', function (done) {
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
        operation: 'deleteGroup',
        // No groupId provided
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
          msg.payload.should.have.property('operation', 'deleteGroup');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property(
            'message',
            'No group ID provided for deleteGroup operation. Specify in node config or msg.payload.groupId',
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
        operation: 'deleteGroup',
        groupId: groupId,
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Make the deleteGroup stub throw an error
    mockClient.admin.deleteGroup = sinon.stub().rejects(new Error('API Error: Group not found'));

    helper.load([rewiredAdminNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', false);
          msg.payload.should.have.property('operation', 'deleteGroup');
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
