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

describe('mealie-recipe Node with get operation', function () {
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
        name: 'Test Recipe Get',
        server: 'server1',
        operation: 'get',
        slug: 'test-recipe',
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
        n1.should.have.property('name', 'Test Recipe Get');
        n1.should.have.property('operation', 'get');
        n1.should.have.property('slug', 'test-recipe');
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it('should retrieve a recipe by slug from node config', function (done) {
    const flow = [
      {
        id: 'server1',
        type: 'mealie-server-config',
        name: 'Test Server',
      },
      {
        id: 'n1',
        type: 'mealie-recipe',
        name: 'Test Recipe Node',
        server: 'server1',
        operation: 'get',
        slug: 'test-recipe',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset recipe getter stub to return specific data
    mockClient.recipes.getRecipe.reset();
    mockClient.recipes.getRecipe.resolves({
      id: '123',
      name: 'Test Recipe',
      slug: 'test-recipe',
      description: 'A test recipe',
    });

    helper.load([rewiredRecipeNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'get');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('name', 'Test Recipe');

          // Verify the stub was called with the right arguments
          sinon.assert.calledWith(mockClient.recipes.getRecipe, 'test-recipe');

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node
      n1.receive({});
    });
  });

  it('should retrieve a recipe by slug from msg.payload', function (done) {
    const flow = [
      {
        id: 'server1',
        type: 'mealie-server-config',
        name: 'Test Server',
      },
      {
        id: 'n1',
        type: 'mealie-recipe',
        name: 'Test Recipe Node',
        server: 'server1',
        operation: 'get',
        slug: 'test-recipe',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    helper.load([rewiredRecipeNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      // Reset the stub
      mockClient.recipes.getRecipe.reset();
      mockClient.recipes.getRecipe.resolves({
        id: '456',
        name: 'Another Recipe',
        slug: 'another-recipe',
        description: 'Another test recipe',
      });

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'get');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('name', 'Another Recipe');

          // Verify the stub was called with the right arguments
          sinon.assert.calledWith(mockClient.recipes.getRecipe, 'another-recipe');

          done();
        } catch (err) {
          done(err);
        }
      });

      n1.receive({ payload: { slug: 'another-recipe' } });
    });
  });

  it('should throw an error when no slug is provided for get operation', function (done) {
    const flow = [
      {
        id: 'n1',
        type: 'mealie-recipe',
        name: 'Test Recipe Node',
        server: 'server1',
        operation: 'get',
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
            'No recipe slug provided for get operation. Specify in node config or msg.payload.slug',
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
