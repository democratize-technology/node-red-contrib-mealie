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

describe('mealie-parser Node with parseText operation', function () {
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
                name: 'Test Parser ParseText',
                server: 'server1',
                operation: 'parseText',
                ingredientText: '2 cups flour, 1 tsp salt'
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
                n1.should.have.property('name', 'Test Parser ParseText');
                n1.should.have.property('operation', 'parseText');
                n1.should.have.property('ingredientText', '2 cups flour, 1 tsp salt');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should parse ingredient text when text is provided in node config', function (done) {
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
                operation: 'parseText',
                ingredientText: '2 cups flour\n1 tsp salt\n3 tbsp sugar',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Create mock for ingredient parsing
        mockClient.parser = {
            parseIngredientText: sinon.stub().resolves([
                { name: 'flour', amount: 2, unit: 'cups' },
                { name: 'salt', amount: 1, unit: 'tsp' },
                { name: 'sugar', amount: 3, unit: 'tbsp' }
            ])
        };

        helper.load([rewiredParserNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'parseText');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.be.an.Array().and.have.length(3);
                    msg.payload.data[0].should.have.property('name', 'flour');
                    msg.payload.data[0].should.have.property('amount', 2);
                    msg.payload.data[0].should.have.property('unit', 'cups');

                    // Verify the stub was called with the right argument
                    sinon.assert.calledOnce(mockClient.parser.parseIngredientText);
                    sinon.assert.calledWith(mockClient.parser.parseIngredientText, '2 cups flour\n1 tsp salt\n3 tbsp sugar');

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should parse ingredient text when text is provided in msg.payload', function (done) {
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
                operation: 'parseText',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset stub
        mockClient.parser.parseIngredientText = sinon.stub().resolves([
            { name: 'milk', amount: 1, unit: 'cup' },
            { name: 'butter', amount: 0.5, unit: 'cup' },
            { name: 'egg', amount: 2, unit: 'whole' }
        ]);

        helper.load([rewiredParserNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'parseText');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.be.an.Array().and.have.length(3);
                    msg.payload.data[0].should.have.property('name', 'milk');
                    msg.payload.data[1].should.have.property('name', 'butter');
                    msg.payload.data[1].should.have.property('amount', 0.5);
                    msg.payload.data[2].should.have.property('name', 'egg');

                    // Verify the stub was called with the right argument
                    sinon.assert.calledOnce(mockClient.parser.parseIngredientText);
                    sinon.assert.calledWith(mockClient.parser.parseIngredientText, '1 cup milk\n1/2 cup butter\n2 eggs');

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node with ingredient text in the payload
            n1.receive({ payload: { ingredientText: '1 cup milk\n1/2 cup butter\n2 eggs' } });
        });
    });

    it('should throw an error when no ingredient text is provided', function (done) {
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
                operation: 'parseText',
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
                    msg.payload.should.have.property('operation', 'parseText');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property(
                        'message',
                        'No ingredient text provided for parseText operation. Specify in node config or msg.payload.ingredientText'
                    );

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node without ingredient text
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
                operation: 'parseText',
                ingredientText: 'invalid ingredient format',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Make the parseIngredientText stub throw an error
        mockClient.parser.parseIngredientText = sinon.stub().rejects(new Error('Failed to parse ingredients'));

        helper.load([rewiredParserNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'parseText');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property('message', 'Failed to parse ingredients');

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
