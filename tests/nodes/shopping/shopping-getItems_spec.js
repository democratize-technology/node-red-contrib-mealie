require('should');

const helper = require('node-red-node-test-helper');
const configNode = require('../../../nodes/config/mealie-server-config');
const sinon = require('sinon');
const { mockClient } = require('../../_fixtures/mock-client');
const proxyquire = require('proxyquire').noCallThru();

// The shopping node requires these modules
const rewiredShoppingNode = proxyquire('../../../nodes/shopping/mealie-shopping', {
    '../../lib/client-wrapper': {
        executeWithClient: async (config, operation) => {
            // Directly execute the operation with our mock client
            return operation(mockClient);
        },
    },
});

// Explicitly register node types
helper.init(require.resolve('node-red'));

describe('mealie-shopping Node with getItems operation', function () {
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
                type: 'mealie-shopping',
                name: 'Test Shopping GetItems',
                server: 'server1',
                operation: 'getItems',
                shoppingListId: 'list-123',
            },
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
        ];

        helper.load([rewiredShoppingNode, configNode], flow, function () {
            try {
                const n1 = helper.getNode('n1');
                n1.should.have.property('name', 'Test Shopping GetItems');
                n1.should.have.property('operation', 'getItems');
                n1.should.have.property('shoppingListId', 'list-123');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should retrieve shopping list items with shoppingListId from node configuration', function (done) {
        const shoppingListId = 'list-123';

        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-shopping',
                name: 'Test Shopping Node',
                server: 'server1',
                operation: 'getItems',
                shoppingListId: shoppingListId,
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset getShoppingListItems stub to return specific data
        mockClient.shoppingLists = {
            getShoppingListItems: sinon.stub().resolves([
                { id: 'item-1', name: 'Milk', quantity: 1, unit: 'liter', checked: false },
                { id: 'item-2', name: 'Bread', quantity: 1, unit: 'loaf', checked: false },
                { id: 'item-3', name: 'Eggs', quantity: 12, unit: '', checked: true },
            ]),
        };

        helper.load([rewiredShoppingNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'getItems');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.be.an.Array();
                    msg.payload.data.should.have.length(3);
                    msg.payload.data[0].should.have.property('name', 'Milk');
                    msg.payload.data[1].should.have.property('name', 'Bread');
                    msg.payload.data[2].should.have.property('name', 'Eggs');
                    msg.payload.data[2].should.have.property('checked', true);

                    // Verify the stub was called with the correct parameters
                    sinon.assert.calledOnce(mockClient.shoppingLists.getShoppingListItems);
                    sinon.assert.calledWith(mockClient.shoppingLists.getShoppingListItems, shoppingListId);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should retrieve shopping list items with shoppingListId from msg.payload', function (done) {
        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-shopping',
                name: 'Test Shopping Node',
                server: 'server1',
                operation: 'getItems',
                // No shoppingListId set in the node config
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        const shoppingListId = 'list-456';

        // Reset getShoppingListItems stub to return specific data
        mockClient.shoppingLists.getShoppingListItems = sinon.stub().resolves([
            { id: 'item-4', name: 'Cheese', quantity: 200, unit: 'grams', checked: false },
            { id: 'item-5', name: 'Apples', quantity: 6, unit: '', checked: false },
        ]);

        helper.load([rewiredShoppingNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'getItems');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.be.an.Array();
                    msg.payload.data.should.have.length(2);
                    msg.payload.data[0].should.have.property('name', 'Cheese');
                    msg.payload.data[1].should.have.property('name', 'Apples');

                    // Verify the stub was called with the correct parameters
                    sinon.assert.calledOnce(mockClient.shoppingLists.getShoppingListItems);
                    sinon.assert.calledWith(mockClient.shoppingLists.getShoppingListItems, shoppingListId);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node with shoppingListId in the payload
            n1.receive({
                payload: {
                    shoppingListId: shoppingListId,
                },
            });
        });
    });

    it('should handle empty items list', function (done) {
        const shoppingListId = 'list-empty';

        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-shopping',
                name: 'Test Shopping Node',
                server: 'server1',
                operation: 'getItems',
                shoppingListId: shoppingListId,
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset getShoppingListItems stub to return empty array
        mockClient.shoppingLists.getShoppingListItems = sinon.stub().resolves([]);

        helper.load([rewiredShoppingNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'getItems');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.be.an.Array();
                    msg.payload.data.should.have.length(0);

                    // Verify the stub was called with the correct parameter
                    sinon.assert.calledOnce(mockClient.shoppingLists.getShoppingListItems);
                    sinon.assert.calledWith(mockClient.shoppingLists.getShoppingListItems, shoppingListId);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should fail if no shopping list ID is provided', function (done) {
        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-shopping',
                name: 'Test Shopping Node',
                server: 'server1',
                operation: 'getItems',
                // No shoppingListId provided
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        helper.load([rewiredShoppingNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'getItems');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property(
                        'message',
                        'No shopping list ID provided for getItems operation. Specify in node config or msg.payload.shoppingListId',
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

    it('should handle API errors gracefully', function (done) {
        const shoppingListId = 'list-999';

        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-shopping',
                name: 'Test Shopping Node',
                server: 'server1',
                operation: 'getItems',
                shoppingListId: shoppingListId,
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Make the getShoppingListItems stub throw an error
        mockClient.shoppingLists.getShoppingListItems = sinon
            .stub()
            .rejects(new Error('API Error: Shopping list not found'));

        helper.load([rewiredShoppingNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'getItems');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property('message', 'API Error: Shopping list not found');

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
