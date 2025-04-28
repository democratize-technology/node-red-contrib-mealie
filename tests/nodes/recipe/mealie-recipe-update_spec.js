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

describe('mealie-recipe Node with update operation', function () {
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
    const recipeData = {
      name: 'Updated Recipe',
      description: 'An updated recipe description',
    };

    const flow = [
      {
        id: 'n1',
        type: 'mealie-recipe',
        name: 'Test Recipe Node',
        server: 'server1',
        operation: 'update',
        slug: 'test-recipe',
        recipeData: JSON.stringify(recipeData),
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
      try {
        const n1 = helper.getNode('n1');
        n1.should.have.property('name', 'Test Recipe Node');
        n1.should.have.property('operation', 'update');
        n1.should.have.property('slug', 'test-recipe');
        n1.should.have.property('recipeData', JSON.stringify(recipeData));
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it('should update a recipe with data from node config', function (done) {
    const recipeData = {
      name: 'Updated Recipe',
      description: 'An updated recipe description',
    };

    const flow = [
      {
        id: 'n1',
        type: 'mealie-recipe',
        name: 'Test Recipe Node',
        server: 'server1',
        operation: 'update',
        slug: 'test-recipe',
        recipeData: JSON.stringify(recipeData),
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
      mockClient.recipes.updateRecipe.reset();
      mockClient.recipes.updateRecipe.resolves({
        id: '123',
        name: 'Updated Recipe',
        slug: 'test-recipe',
        description: 'An updated recipe description',
      });

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'update');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('name', 'Updated Recipe');

          // Verify the stub was called with the right arguments
          sinon.assert.calledWith(mockClient.recipes.updateRecipe, 'test-recipe', recipeData);

          done();
        } catch (err) {
          done(err);
        }
      });

      n1.receive({});
    });
  });

  it('should throw an error when no slug is provided for update operation', function (done) {
    const recipeData = {
      name: 'Updated Recipe',
      description: 'An updated recipe description',
    };

    const flow = [
      {
        id: 'n1',
        type: 'mealie-recipe',
        name: 'Test Recipe Node',
        server: 'server1',
        operation: 'update',
        recipeData: JSON.stringify(recipeData),
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

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', false);
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property(
            'message',
            'No recipe slug provided for update operation. Specify in node config or msg.payload.slug',
          );
          done();
        } catch (err) {
          done(err);
        }
      });

      n1.receive({});
    });
  });

  it('should throw an error when no recipe data is provided for update operation', function (done) {
    const flow = [
      {
        id: 'n1',
        type: 'mealie-recipe',
        name: 'Test Recipe Node',
        server: 'server1',
        operation: 'update',
        slug: 'test-recipe',
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

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', false);
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property(
            'message',
            'No recipe data provided for update operation. Specify in node config or msg.payload.recipeData',
          );
          done();
        } catch (err) {
          done(err);
        }
      });

      n1.receive({});
    });
  });
});
