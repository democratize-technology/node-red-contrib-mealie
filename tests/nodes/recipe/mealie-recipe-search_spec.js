require('should');

const helper = require('node-red-node-test-helper');
const configNode = require('../../../nodes/config/mealie-server-config');
const sinon = require('sinon');
const { mockClient } = require('../../_fixtures/mock-client');
const proxyquire = require('proxyquire').noCallThru();

// The recipe node requires these modules
const rewiredRecipeNode = proxyquire('../../../nodes/recipe/mealie-recipe', {
  '../../lib/client-wrapper': {
    executeWithClient: async (config, operation) => {
      // Directly execute the operation with our mock client
      return operation(mockClient);
    },
  },
});

// Explicitly register node types
helper.init(require.resolve('node-red'));

describe('mealie-recipe Node with search operation', function () {
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
        type: 'mealie-recipe',
        name: 'Test Recipe Search',
        operation: 'search',
        server: 'server1',
      },
      {
        id: 'server1',
        type: 'mealie-server-config',
        name: 'Test Server',
      },
    ];

    helper.load([rewiredRecipeNode, configNode], flow, function () {
      try {
        const n1 = helper.getNode('n1');
        n1.should.have.property('operation', 'search');
        n1.should.have.property('name', 'Test Recipe Search');
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it('should search for recipes with default parameters', function (done) {
    const flow = [
      {
        id: 'n1',
        type: 'mealie-recipe',
        name: 'Test Recipe Node',
        server: 'server1',
        operation: 'search',
        wires: [['n2']],
      },
      {
        id: 'server1',
        type: 'mealie-server-config',
        name: 'Test Server',
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset the stub
    mockClient.recipes.getAllRecipes.reset();
    mockClient.recipes.getAllRecipes.resolves([
      { id: '123', name: 'Recipe 1', slug: 'recipe-1' },
      { id: '456', name: 'Recipe 2', slug: 'recipe-2' },
    ]);

    helper.load([rewiredRecipeNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'search');
          msg.payload.should.have.property('data');
          msg.payload.data.should.be.an.Array();
          msg.payload.data.should.have.length(2);
          msg.payload.data[0].should.have.property('name', 'Recipe 1');

          // Verify the stub was called with the right arguments
          sinon.assert.calledWith(mockClient.recipes.getAllRecipes, {});

          done();
        } catch (err) {
          done(err);
        }
      });

      n1.receive({});
    });
  });

  it('should search for recipes with custom parameters', function (done) {
    const flow = [
      {
        id: 'n1',
        type: 'mealie-recipe',
        name: 'Test Recipe Node',
        server: 'server1',
        operation: 'search',
        wires: [['n2']],
      },
      {
        id: 'server1',
        type: 'mealie-server-config',
        name: 'Test Server',
      },
      { id: 'n2', type: 'helper' },
    ];

    helper.load([rewiredRecipeNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      // Reset the stub
      mockClient.recipes.getAllRecipes.reset();
      mockClient.recipes.getAllRecipes.resolves([{ id: '789', name: 'Filtered Recipe', slug: 'filtered-recipe' }]);

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'search');
          msg.payload.should.have.property('data');
          msg.payload.data.should.be.an.Array();
          msg.payload.data.should.have.length(1);
          msg.payload.data[0].should.have.property('name', 'Filtered Recipe');

          // Verify the stub was called with the right arguments
          sinon.assert.calledWith(mockClient.recipes.getAllRecipes, {
            queryFilter: 'chicken',
            paginationLimit: 5,
          });

          done();
        } catch (err) {
          done(err);
        }
      });

      n1.receive({
        payload: {
          params: {
            queryFilter: 'chicken',
            paginationLimit: 5,
          },
        },
      });
    });
  });
});
