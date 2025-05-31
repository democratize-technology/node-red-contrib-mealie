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

describe('mealie-shopping Node with addRecipe operation', function () {
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
                name: 'Test Shopping AddRecipe',
                server: 'server1',
                operation: 'addRecipe',
                shoppingListId: 'list-123',
                recipeId: 'recipe-456',
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
                n1.should.have.property('name', 'Test Shopping AddRecipe');
                n1.should.have.property('operation', 'addRecipe');
                n1.should.have.property('shoppingListId', 'list-123');
                n1.should.have.property('recipeId', 'recipe-456');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should add a recipe to shopping list with shoppingListId and recipeId from node configuration', function (done) {
        const shoppingListId = 'list-123';
        const recipeId = 'recipe-456';

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
                operation: 'addRecipe',
                shoppingListId: shoppingListId,
                recipeId: recipeId,
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset addRecipeToShoppingList stub to return specific data
        mockClient.shoppingLists = {
            addRecipeToShoppingList: sinon.stub().resolves({
                success: true,
                message: 'Recipe added to shopping list',
                addedItems: [
                    { id: 'item-8', name: 'Flour', quantity: 2, unit: 'cups' },
                    { id: 'item-9', name: 'Sugar', quantity: 1, unit: 'cup' },
                    { id: 'item-10', name: 'Eggs', quantity: 2, unit: '' },
                ],
            }),
        };

        helper.load([rewiredShoppingNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'addRecipe');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('success', true);
                    msg.payload.data.should.have.property('message', 'Recipe added to shopping list');
                    msg.payload.data.should.have.property('addedItems').which.is.an.Array().and.have.length(3);
                    msg.payload.data.addedItems[0].should.have.property('name', 'Flour');

                    // Verify the stub was called with the correct parameters
                    sinon.assert.calledOnce(mockClient.shoppingLists.addRecipeToShoppingList);
                    sinon.assert.calledWith(mockClient.shoppingLists.addRecipeToShoppingList, shoppingListId, recipeId);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should add a recipe to shopping list with shoppingListId and recipeId from msg.payload', function (done) {
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
                operation: 'addRecipe',
                // No shoppingListId or recipeId set in the node config
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        const shoppingListId = 'list-789';
        const recipeId = 'recipe-789';

        // Reset addRecipeToShoppingList stub to return specific data
        mockClient.shoppingLists.addRecipeToShoppingList = sinon.stub().resolves({
            success: true,
            message: 'Recipe added to shopping list',
            addedItems: [
                { id: 'item-11', name: 'Milk', quantity: 1, unit: 'cup' },
                { id: 'item-12', name: 'Butter', quantity: 2, unit: 'tbsp' },
            ],
        });

        helper.load([rewiredShoppingNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'addRecipe');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('success', true);
                    msg.payload.data.should.have.property('message', 'Recipe added to shopping list');
                    msg.payload.data.should.have.property('addedItems').which.is.an.Array().and.have.length(2);
                    msg.payload.data.addedItems[0].should.have.property('name', 'Milk');
                    msg.payload.data.addedItems[1].should.have.property('name', 'Butter');

                    // Verify the stub was called with the correct parameters
                    sinon.assert.calledOnce(mockClient.shoppingLists.addRecipeToShoppingList);
                    sinon.assert.calledWith(mockClient.shoppingLists.addRecipeToShoppingList, shoppingListId, recipeId);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node with shoppingListId and recipeId in the payload
            n1.receive({
                payload: {
                    operation: 'addRecipe',
                    shoppingListId: shoppingListId,
                    recipeId: recipeId,
                },
            });
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
                operation: 'addRecipe',
                // No shoppingListId provided
                recipeId: 'recipe-456',
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
                    msg.payload.should.have.property('operation', 'addRecipe');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property(
                        'message',
                        'No shopping list ID provided for addRecipe operation. Specify in node config or msg.payload.shoppingListId',
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

    it('should fail if no recipe ID is provided', function (done) {
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
                operation: 'addRecipe',
                shoppingListId: 'list-123',
                // No recipeId provided
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
                    msg.payload.should.have.property('operation', 'addRecipe');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property(
                        'message',
                        'No recipe ID provided for addRecipe operation. Specify in node config or msg.payload.recipeId',
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
        const recipeId = 'recipe-999';

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
                operation: 'addRecipe',
                shoppingListId: shoppingListId,
                recipeId: recipeId,
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Make the addRecipeToShoppingList stub throw an error
        mockClient.shoppingLists.addRecipeToShoppingList = sinon
            .stub()
            .rejects(new Error('API Error: Recipe or shopping list not found'));

        helper.load([rewiredShoppingNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'addRecipe');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property('message', 'API Error: Recipe or shopping list not found');

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
