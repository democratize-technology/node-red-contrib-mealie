require('should');

const helper = require('node-red-node-test-helper');
const configNode = require('../../../nodes/config/mealie-server-config');
const sinon = require('sinon');
const { mockClient } = require('../../_fixtures/mock-client');
const proxyquire = require('proxyquire').noCallThru();

// The planning node requires these modules
const rewiredPlanningNode = proxyquire('../../../nodes/planning/mealie-planning', {
  '../../lib/client-wrapper': {
    executeWithClient: async (config, operation) => {
      // Directly execute the operation with our mock client
      return operation(mockClient);
    },
  },
});

// Explicitly register node types
helper.init(require.resolve('node-red'));

describe('mealie-planning Node with get operation', function () {
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
        type: 'mealie-planning',
        name: 'Test Planning Get',
        server: 'server1',
        operation: 'get',
      },
      {
        id: 'server1',
        type: 'mealie-server-config',
        name: 'Test Server',
      },
    ];

    helper.load([rewiredPlanningNode, configNode], flow, function () {
      try {
        const n1 = helper.getNode('n1');
        n1.should.have.property('name', 'Test Planning Get');
        n1.should.have.property('operation', 'get');
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it('should retrieve all meal plans when no mealPlanId is provided', function (done) {
    const flow = [
      {
        id: 'server1',
        type: 'mealie-server-config',
        name: 'Test Server',
      },
      {
        id: 'n1',
        type: 'mealie-planning',
        name: 'Test Planning Node',
        server: 'server1',
        operation: 'get',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset stubs
    mockClient.mealPlans = {
      getAllMealPlans: sinon.stub().resolves([
        { id: 'plan-123', date: '2025-05-01', title: 'Monday Plan' },
        { id: 'plan-456', date: '2025-05-02', title: 'Tuesday Plan' },
      ]),
      getMealPlan: sinon.stub().resolves({})
    };

    helper.load([rewiredPlanningNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'get');
          msg.payload.should.have.property('data');
          msg.payload.data.should.be.an.Array();
          msg.payload.data.should.have.length(2);
          msg.payload.data[0].should.have.property('title', 'Monday Plan');
          msg.payload.data[1].should.have.property('title', 'Tuesday Plan');

          // Verify the correct stub was called
          sinon.assert.calledOnce(mockClient.mealPlans.getAllMealPlans);
          sinon.assert.notCalled(mockClient.mealPlans.getMealPlan);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node
      n1.receive({});
    });
  });

  it('should retrieve a specific meal plan when mealPlanId is provided in node config', function (done) {
    const flow = [
      {
        id: 'server1',
        type: 'mealie-server-config',
        name: 'Test Server',
      },
      {
        id: 'n1',
        type: 'mealie-planning',
        name: 'Test Planning Node',
        server: 'server1',
        operation: 'get',
        mealPlanId: 'plan-123',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset stubs
    mockClient.mealPlans.getAllMealPlans = sinon.stub().resolves([]);
    mockClient.mealPlans.getMealPlan = sinon.stub().resolves({ 
      id: 'plan-123', 
      date: '2025-05-01',
      title: 'Monday Plan',
      meals: [
        { name: 'Breakfast', recipeId: 'recipe-123' },
        { name: 'Dinner', recipeId: 'recipe-456' }
      ]
    });

    helper.load([rewiredPlanningNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'get');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('id', 'plan-123');
          msg.payload.data.should.have.property('title', 'Monday Plan');
          msg.payload.data.should.have.property('meals');
          msg.payload.data.meals.should.have.length(2);

          // Verify the correct stub was called with the right argument
          sinon.assert.notCalled(mockClient.mealPlans.getAllMealPlans);
          sinon.assert.calledOnce(mockClient.mealPlans.getMealPlan);
          sinon.assert.calledWith(mockClient.mealPlans.getMealPlan, 'plan-123');

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node
      n1.receive({});
    });
  });

  it('should retrieve a specific meal plan when mealPlanId is provided in msg.payload', function (done) {
    const flow = [
      {
        id: 'server1',
        type: 'mealie-server-config',
        name: 'Test Server',
      },
      {
        id: 'n1',
        type: 'mealie-planning',
        name: 'Test Planning Node',
        server: 'server1',
        operation: 'get',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset stubs
    mockClient.mealPlans.getAllMealPlans = sinon.stub().resolves([]);
    mockClient.mealPlans.getMealPlan = sinon.stub().resolves({ 
      id: 'plan-456', 
      date: '2025-05-02',
      title: 'Tuesday Plan',
      meals: [
        { name: 'Lunch', recipeId: 'recipe-789' }
      ]
    });

    helper.load([rewiredPlanningNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'get');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('id', 'plan-456');
          msg.payload.data.should.have.property('title', 'Tuesday Plan');
          msg.payload.data.should.have.property('meals');
          msg.payload.data.meals.should.have.length(1);

          // Verify the correct stub was called with the right argument
          sinon.assert.notCalled(mockClient.mealPlans.getAllMealPlans);
          sinon.assert.calledOnce(mockClient.mealPlans.getMealPlan);
          sinon.assert.calledWith(mockClient.mealPlans.getMealPlan, 'plan-456');

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node with mealPlanId in the payload
      n1.receive({ payload: { mealPlanId: 'plan-456' } });
    });
  });

  it('should use query parameters when provided in msg.payload', function (done) {
    const flow = [
      {
        id: 'server1',
        type: 'mealie-server-config',
        name: 'Test Server',
      },
      {
        id: 'n1',
        type: 'mealie-planning',
        name: 'Test Planning Node',
        server: 'server1',
        operation: 'get',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset stubs
    mockClient.mealPlans.getAllMealPlans = sinon.stub().resolves([
      { id: 'plan-123', date: '2025-05-01', title: 'Monday Plan' }
    ]);
    mockClient.mealPlans.getMealPlan = sinon.stub().resolves({});

    helper.load([rewiredPlanningNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'get');
          
          // Verify the correct stub was called with the right arguments
          sinon.assert.calledOnce(mockClient.mealPlans.getAllMealPlans);
          sinon.assert.calledWith(mockClient.mealPlans.getAllMealPlans, { 
            startDate: '2025-05-01', 
            endDate: '2025-05-07' 
          });
          sinon.assert.notCalled(mockClient.mealPlans.getMealPlan);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node with query parameters in the payload
      n1.receive({ 
        payload: { 
          queryParams: {
            startDate: '2025-05-01',
            endDate: '2025-05-07'
          }
        } 
      });
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
        type: 'mealie-planning',
        name: 'Test Planning Node',
        server: 'server1',
        operation: 'get',
        mealPlanId: 'plan-999',
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Make the getMealPlan stub throw an error
    mockClient.mealPlans.getMealPlan = sinon.stub().rejects(new Error('Meal plan not found'));

    helper.load([rewiredPlanningNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', false);
          msg.payload.should.have.property('operation', 'get');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property('message', 'Meal plan not found');

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
