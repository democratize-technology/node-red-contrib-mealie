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

describe('mealie-recipe Node with delete operation', function () {
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
                operation: 'delete',
                slug: 'recipe-to-delete',
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
                n1.should.have.property('operation', 'delete');
                n1.should.have.property('slug', 'recipe-to-delete');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should delete a recipe by slug', function (done) {
        const flow = [
            {
                id: 'n1',
                type: 'mealie-recipe',
                name: 'Test Recipe Node',
                server: 'server1',
                operation: 'delete',
                slug: 'recipe-to-delete',
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
            mockClient.recipes.deleteRecipe.reset();
            mockClient.recipes.deleteRecipe.resolves({ success: true });

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'delete');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('success', true);

                    // Verify the stub was called with the right arguments
                    sinon.assert.calledWith(mockClient.recipes.deleteRecipe, 'recipe-to-delete');

                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({});
        });
    });

    it('should throw an error when no slug is provided for delete operation', function (done) {
        const flow = [
            {
                id: 'n1',
                type: 'mealie-recipe',
                name: 'Test Recipe Node',
                server: 'server1',
                operation: 'delete',
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
                        'No recipe slug provided for delete operation. Specify in node config or msg.payload.slug',
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
