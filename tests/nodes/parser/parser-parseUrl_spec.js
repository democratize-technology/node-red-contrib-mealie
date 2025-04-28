require('should');

const helper = require('node-red-node-test-helper');
const configNode = require('../../../nodes/config/mealie-server-config');
const sinon = require('sinon');
const { mockClient } = require('../../_fixtures/mock-client');
const proxyquire = require('proxyquire').noCallThru();

// The parser node requires these modules
const rewiredParserNode = proxyquire('../../../nodes/parser/mealie-parser', {
  '../../lib/client-wrapper': {
    executeWithClient: async (config, operation) => {
      // Directly execute the operation with our mock client
      return operation(mockClient);
    },
  },
});

// Explicitly register node types
helper.init(require.resolve('node-red'));

describe('mealie-parser Node with parseUrl operation', function () {
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
        type: 'mealie-parser',
        name: 'Test Parser ParseUrl',
        server: 'server1',
        operation: 'parseUrl',
        url: 'https://example.com/recipe'
      },
      {
        id: 'server1',
        type: 'mealie-server-config',
        name: 'Test Server',
      },
    ];

    helper.load([rewiredParserNode, configNode], flow, function () {
      try {
        const n1 = helper.getNode('n1');
        n1.should.have.property('name', 'Test Parser ParseUrl');
        n1.should.have.property('operation', 'parseUrl');
        n1.should.have.property('url', 'https://example.com/recipe');
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it('should parse a recipe URL when URL is provided in node config', function (done) {
    const flow = [
      {
        id: 'server1',
        type: 'mealie-server-config',
        name: 'Test Server',
      },
      {
        id: 'n1',
        type: 'mealie-parser',
        name: 'Test Parser Node',
        server: 'server1',
        operation: 'parseUrl',
        url: 'https://example.com/recipe',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset stub
    mockClient.parser.parseUrl = sinon.stub().resolves({
      recipe: {
        name: 'Chocolate Cake',
        description: 'Delicious chocolate cake',
        ingredients: [
          '2 cups flour',
          '1 cup sugar',
          '3/4 cup cocoa powder'
        ],
        instructions: 'Mix dry ingredients...'
      }
    });

    helper.load([rewiredParserNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'parseUrl');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('recipe');
          msg.payload.data.recipe.should.have.property('name', 'Chocolate Cake');
          msg.payload.data.recipe.should.have.property('ingredients');
          
          // Verify the stub was called with the right argument
          sinon.assert.calledOnce(mockClient.parser.parseUrl);
          sinon.assert.calledWith(mockClient.parser.parseUrl, 'https://example.com/recipe');

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node
      n1.receive({});
    });
  });

  it('should parse a recipe URL when URL is provided in msg.payload', function (done) {
    const flow = [
      {
        id: 'server1',
        type: 'mealie-server-config',
        name: 'Test Server',
      },
      {
        id: 'n1',
        type: 'mealie-parser',
        name: 'Test Parser Node',
        server: 'server1',
        operation: 'parseUrl',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset stub
    mockClient.parser.parseUrl = sinon.stub().resolves({
      recipe: {
        name: 'Banana Bread',
        description: 'Easy banana bread recipe',
        ingredients: [
          '3 ripe bananas',
          '1/3 cup melted butter',
          '1 cup sugar'
        ],
        instructions: 'Preheat oven to 350°F...'
      }
    });

    helper.load([rewiredParserNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'parseUrl');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('recipe');
          msg.payload.data.recipe.should.have.property('name', 'Banana Bread');
          
          // Verify the stub was called with the right argument
          sinon.assert.calledOnce(mockClient.parser.parseUrl);
          sinon.assert.calledWith(mockClient.parser.parseUrl, 'https://example.com/banana-bread');

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node with URL in the payload
      n1.receive({ payload: { url: 'https://example.com/banana-bread' } });
    });
  });

  it('should throw an error when no URL is provided', function (done) {
    const flow = [
      {
        id: 'server1',
        type: 'mealie-server-config',
        name: 'Test Server',
      },
      {
        id: 'n1',
        type: 'mealie-parser',
        name: 'Test Parser Node',
        server: 'server1',
        operation: 'parseUrl',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    helper.load([rewiredParserNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', false);
          msg.payload.should.have.property('operation', 'parseUrl');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property(
            'message', 
            'No URL provided for parseUrl operation. Specify in node config or msg.payload.url'
          );

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node without a URL
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
        type: 'mealie-parser',
        name: 'Test Parser Node',
        server: 'server1',
        operation: 'parseUrl',
        url: 'https://invalid-url.com',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Make the parseUrl stub throw an error
    mockClient.parser.parseUrl = sinon.stub().rejects(new Error('Failed to parse URL'));

    helper.load([rewiredParserNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', false);
          msg.payload.should.have.property('operation', 'parseUrl');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property('message', 'Failed to parse URL');

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
