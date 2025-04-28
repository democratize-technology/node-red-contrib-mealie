require('should');

const helper = require('node-red-node-test-helper');
const configNode = require('../../../nodes/config/mealie-server-config');
const sinon = require('sinon');
const { mockClient } = require('../../_fixtures/mock-client');
const proxyquire = require('proxyquire').noCallThru();

// The bulk node requires these modules
const rewiredBulkNode = proxyquire('../../../nodes/bulk/mealie-bulk', {
  '../../lib/client-wrapper': {
    executeWithClient: async (config, operation) => {
      // Directly execute the operation with our mock client
      return operation(mockClient);
    },
  },
});

// Explicitly register node types
helper.init(require.resolve('node-red'));

describe('mealie-bulk Node with exportRecipes operation', function () {
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
        type: 'mealie-bulk',
        name: 'Test Bulk ExportRecipes',
        server: 'server1',
        operation: 'exportRecipes',
        recipeIds: '["recipe-123", "recipe-456"]'
      },
      {
        id: 'server1',
        type: 'mealie-server-config',
        name: 'Test Server',
      },
    ];

    helper.load([rewiredBulkNode, configNode], flow, function () {
      try {
        const n1 = helper.getNode('n1');
        n1.should.have.property('name', 'Test Bulk ExportRecipes');
        n1.should.have.property('operation', 'exportRecipes');
        n1.should.have.property('recipeIds', '["recipe-123", "recipe-456"]');
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it('should export recipes when recipeIds are provided in node config as a string', function (done) {
    const flow = [
      {
        id: 'server1',
        type: 'mealie-server-config',
        name: 'Test Server',
      },
      {
        id: 'n1',
        type: 'mealie-bulk',
        name: 'Test Bulk Node',
        server: 'server1',
        operation: 'exportRecipes',
        recipeIds: '["recipe-123", "recipe-456"]',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset stub
    mockClient.bulk.exportRecipes = sinon.stub().resolves({
      recipes: [
        { id: 'recipe-123', name: 'Chocolate Cake' },
        { id: 'recipe-456', name: 'Banana Bread' }
      ]
    });

    helper.load([rewiredBulkNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'exportRecipes');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('recipes');
          msg.payload.data.recipes.should.be.an.Array();
          msg.payload.data.recipes.should.have.length(2);
          
          // Verify the stub was called with the right arguments
          sinon.assert.calledOnce(mockClient.bulk.exportRecipes);
          sinon.assert.calledWith(mockClient.bulk.exportRecipes, ['recipe-123', 'recipe-456']);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node
      n1.receive({});
    });
  });

  it('should export recipes when recipeIds are provided as an array in msg.payload', function (done) {
    const flow = [
      {
        id: 'server1',
        type: 'mealie-server-config',
        name: 'Test Server',
      },
      {
        id: 'n1',
        type: 'mealie-bulk',
        name: 'Test Bulk Node',
        server: 'server1',
        operation: 'exportRecipes',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset stub
    mockClient.bulk.exportRecipes = sinon.stub().resolves({
      recipes: [
        { id: 'recipe-789', name: 'Apple Pie' },
        { id: 'recipe-101', name: 'Pancakes' }
      ]
    });

    helper.load([rewiredBulkNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'exportRecipes');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('recipes');
          msg.payload.data.recipes.should.be.an.Array();
          msg.payload.data.recipes.should.have.length(2);
          
          // Verify the stub was called with the right arguments
          sinon.assert.calledOnce(mockClient.bulk.exportRecipes);
          sinon.assert.calledWith(mockClient.bulk.exportRecipes, ['recipe-789', 'recipe-101']);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node with recipeIds in the payload
      n1.receive({ 
        payload: { 
          recipeIds: ['recipe-789', 'recipe-101'] 
        } 
      });
    });
  });

  it('should throw an error when no recipeIds are provided', function (done) {
    const flow = [
      {
        id: 'server1',
        type: 'mealie-server-config',
        name: 'Test Server',
      },
      {
        id: 'n1',
        type: 'mealie-bulk',
        name: 'Test Bulk Node',
        server: 'server1',
        operation: 'exportRecipes',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    helper.load([rewiredBulkNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', false);
          msg.payload.should.have.property('operation', 'exportRecipes');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property(
            'message', 
            'No recipe IDs provided for exportRecipes operation. Specify in node config or msg.payload.recipeIds'
          );

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node without recipeIds
      n1.receive({});
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
        type: 'mealie-bulk',
        name: 'Test Bulk Node',
        server: 'server1',
        operation: 'exportRecipes',
        recipeIds: '["recipe-999"]',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Make the exportRecipes stub throw an error
    mockClient.bulk.exportRecipes = sinon.stub().rejects(new Error('Failed to export recipes'));

    helper.load([rewiredBulkNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', false);
          msg.payload.should.have.property('operation', 'exportRecipes');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property('message', 'Failed to export recipes');

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
