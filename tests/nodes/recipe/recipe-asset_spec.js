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

describe('mealie-recipe Node with asset operation', function () {
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
        name: 'Test Recipe Asset',
        server: 'server1',
        operation: 'asset',
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
        n1.should.have.property('name', 'Test Recipe Asset');
        n1.should.have.property('operation', 'asset');
        n1.should.have.property('slug', 'test-recipe');
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it('should list recipe assets with slug from node configuration', function (done) {
    const slug = 'test-recipe';

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
        operation: 'asset',
        slug: slug,
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset getRecipeAssets stub to return specific data
    mockClient.recipes = {
      getRecipeAssets: sinon.stub().resolves([
        { id: 'asset-123', name: 'instructions.pdf', fileName: 'instructions.pdf', contentType: 'application/pdf' },
        { id: 'asset-456', name: 'notes.txt', fileName: 'notes.txt', contentType: 'text/plain' },
      ]),
      getRecipeAsset: sinon.stub().resolves({}),
      uploadRecipeAsset: sinon.stub().resolves({}),
      deleteRecipeAsset: sinon.stub().resolves({}),
    };

    helper.load([rewiredRecipeNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'asset');
          msg.payload.should.have.property('data');
          msg.payload.data.should.be.an.Array();
          msg.payload.data.should.have.length(2);
          msg.payload.data[0].should.have.property('id', 'asset-123');
          msg.payload.data[0].should.have.property('name', 'instructions.pdf');
          msg.payload.data[1].should.have.property('id', 'asset-456');
          msg.payload.data[1].should.have.property('name', 'notes.txt');

          // Verify the stub was called with the correct parameters
          sinon.assert.calledOnce(mockClient.recipes.getRecipeAssets);
          sinon.assert.calledWith(mockClient.recipes.getRecipeAssets, slug);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node with default assetAction (list)
      n1.receive({});
    });
  });

  it('should list recipe assets with slug from msg.payload', function (done) {
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
        operation: 'asset',
        // No slug set in the node config
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    const slug = 'another-recipe';

    // Reset getRecipeAssets stub to return specific data
    mockClient.recipes.getRecipeAssets = sinon
      .stub()
      .resolves([{ id: 'asset-789', name: 'video.mp4', fileName: 'video.mp4', contentType: 'video/mp4' }]);

    helper.load([rewiredRecipeNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'asset');
          msg.payload.should.have.property('data');
          msg.payload.data.should.be.an.Array();
          msg.payload.data.should.have.length(1);
          msg.payload.data[0].should.have.property('id', 'asset-789');
          msg.payload.data[0].should.have.property('name', 'video.mp4');

          // Verify the stub was called with the correct parameters
          sinon.assert.calledOnce(mockClient.recipes.getRecipeAssets);
          sinon.assert.calledWith(mockClient.recipes.getRecipeAssets, slug);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node with slug in the payload
      n1.receive({
        payload: {
          slug: slug,
        },
      });
    });
  });

  it('should get a specific recipe asset', function (done) {
    const slug = 'test-recipe';
    const assetId = 'asset-123';

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
        operation: 'asset',
        slug: slug,
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset getRecipeAsset stub to return specific data
    mockClient.recipes.getRecipeAsset = sinon.stub().resolves({
      id: assetId,
      name: 'instructions.pdf',
      fileName: 'instructions.pdf',
      contentType: 'application/pdf',
      url: 'http://example.com/assets/instructions.pdf',
    });

    helper.load([rewiredRecipeNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'asset');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('id', assetId);
          msg.payload.data.should.have.property('name', 'instructions.pdf');
          msg.payload.data.should.have.property('url', 'http://example.com/assets/instructions.pdf');

          // Verify the stub was called with the correct parameters
          sinon.assert.calledOnce(mockClient.recipes.getRecipeAsset);
          sinon.assert.calledWith(mockClient.recipes.getRecipeAsset, slug, assetId);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node with assetAction and assetId in the payload
      n1.receive({
        payload: {
          assetAction: 'get',
          assetId: assetId,
        },
      });
    });
  });

  it('should upload a recipe asset', function (done) {
    const slug = 'test-recipe';
    const assetData = {
      name: 'new-notes.txt',
      file: Buffer.from('This is a test file content'),
      contentType: 'text/plain',
    };

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
        operation: 'asset',
        slug: slug,
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset uploadRecipeAsset stub to return specific data
    mockClient.recipes.uploadRecipeAsset = sinon.stub().resolves({
      id: 'asset-new',
      name: 'new-notes.txt',
      fileName: 'new-notes.txt',
      contentType: 'text/plain',
      url: 'http://example.com/assets/new-notes.txt',
    });

    helper.load([rewiredRecipeNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'asset');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('id', 'asset-new');
          msg.payload.data.should.have.property('name', 'new-notes.txt');
          msg.payload.data.should.have.property('contentType', 'text/plain');

          // Verify the stub was called with the correct parameters
          sinon.assert.calledOnce(mockClient.recipes.uploadRecipeAsset);
          sinon.assert.calledWith(mockClient.recipes.uploadRecipeAsset, slug, assetData);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node with assetAction and assetData in the payload
      n1.receive({
        payload: {
          assetAction: 'upload',
          assetData: assetData,
        },
      });
    });
  });

  it('should delete a recipe asset', function (done) {
    const slug = 'test-recipe';
    const assetId = 'asset-456';

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
        operation: 'asset',
        slug: slug,
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset deleteRecipeAsset stub to return specific data
    mockClient.recipes.deleteRecipeAsset = sinon.stub().resolves({
      success: true,
      message: 'Asset deleted successfully',
    });

    helper.load([rewiredRecipeNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'asset');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('success', true);
          msg.payload.data.should.have.property('message', 'Asset deleted successfully');

          // Verify the stub was called with the correct parameters
          sinon.assert.calledOnce(mockClient.recipes.deleteRecipeAsset);
          sinon.assert.calledWith(mockClient.recipes.deleteRecipeAsset, slug, assetId);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node with assetAction and assetId in the payload
      n1.receive({
        payload: {
          assetAction: 'delete',
          assetId: assetId,
        },
      });
    });
  });

  it('should fail if no recipe slug is provided', function (done) {
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
        operation: 'asset',
        // No slug provided
        wires: [['n2']],
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
          msg.payload.should.have.property('operation', 'asset');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property(
            'message',
            'No recipe slug provided for asset operation. Specify in node config or msg.payload.slug',
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

  it('should fail if no asset ID is provided for get asset action', function (done) {
    const slug = 'test-recipe';

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
        operation: 'asset',
        slug: slug,
        wires: [['n2']],
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
          msg.payload.should.have.property('operation', 'asset');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property('message', 'No asset ID provided for get asset action');
          msg.payload.error.should.have.property('code', 'VALIDATION_ERROR');

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node with assetAction but no assetId
      n1.receive({
        payload: {
          assetAction: 'get',
        },
      });
    });
  });

  it('should fail if no asset data is provided for upload asset action', function (done) {
    const slug = 'test-recipe';

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
        operation: 'asset',
        slug: slug,
        wires: [['n2']],
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
          msg.payload.should.have.property('operation', 'asset');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property('message', 'No asset data provided for upload asset action');
          msg.payload.error.should.have.property('code', 'VALIDATION_ERROR');

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node with assetAction but no assetData
      n1.receive({
        payload: {
          assetAction: 'upload',
        },
      });
    });
  });

  it('should handle API errors gracefully', function (done) {
    const slug = 'test-recipe';

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
        operation: 'asset',
        slug: slug,
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Make the getRecipeAssets stub throw an error
    mockClient.recipes.getRecipeAssets = sinon.stub().rejects(new Error('API Error: Recipe not found'));

    helper.load([rewiredRecipeNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', false);
          msg.payload.should.have.property('operation', 'asset');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property('message', 'API Error: Recipe not found');

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
