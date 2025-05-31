require('should');

const helper = require('node-red-node-test-helper');
const configNode = require('../../../nodes/config/mealie-server-config');
const sinon = require('sinon');
const { mockClient } = require('../../_fixtures/mock-client');
const proxyquire = require('proxyquire').noCallThru();

// The utility node requires these modules
const rewiredUtilityNode = proxyquire('../../../nodes/utility/mealie-utility', {
    '../../lib/client-wrapper': {
        executeWithClient: async (config, operation) => {
            // Directly execute the operation with our mock client
            return operation(mockClient);
        },
    },
});

// Explicitly register node types
helper.init(require.resolve('node-red'));

describe('mealie-utility Node with getSchema operation', function () {
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
                type: 'mealie-utility',
                name: 'Test Utility GetSchema',
                server: 'server1',
                operation: 'getSchema',
            },
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
        ];

        helper.load([rewiredUtilityNode, configNode], flow, function () {
            try {
                const n1 = helper.getNode('n1');
                n1.should.have.property('name', 'Test Utility GetSchema');
                n1.should.have.property('operation', 'getSchema');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should retrieve API schema', function (done) {
        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-utility',
                name: 'Test Utility Node',
                server: 'server1',
                operation: 'getSchema',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset stub and define return value
        mockClient.utilities.getSchema.reset();
        mockClient.utilities.getSchema.resolves({
            components: {
                schemas: {
                    Recipe: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            description: { type: 'string' },
                        },
                    },
                },
            },
            paths: {
                '/recipes': {
                    get: { summary: 'Get all recipes' },
                    post: { summary: 'Create recipe' },
                },
            },
        });

        helper.load([rewiredUtilityNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'getSchema');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('components');
                    msg.payload.data.components.should.have.property('schemas');
                    msg.payload.data.should.have.property('paths');

                    // Verify the stub was called
                    sinon.assert.calledOnce(mockClient.utilities.getSchema);
                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should retrieve API schema when operation is specified in msg.payload', function (done) {
        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-utility',
                name: 'Test Utility Node',
                server: 'server1',
                // No operation set in the node config
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset stub and define return value
        mockClient.utilities.getSchema.reset();
        mockClient.utilities.getSchema.resolves({
            components: {
                schemas: {
                    Recipe: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            description: { type: 'string' },
                        },
                    },
                },
            },
        });

        helper.load([rewiredUtilityNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'getSchema');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('components');

                    // Verify the stub was called
                    sinon.assert.calledOnce(mockClient.utilities.getSchema);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node with operation in the payload
            n1.receive({ payload: { operation: 'getSchema' } });
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
                type: 'mealie-utility',
                name: 'Test Utility Node',
                server: 'server1',
                operation: 'getSchema',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Make the getSchema stub throw an error
        mockClient.utilities.getSchema.reset();
        mockClient.utilities.getSchema.rejects(new Error('Failed to fetch schema'));

        helper.load([rewiredUtilityNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'getSchema');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property('message', 'Failed to fetch schema');

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
