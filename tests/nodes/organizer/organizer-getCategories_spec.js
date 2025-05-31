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

describe('mealie-organizer Node with getCategories operation', function () {
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
                type: 'mealie-organizer',
                name: 'Test Organizer GetCategories',
                server: 'server1',
                operation: 'getCategories',
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
                n1.should.have.property('name', 'Test Organizer GetCategories');
                n1.should.have.property('operation', 'getCategories');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should retrieve all categories when no categoryId is provided', function (done) {
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
                operation: 'getCategories',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset stubs
        mockClient.organizers.getAllCategories = sinon.stub().resolves([
            { id: 'cat-123', name: 'Desserts', slug: 'desserts' },
            { id: 'cat-456', name: 'Main Dishes', slug: 'main-dishes' },
        ]);
        mockClient.organizers.getCategory = sinon.stub().resolves({});

        helper.load([rewiredOrganizerNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'getCategories');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.be.an.Array();
                    msg.payload.data.should.have.length(2);
                    msg.payload.data[0].should.have.property('name', 'Desserts');
                    msg.payload.data[1].should.have.property('name', 'Main Dishes');

                    // Verify the correct stub was called
                    sinon.assert.calledOnce(mockClient.organizers.getAllCategories);
                    sinon.assert.notCalled(mockClient.organizers.getCategory);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should retrieve a specific category when categoryId is provided in node config', function (done) {
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
                operation: 'getCategories',
                categoryId: 'cat-123',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset stubs
        mockClient.organizers.getAllCategories = sinon.stub().resolves([]);
        mockClient.organizers.getCategory = sinon.stub().resolves({
            id: 'cat-123',
            name: 'Desserts',
            slug: 'desserts',
            recipes: [
                { id: 'recipe-101', name: 'Chocolate Cake' },
                { id: 'recipe-102', name: 'Ice Cream' }
            ]
        });

        helper.load([rewiredOrganizerNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'getCategories');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('id', 'cat-123');
                    msg.payload.data.should.have.property('name', 'Desserts');
                    msg.payload.data.should.have.property('recipes');
                    msg.payload.data.recipes.should.have.length(2);

                    // Verify the correct stub was called with the right argument
                    sinon.assert.notCalled(mockClient.organizers.getAllCategories);
                    sinon.assert.calledOnce(mockClient.organizers.getCategory);
                    sinon.assert.calledWith(mockClient.organizers.getCategory, 'cat-123');

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should retrieve a specific category when categoryId is provided in msg.payload', function (done) {
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
                operation: 'getCategories',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset stubs
        mockClient.organizers.getAllCategories = sinon.stub().resolves([]);
        mockClient.organizers.getCategory = sinon.stub().resolves({
            id: 'cat-456',
            name: 'Main Dishes',
            slug: 'main-dishes',
            recipes: [
                { id: 'recipe-201', name: 'Spaghetti Bolognese' }
            ]
        });

        helper.load([rewiredOrganizerNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'getCategories');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('id', 'cat-456');
                    msg.payload.data.should.have.property('name', 'Main Dishes');
                    msg.payload.data.should.have.property('recipes');
                    msg.payload.data.recipes.should.have.length(1);

                    // Verify the correct stub was called with the right argument
                    sinon.assert.notCalled(mockClient.organizers.getAllCategories);
                    sinon.assert.calledOnce(mockClient.organizers.getCategory);
                    sinon.assert.calledWith(mockClient.organizers.getCategory, 'cat-456');

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node with categoryId in the payload
            n1.receive({ payload: { categoryId: 'cat-456' } });
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
                type: 'mealie-organizer',
                name: 'Test Organizer Node',
                server: 'server1',
                operation: 'getCategories',
                categoryId: 'cat-999',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Make the getCategory stub throw an error
        mockClient.organizers.getCategory = sinon.stub().rejects(new Error('Category not found'));

        helper.load([rewiredOrganizerNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'getCategories');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property('message', 'Category not found');

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
