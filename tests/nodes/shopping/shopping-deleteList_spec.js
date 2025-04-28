require('should');

const helper = require('node-red-node-test-helper');
const configNode = require('../../../nodes/config/mealie-server-config');
const sinon = require('sinon');
const { mockClient } = require('../../_fixtures/mock-client');
const proxyquire = require('proxyquire').noCallThru();

// The shopping node requires these modules
const rewiredShoppingNode = proxyquire('../../../nodes/shopping/mealie-shopping', {
  '../../lib/client-wrapper': {
    executeWithClient: async (config, operation) => {
      // Directly execute the operation with our mock client
      return operation(mockClient);
    },
  },
});

// Explicitly register node types
helper.init(require.resolve('node-red'));

describe('mealie-shopping Node with deleteList operation', function () {
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
        type: 'mealie-shopping',
        name: 'Test Shopping DeleteList',
        server: 'server1',
        operation: 'deleteList',
        shoppingListId: 'list-123',
      },
      {
        id: 'server1',
        type: 'mealie-server-config',
        name: 'Test Server',
      },
    ];

    helper.load([rewiredShoppingNode, configNode], flow, function () {
      try {
        const n1 = helper.getNode('n1');
        n1.should.have.property('name', 'Test Shopping DeleteList');
        n1.should.have.property('operation', 'deleteList');
        n1.should.have.property('shoppingListId', 'list-123');
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it('should delete a shopping list with shoppingListId from node configuration', function (done) {
    const shoppingListId = 'list-123';

    const flow = [
      {
        id: 'server1',
        type: 'mealie-server-config',
        name: 'Test Server',
      },
      {
        id: 'n1',
        type: 'mealie-shopping',
        name: 'Test Shopping Node',
        server: 'server1',
        operation: 'deleteList',
        shoppingListId: shoppingListId,
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset deleteShoppingList stub to return specific data
    mockClient.shoppingLists = {
      deleteShoppingList: sinon.stub().resolves({
        success: true,
        message: 'Shopping list deleted successfully',
      }),
    };

    helper.load([rewiredShoppingNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'deleteList');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('success', true);
          msg.payload.data.should.have.property('message', 'Shopping list deleted successfully');

          // Verify the stub was called with the correct parameters
          sinon.assert.calledOnce(mockClient.shoppingLists.deleteShoppingList);
          sinon.assert.calledWith(mockClient.shoppingLists.deleteShoppingList, shoppingListId);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node
      n1.receive({});
    });
  });

  it('should delete a shopping list with shoppingListId from msg.payload', function (done) {
    const flow = [
      {
        id: 'server1',
        type: 'mealie-server-config',
        name: 'Test Server',
      },
      {
        id: 'n1',
        type: 'mealie-shopping',
        name: 'Test Shopping Node',
        server: 'server1',
        operation: 'deleteList',
        // No shoppingListId set in the node config
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    const shoppingListId = 'list-456';

    // Reset deleteShoppingList stub to return specific data
    mockClient.shoppingLists.deleteShoppingList = sinon.stub().resolves({
      success: true,
      message: 'Shopping list deleted successfully',
    });

    helper.load([rewiredShoppingNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'deleteList');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('success', true);
          msg.payload.data.should.have.property('message', 'Shopping list deleted successfully');

          // Verify the stub was called with the correct parameters
          sinon.assert.calledOnce(mockClient.shoppingLists.deleteShoppingList);
          sinon.assert.calledWith(mockClient.shoppingLists.deleteShoppingList, shoppingListId);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node with shoppingListId in the payload
      n1.receive({
        payload: {
          shoppingListId: shoppingListId,
        },
      });
    });
  });

  it('should fail if no shopping list ID is provided', function (done) {
    const flow = [
      {
        id: 'server1',
        type: 'mealie-server-config',
        name: 'Test Server',
      },
      {
        id: 'n1',
        type: 'mealie-shopping',
        name: 'Test Shopping Node',
        server: 'server1',
        operation: 'deleteList',
        // No shoppingListId provided
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    helper.load([rewiredShoppingNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', false);
          msg.payload.should.have.property('operation', 'deleteList');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property(
            'message',
            'No shopping list ID provided for deleteList operation. Specify in node config or msg.payload.shoppingListId',
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
    const shoppingListId = 'list-999';

    const flow = [
      {
        id: 'server1',
        type: 'mealie-server-config',
        name: 'Test Server',
      },
      {
        id: 'n1',
        type: 'mealie-shopping',
        name: 'Test Shopping Node',
        server: 'server1',
        operation: 'deleteList',
        shoppingListId: shoppingListId,
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Make the deleteShoppingList stub throw an error
    mockClient.shoppingLists.deleteShoppingList = sinon.stub().rejects(new Error('API Error: Shopping list not found'));

    helper.load([rewiredShoppingNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', false);
          msg.payload.should.have.property('operation', 'deleteList');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property('message', 'API Error: Shopping list not found');

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
