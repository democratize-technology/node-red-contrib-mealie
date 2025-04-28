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

describe('mealie-admin Node with getInfo operation', function () {
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
        name: 'Test Admin GetInfo',
        server: 'server1',
        operation: 'getInfo',
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
        n1.should.have.property('name', 'Test Admin GetInfo');
        n1.should.have.property('operation', 'getInfo');
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it('should retrieve server information', function (done) {
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
        operation: 'getInfo',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset getServerInfo stub to return specific data
    mockClient.admin.getServerInfo.reset();
    mockClient.admin.getServerInfo.resolves({
      version: '1.0.0',
      production: true,
      demo: false,
      apiDocsUrl: 'http://example.com/docs',
    });

    helper.load([rewiredAdminNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'getInfo');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('version', '1.0.0');
          msg.payload.data.should.have.property('production', true);

          // Verify the stub was called
          sinon.assert.calledOnce(mockClient.admin.getServerInfo);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node
      n1.receive({});
    });
  });

  it('should retrieve server information when operation is specified in msg.payload', function (done) {
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

    // Reset getServerInfo stub to return specific data
    mockClient.admin.getServerInfo.reset();
    mockClient.admin.getServerInfo.resolves({
      version: '1.0.0',
      production: true,
      demo: false,
      apiDocsUrl: 'http://example.com/docs',
    });

    helper.load([rewiredAdminNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'getInfo');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('version', '1.0.0');

          // Verify the stub was called
          sinon.assert.calledOnce(mockClient.admin.getServerInfo);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node with operation in the payload
      n1.receive({ payload: { operation: 'getInfo' } });
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
        operation: 'getInfo',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Make the getServerInfo stub throw an error
    mockClient.admin.getServerInfo.reset();
    mockClient.admin.getServerInfo.rejects(new Error('API Error'));

    helper.load([rewiredAdminNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', false);
          msg.payload.should.have.property('operation', 'getInfo');
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
