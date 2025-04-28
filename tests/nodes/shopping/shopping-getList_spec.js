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

describe('mealie-shopping Node with getList operation', function () {
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
        name: 'Test Shopping GetList',
        server: 'server1',
        operation: 'getList',
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
        n1.should.have.property('name', 'Test Shopping GetList');
        n1.should.have.property('operation', 'getList');
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it('should retrieve all shopping lists when no shoppingListId is provided', function (done) {
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
        operation: 'getList',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset stubs
    mockClient.shoppingLists = {
      getAllShoppingLists: sinon.stub().resolves([
        { id: 'list-123', name: 'Grocery List' },
        { id: 'list-456', name: 'Weekly Shopping' },
      ]),
      getShoppingList: sinon.stub().resolves({})
    };

    helper.load([rewiredShoppingNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'getList');
          msg.payload.should.have.property('data');
          msg.payload.data.should.be.an.Array();
          msg.payload.data.should.have.length(2);
          msg.payload.data[0].should.have.property('name', 'Grocery List');
          msg.payload.data[1].should.have.property('name', 'Weekly Shopping');

          // Verify the correct stub was called
          sinon.assert.calledOnce(mockClient.shoppingLists.getAllShoppingLists);
          sinon.assert.notCalled(mockClient.shoppingLists.getShoppingList);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node
      n1.receive({});
    });
  });

  it('should retrieve a specific shopping list when shoppingListId is provided in node config', function (done) {
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
        operation: 'getList',
        shoppingListId: 'list-123',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset stubs
    mockClient.shoppingLists.getAllShoppingLists = sinon.stub().resolves([]);
    mockClient.shoppingLists.getShoppingList = sinon.stub().resolves({ 
      id: 'list-123', 
      name: 'Grocery List',
      items: [
        { id: 'item-1', name: 'Milk', checked: false },
        { id: 'item-2', name: 'Bread', checked: false }
      ]
    });

    helper.load([rewiredShoppingNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'getList');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('id', 'list-123');
          msg.payload.data.should.have.property('name', 'Grocery List');
          msg.payload.data.should.have.property('items');
          msg.payload.data.items.should.have.length(2);

          // Verify the correct stub was called with the right argument
          sinon.assert.notCalled(mockClient.shoppingLists.getAllShoppingLists);
          sinon.assert.calledOnce(mockClient.shoppingLists.getShoppingList);
          sinon.assert.calledWith(mockClient.shoppingLists.getShoppingList, 'list-123');

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node
      n1.receive({});
    });
  });

  it('should retrieve a specific shopping list when shoppingListId is provided in msg.payload', function (done) {
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
        operation: 'getList',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset stubs
    mockClient.shoppingLists.getAllShoppingLists = sinon.stub().resolves([]);
    mockClient.shoppingLists.getShoppingList = sinon.stub().resolves({ 
      id: 'list-456', 
      name: 'Weekly Shopping',
      items: [
        { id: 'item-3', name: 'Eggs', checked: false }
      ]
    });

    helper.load([rewiredShoppingNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'getList');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('id', 'list-456');
          msg.payload.data.should.have.property('name', 'Weekly Shopping');
          msg.payload.data.should.have.property('items');
          msg.payload.data.items.should.have.length(1);

          // Verify the correct stub was called with the right argument
          sinon.assert.notCalled(mockClient.shoppingLists.getAllShoppingLists);
          sinon.assert.calledOnce(mockClient.shoppingLists.getShoppingList);
          sinon.assert.calledWith(mockClient.shoppingLists.getShoppingList, 'list-456');

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node with shoppingListId in the payload
      n1.receive({ payload: { shoppingListId: 'list-456' } });
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
        type: 'mealie-shopping',
        name: 'Test Shopping Node',
        server: 'server1',
        operation: 'getList',
        shoppingListId: 'list-999',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Make the getShoppingList stub throw an error
    mockClient.shoppingLists.getShoppingList = sinon.stub().rejects(new Error('Shopping list not found'));

    helper.load([rewiredShoppingNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', false);
          msg.payload.should.have.property('operation', 'getList');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property('message', 'Shopping list not found');

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
