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

describe('mealie-shopping Node with updateList operation', function () {
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
        name: 'Test Shopping UpdateList',
        server: 'server1',
        operation: 'updateList',
        shoppingListId: 'list-123',
        listData: '{"name":"Updated Shopping List"}',
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
        n1.should.have.property('name', 'Test Shopping UpdateList');
        n1.should.have.property('operation', 'updateList');
        n1.should.have.property('shoppingListId', 'list-123');
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it('should update a shopping list with shoppingListId and listData from node configuration', function (done) {
    const shoppingListId = 'list-123';
    const listData = {
      name: 'Updated Shopping List',
      notes: 'Updated notes for the shopping list',
    };

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
        operation: 'updateList',
        shoppingListId: shoppingListId,
        listData: JSON.stringify(listData),
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset updateShoppingList stub to return specific data
    mockClient.shoppingLists = {
      updateShoppingList: sinon.stub().resolves({
        id: shoppingListId,
        name: 'Updated Shopping List',
        notes: 'Updated notes for the shopping list',
        items: [
          { id: 'item-1', name: 'Milk', checked: false },
          { id: 'item-2', name: 'Bread', checked: false },
        ],
      }),
    };

    helper.load([rewiredShoppingNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'updateList');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('id', shoppingListId);
          msg.payload.data.should.have.property('name', 'Updated Shopping List');
          msg.payload.data.should.have.property('notes', 'Updated notes for the shopping list');
          msg.payload.data.should.have.property('items').which.is.an.Array().and.have.length(2);

          // Verify the stub was called with the correct parameters
          sinon.assert.calledOnce(mockClient.shoppingLists.updateShoppingList);
          sinon.assert.calledWith(mockClient.shoppingLists.updateShoppingList, shoppingListId, listData);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node
      n1.receive({});
    });
  });

  it('should update a shopping list with shoppingListId and listData from msg.payload', function (done) {
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
        operation: 'updateList',
        // No shoppingListId or listData set in the node config
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    const shoppingListId = 'list-456';
    const listData = {
      name: 'Renamed Grocery List',
      items: [
        { name: 'Eggs', checked: false },
        { name: 'Cheese', checked: false },
      ],
    };

    // Reset updateShoppingList stub to return specific data
    mockClient.shoppingLists.updateShoppingList = sinon.stub().resolves({
      id: shoppingListId,
      name: 'Renamed Grocery List',
      items: [
        { id: 'item-3', name: 'Eggs', checked: false },
        { id: 'item-4', name: 'Cheese', checked: false },
      ],
    });

    helper.load([rewiredShoppingNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'updateList');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('id', shoppingListId);
          msg.payload.data.should.have.property('name', 'Renamed Grocery List');
          msg.payload.data.should.have.property('items').which.is.an.Array().and.have.length(2);

          // Verify the stub was called with the correct parameters
          sinon.assert.calledOnce(mockClient.shoppingLists.updateShoppingList);
          sinon.assert.calledWith(mockClient.shoppingLists.updateShoppingList, shoppingListId, listData);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node with shoppingListId and listData in the payload
      n1.receive({
        payload: {
          shoppingListId: shoppingListId,
          listData: listData,
        },
      });
    });
  });

  it('should fail if no shopping list ID is provided', function (done) {
    const listData = {
      name: 'Updated Shopping List',
    };

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
        operation: 'updateList',
        // No shoppingListId provided
        listData: JSON.stringify(listData),
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
          msg.payload.should.have.property('operation', 'updateList');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property(
            'message',
            'No shopping list ID provided for updateList operation. Specify in node config or msg.payload.shoppingListId',
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

  it('should fail if no list data is provided', function (done) {
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
        operation: 'updateList',
        shoppingListId: 'list-123',
        // No listData provided
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
          msg.payload.should.have.property('operation', 'updateList');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property(
            'message',
            'No list data provided for updateList operation. Specify in node config or msg.payload.listData',
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
    const listData = {
      name: 'Invalid List',
    };

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
        operation: 'updateList',
        shoppingListId: shoppingListId,
        listData: JSON.stringify(listData),
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Make the updateShoppingList stub throw an error
    mockClient.shoppingLists.updateShoppingList = sinon.stub().rejects(new Error('API Error: Shopping list not found'));

    helper.load([rewiredShoppingNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', false);
          msg.payload.should.have.property('operation', 'updateList');
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
