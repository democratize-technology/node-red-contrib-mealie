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
    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload();
        sinon.restore();
        helper.stopServer(done);
    });

    it('should be loaded with default settings', function (done) {
        const flow = [
            {
                id: 'n1',
                type: 'mealie-recipe',
                name: 'Test Recipe Node',
                server: 'server1',
                operation: 'get',
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
                n1.should.have.property('name', 'Test Recipe Node');
                n1.should.have.property('operation', 'get');
                done();
            } catch (err) {
                done(err);
            }
        });
    });
});
