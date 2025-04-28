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

describe('mealie-organizer Node with getCookbooks operation', function () {
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
        name: 'Test Organizer GetCookbooks',
        server: 'server1',
        operation: 'getCookbooks',
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
        n1.should.have.property('name', 'Test Organizer GetCookbooks');
        n1.should.have.property('operation', 'getCookbooks');
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it('should retrieve all cookbooks when no cookbookId is provided', function (done) {
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
        operation: 'getCookbooks',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset stubs
    mockClient.organizers = {
      getAllCookbooks: sinon.stub().resolves([
        { id: 'cb-123', name: 'Family Favorites', description: 'Our favorite recipes' },
        { id: 'cb-456', name: 'Holiday Meals', description: 'Seasonal recipes' },
      ]),
      getCookbook: sinon.stub().resolves({})
    };

    helper.load([rewiredOrganizerNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'getCookbooks');
          msg.payload.should.have.property('data');
          msg.payload.data.should.be.an.Array();
          msg.payload.data.should.have.length(2);
          msg.payload.data[0].should.have.property('name', 'Family Favorites');
          msg.payload.data[1].should.have.property('name', 'Holiday Meals');

          // Verify the correct stub was called
          sinon.assert.calledOnce(mockClient.organizers.getAllCookbooks);
          sinon.assert.notCalled(mockClient.organizers.getCookbook);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node
      n1.receive({});
    });
  });

  it('should retrieve a specific cookbook when cookbookId is provided in node config', function (done) {
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
        operation: 'getCookbooks',
        cookbookId: 'cb-123',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset stubs
    mockClient.organizers.getAllCookbooks = sinon.stub().resolves([]);
    mockClient.organizers.getCookbook = sinon.stub().resolves({ 
      id: 'cb-123', 
      name: 'Family Favorites',
      description: 'Our favorite recipes',
      recipes: [
        { id: 'recipe-101', name: 'Mom\'s Lasagna' },
        { id: 'recipe-102', name: 'Dad\'s BBQ Chicken' }
      ]
    });

    helper.load([rewiredOrganizerNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'getCookbooks');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('id', 'cb-123');
          msg.payload.data.should.have.property('name', 'Family Favorites');
          msg.payload.data.should.have.property('recipes');
          msg.payload.data.recipes.should.have.length(2);

          // Verify the correct stub was called with the right argument
          sinon.assert.notCalled(mockClient.organizers.getAllCookbooks);
          sinon.assert.calledOnce(mockClient.organizers.getCookbook);
          sinon.assert.calledWith(mockClient.organizers.getCookbook, 'cb-123');

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node
      n1.receive({});
    });
  });

  it('should retrieve a specific cookbook when cookbookId is provided in msg.payload', function (done) {
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
        operation: 'getCookbooks',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset stubs
    mockClient.organizers.getAllCookbooks = sinon.stub().resolves([]);
    mockClient.organizers.getCookbook = sinon.stub().resolves({ 
      id: 'cb-456', 
      name: 'Holiday Meals',
      description: 'Seasonal recipes',
      recipes: [
        { id: 'recipe-201', name: 'Thanksgiving Turkey' }
      ]
    });

    helper.load([rewiredOrganizerNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'getCookbooks');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('id', 'cb-456');
          msg.payload.data.should.have.property('name', 'Holiday Meals');
          msg.payload.data.should.have.property('recipes');
          msg.payload.data.recipes.should.have.length(1);

          // Verify the correct stub was called with the right argument
          sinon.assert.notCalled(mockClient.organizers.getAllCookbooks);
          sinon.assert.calledOnce(mockClient.organizers.getCookbook);
          sinon.assert.calledWith(mockClient.organizers.getCookbook, 'cb-456');

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node with cookbookId in the payload
      n1.receive({ payload: { cookbookId: 'cb-456' } });
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
        operation: 'getCookbooks',
        cookbookId: 'cb-999',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Make the getCookbook stub throw an error
    mockClient.organizers.getCookbook = sinon.stub().rejects(new Error('Cookbook not found'));

    helper.load([rewiredOrganizerNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', false);
          msg.payload.should.have.property('operation', 'getCookbooks');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property('message', 'Cookbook not found');

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
