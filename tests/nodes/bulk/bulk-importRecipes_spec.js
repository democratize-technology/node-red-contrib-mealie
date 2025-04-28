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

describe('mealie-bulk Node with importRecipes operation', function () {
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
        name: 'Test Bulk ImportRecipes',
        server: 'server1',
        operation: 'importRecipes',
        urls: '["https://example.com/recipe1", "https://example.com/recipe2"]'
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
        n1.should.have.property('name', 'Test Bulk ImportRecipes');
        n1.should.have.property('operation', 'importRecipes');
        n1.should.have.property('urls', '["https://example.com/recipe1", "https://example.com/recipe2"]');
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it('should import recipes from URLs when they are provided in node config as a string', function (done) {
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
        operation: 'importRecipes',
        urls: '["https://example.com/recipe1", "https://example.com/recipe2"]',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Set up mock for bulk operations
    mockClient.bulk = {
      importRecipesFromUrls: sinon.stub().resolves({
        imported: 2,
        failed: 0,
        successful_imports: [
          { id: 'recipe-123', name: 'Recipe 1', url: 'https://example.com/recipe1' },
          { id: 'recipe-456', name: 'Recipe 2', url: 'https://example.com/recipe2' }
        ]
      })
    };

    helper.load([rewiredBulkNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'importRecipes');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('imported', 2);
          msg.payload.data.should.have.property('failed', 0);
          msg.payload.data.should.have.property('successful_imports');
          msg.payload.data.successful_imports.should.be.an.Array();
          msg.payload.data.successful_imports.should.have.length(2);
          
          // Verify the stub was called with the right arguments
          sinon.assert.calledOnce(mockClient.bulk.importRecipesFromUrls);
          sinon.assert.calledWith(mockClient.bulk.importRecipesFromUrls, 
            ['https://example.com/recipe1', 'https://example.com/recipe2']);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node
      n1.receive({});
    });
  });

  it('should import recipes from URLs when they are provided as an array in msg.payload', function (done) {
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
        operation: 'importRecipes',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset stub
    mockClient.bulk.importRecipesFromUrls = sinon.stub().resolves({
      imported: 2,
      failed: 0,
      successful_imports: [
        { id: 'recipe-789', name: 'Recipe 3', url: 'https://example.com/recipe3' },
        { id: 'recipe-101', name: 'Recipe 4', url: 'https://example.com/recipe4' }
      ]
    });

    helper.load([rewiredBulkNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'importRecipes');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('imported', 2);
          msg.payload.data.should.have.property('failed', 0);
          
          // Verify the stub was called with the right arguments
          sinon.assert.calledOnce(mockClient.bulk.importRecipesFromUrls);
          sinon.assert.calledWith(mockClient.bulk.importRecipesFromUrls, 
            ['https://example.com/recipe3', 'https://example.com/recipe4']);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node with URLs in the payload
      n1.receive({ 
        payload: { 
          urls: ['https://example.com/recipe3', 'https://example.com/recipe4'] 
        } 
      });
    });
  });

  it('should import recipes from import data when provided in msg.payload', function (done) {
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
        operation: 'importRecipes',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    const importData = {
      recipes: [
        { name: 'Recipe 5', description: 'Test recipe 5', ingredients: ['flour', 'sugar'] },
        { name: 'Recipe 6', description: 'Test recipe 6', ingredients: ['eggs', 'milk'] }
      ]
    };

    // Set up mock for import from data
    mockClient.bulk.importRecipes = sinon.stub().resolves({
      imported: 2,
      failed: 0,
      successful_imports: [
        { id: 'recipe-201', name: 'Recipe 5' },
        { id: 'recipe-202', name: 'Recipe 6' }
      ]
    });

    helper.load([rewiredBulkNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'importRecipes');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('imported', 2);
          msg.payload.data.should.have.property('failed', 0);
          
          // Verify the stub was called with the right arguments
          sinon.assert.calledOnce(mockClient.bulk.importRecipes);
          sinon.assert.calledWith(mockClient.bulk.importRecipes, importData);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node with import data in the payload
      n1.receive({ 
        payload: { 
          importData: importData
        } 
      });
    });
  });

  it('should throw an error when no URLs or import data are provided', function (done) {
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
        operation: 'importRecipes',
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
          msg.payload.should.have.property('operation', 'importRecipes');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property(
            'message', 
            'No URLs or import data provided for importRecipes operation. Specify URLs in node config or msg.payload.urls, or import data in msg.payload.importData'
          );

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node without URLs or import data
      n1.receive({});
    });
  });

  it('should handle errors gracefully when importing from URLs', function (done) {
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
        operation: 'importRecipes',
        urls: '["https://example.com/bad-recipe"]',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Make the importRecipesFromUrls stub throw an error
    mockClient.bulk.importRecipesFromUrls = sinon.stub().rejects(new Error('Failed to import recipes from URLs'));

    helper.load([rewiredBulkNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', false);
          msg.payload.should.have.property('operation', 'importRecipes');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property('message', 'Failed to import recipes from URLs');

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node
      n1.receive({});
    });
  });

  it('should handle errors gracefully when importing from data', function (done) {
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
        operation: 'importRecipes',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    const importData = {
      recipes: [
        { name: 'Invalid Recipe', description: 'Missing required fields' }
      ]
    };

    // Make the importRecipes stub throw an error
    mockClient.bulk.importRecipes = sinon.stub().rejects(new Error('Failed to import recipes: Invalid format'));

    helper.load([rewiredBulkNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', false);
          msg.payload.should.have.property('operation', 'importRecipes');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property('message', 'Failed to import recipes: Invalid format');

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node with invalid import data
      n1.receive({
        payload: {
          importData: importData
        }
      });
    });
  });
});
