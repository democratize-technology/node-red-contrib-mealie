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

describe('mealie-admin Node with getUsers operation', function () {
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
        name: 'Test Admin GetUsers',
        server: 'server1',
        operation: 'getUsers',
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
        n1.should.have.property('name', 'Test Admin GetUsers');
        n1.should.have.property('operation', 'getUsers');
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it('should retrieve all users when no userId is provided', function (done) {
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
        operation: 'getUsers',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset stubs
    mockClient.admin.getAllUsers = sinon.stub().resolves([
      { id: 'user-123', name: 'User 1', email: 'user1@example.com' },
      { id: 'user-456', name: 'User 2', email: 'user2@example.com' },
    ]);
    mockClient.admin.getUser = sinon.stub().resolves({});

    helper.load([rewiredAdminNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'getUsers');
          msg.payload.should.have.property('data');
          msg.payload.data.should.be.an.Array();
          msg.payload.data.should.have.length(2);
          msg.payload.data[0].should.have.property('name', 'User 1');
          msg.payload.data[1].should.have.property('name', 'User 2');

          // Verify the correct stub was called
          sinon.assert.calledOnce(mockClient.admin.getAllUsers);
          sinon.assert.notCalled(mockClient.admin.getUser);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node
      n1.receive({});
    });
  });

  it('should retrieve a specific user when userId is provided in node config', function (done) {
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
        operation: 'getUsers',
        userId: 'user-123',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset stubs
    mockClient.admin.getAllUsers = sinon.stub().resolves([]);
    mockClient.admin.getUser = sinon.stub().resolves({ 
      id: 'user-123', 
      name: 'User 1', 
      email: 'user1@example.com' 
    });

    helper.load([rewiredAdminNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'getUsers');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('id', 'user-123');
          msg.payload.data.should.have.property('name', 'User 1');

          // Verify the correct stub was called with the right argument
          sinon.assert.notCalled(mockClient.admin.getAllUsers);
          sinon.assert.calledOnce(mockClient.admin.getUser);
          sinon.assert.calledWith(mockClient.admin.getUser, 'user-123');

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node
      n1.receive({});
    });
  });

  it('should retrieve a specific user when userId is provided in msg.payload', function (done) {
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
        operation: 'getUsers',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset stubs
    mockClient.admin.getAllUsers = sinon.stub().resolves([]);
    mockClient.admin.getUser = sinon.stub().resolves({ 
      id: 'user-456', 
      name: 'User 2', 
      email: 'user2@example.com' 
    });

    helper.load([rewiredAdminNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'getUsers');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('id', 'user-456');
          msg.payload.data.should.have.property('name', 'User 2');

          // Verify the correct stub was called with the right argument
          sinon.assert.notCalled(mockClient.admin.getAllUsers);
          sinon.assert.calledOnce(mockClient.admin.getUser);
          sinon.assert.calledWith(mockClient.admin.getUser, 'user-456');

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node with userId in the payload
      n1.receive({ payload: { userId: 'user-456' } });
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
        operation: 'getUsers',
        userId: 'user-999',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Make the getUser stub throw an error
    mockClient.admin.getUser = sinon.stub().rejects(new Error('User not found'));

    helper.load([rewiredAdminNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', false);
          msg.payload.should.have.property('operation', 'getUsers');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property('message', 'User not found');

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
