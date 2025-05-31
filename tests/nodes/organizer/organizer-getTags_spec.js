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

describe('mealie-organizer Node with getTags operation', function () {
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
                name: 'Test Organizer GetTags',
                server: 'server1',
                operation: 'getTags',
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
                n1.should.have.property('name', 'Test Organizer GetTags');
                n1.should.have.property('operation', 'getTags');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should retrieve all tags when no tagId is provided', function (done) {
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
                operation: 'getTags',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset stubs
        mockClient.organizers = {
            getAllTags: sinon.stub().resolves([
                { id: 'tag-123', name: 'Quick', slug: 'quick' },
                { id: 'tag-456', name: 'Vegetarian', slug: 'vegetarian' },
            ]),
            getTag: sinon.stub().resolves({})
        };

        helper.load([rewiredOrganizerNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'getTags');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.be.an.Array();
                    msg.payload.data.should.have.length(2);
                    msg.payload.data[0].should.have.property('name', 'Quick');
                    msg.payload.data[1].should.have.property('name', 'Vegetarian');

                    // Verify the correct stub was called
                    sinon.assert.calledOnce(mockClient.organizers.getAllTags);
                    sinon.assert.notCalled(mockClient.organizers.getTag);

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should retrieve a specific tag when tagId is provided in node config', function (done) {
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
                operation: 'getTags',
                tagId: 'tag-123',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset stubs
        mockClient.organizers.getAllTags = sinon.stub().resolves([]);
        mockClient.organizers.getTag = sinon.stub().resolves({
            id: 'tag-123',
            name: 'Quick',
            slug: 'quick',
            recipes: [
                { id: 'recipe-101', name: '5-Minute Breakfast' },
                { id: 'recipe-102', name: 'Quick Sandwich' }
            ]
        });

        helper.load([rewiredOrganizerNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'getTags');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('id', 'tag-123');
                    msg.payload.data.should.have.property('name', 'Quick');
                    msg.payload.data.should.have.property('recipes');
                    msg.payload.data.recipes.should.have.length(2);

                    // Verify the correct stub was called with the right argument
                    sinon.assert.notCalled(mockClient.organizers.getAllTags);
                    sinon.assert.calledOnce(mockClient.organizers.getTag);
                    sinon.assert.calledWith(mockClient.organizers.getTag, 'tag-123');

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node
            n1.receive({});
        });
    });

    it('should retrieve a specific tag when tagId is provided in msg.payload', function (done) {
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
                operation: 'getTags',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Reset stubs
        mockClient.organizers.getAllTags = sinon.stub().resolves([]);
        mockClient.organizers.getTag = sinon.stub().resolves({
            id: 'tag-456',
            name: 'Vegetarian',
            slug: 'vegetarian',
            recipes: [
                { id: 'recipe-201', name: 'Vegetable Curry' }
            ]
        });

        helper.load([rewiredOrganizerNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', true);
                    msg.payload.should.have.property('operation', 'getTags');
                    msg.payload.should.have.property('data');
                    msg.payload.data.should.have.property('id', 'tag-456');
                    msg.payload.data.should.have.property('name', 'Vegetarian');
                    msg.payload.data.should.have.property('recipes');
                    msg.payload.data.recipes.should.have.length(1);

                    // Verify the correct stub was called with the right argument
                    sinon.assert.notCalled(mockClient.organizers.getAllTags);
                    sinon.assert.calledOnce(mockClient.organizers.getTag);
                    sinon.assert.calledWith(mockClient.organizers.getTag, 'tag-456');

                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Trigger the node with tagId in the payload
            n1.receive({ payload: { tagId: 'tag-456' } });
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
                operation: 'getTags',
                tagId: 'tag-999',
                wires: [['n2']],
            },
            { id: 'n2', type: 'helper' },
        ];

        // Make the getTag stub throw an error
        mockClient.organizers.getTag = sinon.stub().rejects(new Error('Tag not found'));

        helper.load([rewiredOrganizerNode, configNode], flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload');
                    msg.payload.should.have.property('success', false);
                    msg.payload.should.have.property('operation', 'getTags');
                    msg.payload.should.have.property('error');
                    msg.payload.error.should.have.property('message', 'Tag not found');

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
