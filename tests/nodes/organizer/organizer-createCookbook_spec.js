require('should');

const helper = require('node-red-node-test-helper');
const configNode = require('../../../nodes/config/mealie-server-config');
const sinon = require('sinon');
const { mockClient } = require('../../_fixtures/mock-client');
const proxyquire = require('proxyquire').noCallThru();

// The organizer node requires these modules
const rewiredOrganizerNode = proxyquire('../../../nodes/organizer/mealie-organizer', {
    '../../lib/client-wrapper': {
        executeWithClient: async (config, operation) => {
            // Directly execute the operation with our mock client
            return operation(mockClient);
        },
    },
});

// Explicitly register node types
helper.init(require.resolve('node-red'));

describe('mealie-organizer Node with createCookbook operation', function () {
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
        const cookbookData = {
            name: 'New Cookbook',
            description: 'A collection of recipes',
        };

        const flow = [
            {
                id: 'n1',
                type: 'mealie-organizer',
                name: 'Test Organizer CreateCookbook',
                server: 'server1',
                operation: 'createCookbook',
                cookbookData: JSON.stringify(cookbookData),
            },
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
        ];

        helper.load([rewiredOrganizerNode, configNode], flow, function () {
            try {
                const n1 = helper.getNode('n1');
                n1.should.have.property('name', 'Test Organizer CreateCookbook');
                n1.should.have.property('operation', 'createCookbook');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should create a cookbook with cookbookData from node configuration', function (done) {
        const cookbookData = {
            name: 'New Cookbook',
            description: 'A collection of recipes',
            recipeIds: [],
        };

        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-organizer',
                name: 'Test Organizer Node',
                server: 'server1',
                operation: 'createCookbook',
                cookbookData: JSON.stringify(cookbookData),
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset createCookbook stub to return specific data
        mockClient.organizers = {
            createCookbook: sinon.stub().resolves({
                id: 'cb-789',
                name: 'New Cookbook',
                description: 'A collection of recipes',
                recipes: [],
            }),
        };

        helper.load([rewiredOrganizerNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'createCookbook');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('id', 'cb-789');
                    msg.payload.data.should.have.property('name', 'New Cookbook');
                    msg.payload.data.should.have.property('description', 'A collection of recipes');
                    msg.payload.data.should.have.property('recipes').which.is.an.Array();

                    // Verify the stub was called with the correct parameters
                    sinon.assert.calledOnce(mockClient.organizers.createCookbook);
                    sinon.assert.calledWith(mockClient.organizers.createCookbook, cookbookData);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should create a cookbook with cookbookData from msg.payload', function (done) {
        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-organizer',
                name: 'Test Organizer Node',
                server: 'server1',
                operation: 'createCookbook',
                // No cookbookData set in the node config
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        const cookbookData = {
            name: 'Weekend Recipes',
            description: 'Recipes for the weekend',
            recipeIds: ['recipe-101', 'recipe-102'],
        };

        // Reset createCookbook stub to return specific data
        mockClient.organizers.createCookbook = sinon.stub().resolves({
            id: 'cb-999',
            name: 'Weekend Recipes',
            description: 'Recipes for the weekend',
            recipes: [
                { id: 'recipe-101', name: 'Saturday Pancakes' },
                { id: 'recipe-102', name: 'Sunday Roast' },
            ],
        });

        helper.load([rewiredOrganizerNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'createCookbook');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('id', 'cb-999');
                    msg.payload.data.should.have.property('name', 'Weekend Recipes');
                    msg.payload.data.should.have.property('description', 'Recipes for the weekend');
                    msg.payload.data.should.have.property('recipes').which.is.an.Array().and.have.length(2);

                    // Verify the stub was called with the correct parameters
                    sinon.assert.calledOnce(mockClient.organizers.createCookbook);
                    sinon.assert.calledWith(mockClient.organizers.createCookbook, cookbookData);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node with cookbookData in the payload
            n1.receive({
                payload: {
                    cookbookData: cookbookData,
                },
            });
        });
    });

    it('should fail if no cookbook data is provided', function (done) {
        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-organizer',
                name: 'Test Organizer Node',
                server: 'server1',
                operation: 'createCookbook',
                // No cookbookData provided
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        helper.load([rewiredOrganizerNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'createCookbook');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property(
                        'message',
                        'No cookbook data provided for createCookbook operation. Specify in node config or msg.payload.cookbookData',
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
        const cookbookData = {
            name: 'Invalid Cookbook',
            description: 'This will cause an error',
        };

        const flow = [
            {
                id: 'server1',
                type: 'mealie-server-config',
                name: 'Test Server',
            },
            {
                id: 'n1',
                type: 'mealie-organizer',
                name: 'Test Organizer Node',
                server: 'server1',
                operation: 'createCookbook',
                cookbookData: JSON.stringify(cookbookData),
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Make the createCookbook stub throw an error
        mockClient.organizers.createCookbook = sinon.stub().rejects(new Error('API Error: Failed to create cookbook'));

        helper.load([rewiredOrganizerNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'createCookbook');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property('message', 'API Error: Failed to create cookbook');

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
