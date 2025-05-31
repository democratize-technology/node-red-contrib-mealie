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
                name: 'Test Recipe Node',
                server: 'server1',
                operation: 'image',
                slug: 'recipe-with-image',
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
                n1.should.have.property('operation', 'image');
                n1.should.have.property('slug', 'recipe-with-image');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should get recipe image by slug', function (done) {
        const flow = [
            {
                id: 'n1',
                type: 'mealie-recipe',
                name: 'Test Recipe Node',
                server: 'server1',
                operation: 'image',
                slug: 'recipe-with-image',
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
            mockClient.recipes.getRecipeImage.reset();
            mockClient.recipes.getRecipeImage.resolves({
                url: 'https://example.com/image.jpg',
            });

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'image');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('url', 'https://example.com/image.jpg');

                    // Verify the stub was called with the right arguments
                    sinon.assert.calledWith(mockClient.recipes.getRecipeImage, 'recipe-with-image');

                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({});
        });
    });

    it('should upload recipe image with imageAction=upload', function (done) {
        const imageData = Buffer.from('fake-image-data');

        const flow = [
            {
                id: 'n1',
                type: 'mealie-recipe',
                name: 'Test Recipe Node',
                server: 'server1',
                operation: 'image',
                slug: 'recipe-to-update',
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
            mockClient.recipes.uploadRecipeImage = sinon.stub().resolves({
                success: true,
                url: 'https://example.com/new-image.jpg',
            });

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'image');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('success', true);
                    msg.payload.data.should.have.property('url', 'https://example.com/new-image.jpg');

                    // Verify the stub was called with the right arguments
                    sinon.assert.calledWith(mockClient.recipes.uploadRecipeImage, 'recipe-to-update', imageData);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({
                payload: {
                    imageAction: 'upload',
                    imageData,
                },
            });
        });
    });
});
