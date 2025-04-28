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

describe('mealie-admin Node with createUser operation', function () {
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
        name: 'Test Admin CreateUser',
        server: 'server1',
        operation: 'createUser',
        userData: '{"username":"testuser","email":"test@example.com","password":"password123"}',
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
        n1.should.have.property('name', 'Test Admin CreateUser');
        n1.should.have.property('operation', 'createUser');
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it('should create a user with node configuration', function (done) {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
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
        operation: 'createUser',
        userData: JSON.stringify(userData),
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset createUser stub to return specific data
    mockClient.admin.createUser.reset();
    mockClient.admin.createUser.resolves({
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
    });

    helper.load([rewiredAdminNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'createUser');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('id', 'user-123');
          msg.payload.data.should.have.property('username', 'testuser');
          msg.payload.data.should.have.property('email', 'test@example.com');

          // Verify the stub was called with the correct parameters
          sinon.assert.calledOnce(mockClient.admin.createUser);
          sinon.assert.calledWith(mockClient.admin.createUser, userData);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node
      n1.receive({});
    });
  });

  it('should create a user with parameters from msg.payload', function (done) {
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
        // No userData set in the node config
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    const userData = {
      username: 'payloaduser',
      email: 'payload@example.com',
      password: 'payloadpass',
      fullName: 'Payload User',
    };

    // Reset createUser stub to return specific data
    mockClient.admin.createUser.reset();
    mockClient.admin.createUser.resolves({
      id: 'user-456',
      username: 'payloaduser',
      email: 'payload@example.com',
      fullName: 'Payload User',
    });

    helper.load([rewiredAdminNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'createUser');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('id', 'user-456');
          msg.payload.data.should.have.property('username', 'payloaduser');
          msg.payload.data.should.have.property('email', 'payload@example.com');
          msg.payload.data.should.have.property('fullName', 'Payload User');

          // Verify the stub was called with the correct parameters
          sinon.assert.calledOnce(mockClient.admin.createUser);
          sinon.assert.calledWith(mockClient.admin.createUser, userData);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node with operation and userData in the payload
      n1.receive({
        payload: {
          operation: 'createUser',
          userData: userData,
        },
      });
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
        operation: 'createUser',
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
          msg.payload.should.have.property('operation', 'createUser');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property(
            'message',
            'No user data provided for createUser operation. Specify in node config or msg.payload.userData',
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
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
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
        operation: 'createUser',
        userData: JSON.stringify(userData),
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Make the createUser stub throw an error
    mockClient.admin.createUser.reset();
    mockClient.admin.createUser.rejects(new Error('API Error: Username already exists'));

    helper.load([rewiredAdminNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', false);
          msg.payload.should.have.property('operation', 'createUser');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property('message', 'API Error: Username already exists');

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
