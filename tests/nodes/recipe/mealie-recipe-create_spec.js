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
    const recipeData = {
      name: 'New Recipe',
      description: 'A brand new recipe',
      recipeYield: '4 servings',
    };

    const flow = [
      {
        id: 'n1',
        type: 'mealie-recipe',
        name: 'Test Recipe Node',
        server: 'server1',
        operation: 'create',
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
        n1.should.have.property('operation', 'create');
        n1.should.have.property('name', 'Test Recipe Node');
        n1.should.have.property('recipeData', JSON.stringify(recipeData));
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it('should create a new recipe with data from node config', function (done) {
    const recipeData = {
      name: 'New Recipe',
      description: 'A brand new recipe',
      recipeYield: '4 servings',
    };

    const flow = [
      {
        id: 'n1',
        type: 'mealie-recipe',
        name: 'Test Recipe Node',
        server: 'server1',
        operation: 'create',
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
      mockClient.recipes.createRecipe.reset();
      mockClient.recipes.createRecipe.resolves({
        id: 'new-123',
        name: 'New Recipe',
        slug: 'new-recipe',
        description: 'A brand new recipe',
      });

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'create');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('name', 'New Recipe');
          msg.payload.data.should.have.property('slug', 'new-recipe');

          // Verify the stub was called with the right arguments
          sinon.assert.calledWith(mockClient.recipes.createRecipe, recipeData);

          done();
        } catch (err) {
          done(err);
        }
      });

      n1.receive({});
    });
  });

  it('should create a new recipe with data from msg.payload', function (done) {
    const recipeData = {
      name: 'Payload Recipe',
      description: 'A recipe from payload',
      recipeYield: '2 servings',
    };

    const flow = [
      {
        id: 'n1',
        type: 'mealie-recipe',
        name: 'Test Recipe Node',
        server: 'server1',
        operation: 'create',
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
      mockClient.recipes.createRecipe.reset();
      mockClient.recipes.createRecipe.resolves({
        id: 'payload-123',
        name: 'Payload Recipe',
        slug: 'payload-recipe',
        description: 'A recipe from payload',
      });

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'create');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('name', 'Payload Recipe');
          msg.payload.data.should.have.property('slug', 'payload-recipe');

          // Verify the stub was called with the right arguments
          sinon.assert.calledWith(mockClient.recipes.createRecipe, recipeData);

          done();
        } catch (err) {
          done(err);
        }
      });

      n1.receive({
        payload: {
          recipeData: recipeData,
        },
      });
    });
  });

  it('should throw an error when no recipe data is provided for create operation', function (done) {
    const flow = [
      {
        id: 'n1',
        type: 'mealie-recipe',
        name: 'Test Recipe Node',
        server: 'server1',
        operation: 'create',
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
            'No recipe data provided for create operation. Specify in node config or msg.payload.recipeData',
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
