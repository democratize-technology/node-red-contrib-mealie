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

describe('mealie-shopping Node with createList operation', function () {
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
        const listData = {
            name: 'New Shopping List',
            items: [],
        };

        const flow = [
            {
                id: 'n1',
                type: 'mealie-shopping',
                name: 'Test Shopping CreateList',
                server: 'server1',
                operation: 'createList',
                listData: JSON.stringify(listData),
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
                n1.should.have.property('name', 'Test Shopping CreateList');
                n1.should.have.property('operation', 'createList');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should create a shopping list with listData from node configuration', function (done) {
        const listData = {
            name: 'New Shopping List',
            items: [],
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
                operation: 'createList',
                listData: JSON.stringify(listData),
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset createShoppingList stub to return specific data
        mockClient.shoppingLists = {
            createShoppingList: sinon.stub().resolves({
                id: 'list-789',
                name: 'New Shopping List',
                items: [],
            }),
        };

        helper.load([rewiredShoppingNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'createList');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('id', 'list-789');
                    msg.payload.data.should.have.property('name', 'New Shopping List');
                    msg.payload.data.should.have.property('items').which.is.an.Array();

                    // Verify the stub was called with the correct parameters
                    sinon.assert.calledOnce(mockClient.shoppingLists.createShoppingList);
                    sinon.assert.calledWith(mockClient.shoppingLists.createShoppingList, listData);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should create a shopping list with listData from msg.payload', function (done) {
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
                operation: 'createList',
                // No listData set in the node config
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        const listData = {
            name: 'Weekly Groceries',
            items: [
                { name: 'Milk', checked: false },
                { name: 'Bread', checked: false },
            ],
        };

        // Reset createShoppingList stub to return specific data
        mockClient.shoppingLists.createShoppingList = sinon.stub().resolves({
            id: 'list-999',
            name: 'Weekly Groceries',
            items: [
                { id: 'item-1', name: 'Milk', checked: false },
                { id: 'item-2', name: 'Bread', checked: false },
            ],
        });

        helper.load([rewiredShoppingNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'createList');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('id', 'list-999');
                    msg.payload.data.should.have.property('name', 'Weekly Groceries');
                    msg.payload.data.should.have.property('items').which.is.an.Array().and.have.length(2);

                    // Verify the stub was called with the correct parameters
                    sinon.assert.calledOnce(mockClient.shoppingLists.createShoppingList);
                    sinon.assert.calledWith(mockClient.shoppingLists.createShoppingList, listData);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node with listData in the payload
            n1.receive({
                payload: {
                    listData: listData,
                },
            });
        });
    });

    it('should fail if no list data is provided', function (done) {
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
                operation: 'createList',
                // No listData provided
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
                    msg.payload.should.have.property('operation', 'createList');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property(
                        'message',
                        'No list data provided for createList operation. Specify in node config or msg.payload.listData',
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
        const listData = {
            name: 'Invalid List',
            items: [],
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
                operation: 'createList',
                listData: JSON.stringify(listData),
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Make the createShoppingList stub throw an error
        mockClient.shoppingLists.createShoppingList = sinon
            .stub()
            .rejects(new Error('API Error: Failed to create shopping list'));

        helper.load([rewiredShoppingNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'createList');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property('message', 'API Error: Failed to create shopping list');

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
