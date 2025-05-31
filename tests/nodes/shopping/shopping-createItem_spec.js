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

describe('mealie-shopping Node with createItem operation', function () {
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
        const itemData = {
            name: 'Butter',
            quantity: 1,
            unit: 'stick',
            checked: false,
        };

        const flow = [
            {
                id: 'n1',
                type: 'mealie-shopping',
                name: 'Test Shopping CreateItem',
                server: 'server1',
                operation: 'createItem',
                shoppingListId: 'list-123',
                itemData: JSON.stringify(itemData),
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
                n1.should.have.property('name', 'Test Shopping CreateItem');
                n1.should.have.property('operation', 'createItem');
                n1.should.have.property('shoppingListId', 'list-123');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should create a shopping list item with shoppingListId and itemData from node configuration', function (done) {
        const shoppingListId = 'list-123';
        const itemData = {
            name: 'Butter',
            quantity: 1,
            unit: 'stick',
            checked: false,
        };

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
                operation: 'createItem',
                shoppingListId: shoppingListId,
                itemData: JSON.stringify(itemData),
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset createShoppingListItem stub to return specific data
        mockClient.shoppingLists = {
            createShoppingListItem: sinon.stub().resolves({
                id: 'item-6',
                name: 'Butter',
                quantity: 1,
                unit: 'stick',
                checked: false,
                shoppingListId: shoppingListId,
            }),
        };

        helper.load([rewiredShoppingNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'createItem');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('id', 'item-6');
                    msg.payload.data.should.have.property('name', 'Butter');
                    msg.payload.data.should.have.property('quantity', 1);
                    msg.payload.data.should.have.property('unit', 'stick');
                    msg.payload.data.should.have.property('checked', false);
                    msg.payload.data.should.have.property('shoppingListId', shoppingListId);

                    // Verify the stub was called with the correct parameters
                    sinon.assert.calledOnce(mockClient.shoppingLists.createShoppingListItem);
                    sinon.assert.calledWith(mockClient.shoppingLists.createShoppingListItem, shoppingListId, itemData);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should create a shopping list item with shoppingListId and itemData from msg.payload', function (done) {
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
                operation: 'createItem',
                // No shoppingListId or itemData set in the node config
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        const shoppingListId = 'list-456';
        const itemData = {
            name: 'Sugar',
            quantity: 2,
            unit: 'cups',
            checked: false,
            note: 'Brown sugar preferred',
        };

        // Reset createShoppingListItem stub to return specific data
        mockClient.shoppingLists.createShoppingListItem = sinon.stub().resolves({
            id: 'item-7',
            name: 'Sugar',
            quantity: 2,
            unit: 'cups',
            checked: false,
            note: 'Brown sugar preferred',
            shoppingListId: shoppingListId,
        });

        helper.load([rewiredShoppingNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'createItem');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('id', 'item-7');
                    msg.payload.data.should.have.property('name', 'Sugar');
                    msg.payload.data.should.have.property('quantity', 2);
                    msg.payload.data.should.have.property('unit', 'cups');
                    msg.payload.data.should.have.property('checked', false);
                    msg.payload.data.should.have.property('note', 'Brown sugar preferred');
                    msg.payload.data.should.have.property('shoppingListId', shoppingListId);

                    // Verify the stub was called with the correct parameters
                    sinon.assert.calledOnce(mockClient.shoppingLists.createShoppingListItem);
                    sinon.assert.calledWith(mockClient.shoppingLists.createShoppingListItem, shoppingListId, itemData);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node with shoppingListId and itemData in the payload
            n1.receive({
                payload: {
                    shoppingListId: shoppingListId,
                    itemData: itemData,
                },
            });
        });
    });

    it('should fail if no shopping list ID is provided', function (done) {
        const itemData = {
            name: 'Butter',
            quantity: 1,
            unit: 'stick',
            checked: false,
        };

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
                operation: 'createItem',
                // No shoppingListId provided
                itemData: JSON.stringify(itemData),
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
                    msg.payload.should.have.property('operation', 'createItem');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property(
                        'message',
                        'No shopping list ID provided for createItem operation. Specify in node config or msg.payload.shoppingListId',
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

    it('should fail if no item data is provided', function (done) {
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
                operation: 'createItem',
                shoppingListId: 'list-123',
                // No itemData provided
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
                    msg.payload.should.have.property('operation', 'createItem');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property(
                        'message',
                        'No item data provided for createItem operation. Specify in node config or msg.payload.itemData',
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
        const itemData = {
            name: 'Invalid Item',
            quantity: 1,
            unit: '',
            checked: false,
        };

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
                operation: 'createItem',
                shoppingListId: shoppingListId,
                itemData: JSON.stringify(itemData),
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Make the createShoppingListItem stub throw an error
        mockClient.shoppingLists.createShoppingListItem = sinon
            .stub()
            .rejects(new Error('API Error: Shopping list not found'));

        helper.load([rewiredShoppingNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'createItem');
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
