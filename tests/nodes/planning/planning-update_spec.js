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

describe('mealie-planning Node with update operation', function () {
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
    const planData = {
      title: 'Updated Saturday Plan',
      meals: [
        { name: 'Breakfast', recipeId: 'recipe-123' },
        { name: 'Lunch', recipeId: 'recipe-456' },
      ],
    };

    const flow = [
      {
        id: 'n1',
        type: 'mealie-planning',
        name: 'Test Planning Update',
        server: 'server1',
        operation: 'update',
        mealPlanId: 'plan-123',
        planData: JSON.stringify(planData),
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
        n1.should.have.property('name', 'Test Planning Update');
        n1.should.have.property('operation', 'update');
        n1.should.have.property('mealPlanId', 'plan-123');
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  it('should update a meal plan with node configuration', function (done) {
    const mealPlanId = 'plan-123';
    const planData = {
      title: 'Updated Saturday Plan',
      meals: [
        { name: 'Breakfast', recipeId: 'recipe-123' },
        { name: 'Lunch', recipeId: 'recipe-456' },
      ],
    };

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
        operation: 'update',
        mealPlanId: mealPlanId,
        planData: JSON.stringify(planData),
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Reset updateMealPlan stub to return specific data
    mockClient.mealPlans = {
      updateMealPlan: sinon.stub().resolves({
        id: mealPlanId,
        date: '2025-05-10',
        title: 'Updated Saturday Plan',
        meals: [
          { id: 'meal-123', name: 'Breakfast', recipeId: 'recipe-123' },
          { id: 'meal-456', name: 'Lunch', recipeId: 'recipe-456' },
        ],
      }),
    };

    helper.load([rewiredPlanningNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'update');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('id', mealPlanId);
          msg.payload.data.should.have.property('title', 'Updated Saturday Plan');
          msg.payload.data.should.have.property('meals');
          msg.payload.data.meals.should.have.length(2);
          msg.payload.data.meals[0].should.have.property('id', 'meal-123');
          msg.payload.data.meals[0].should.have.property('name', 'Breakfast');
          msg.payload.data.meals[1].should.have.property('id', 'meal-456');
          msg.payload.data.meals[1].should.have.property('name', 'Lunch');

          // Verify the stub was called with the correct parameters
          sinon.assert.calledOnce(mockClient.mealPlans.updateMealPlan);
          sinon.assert.calledWith(mockClient.mealPlans.updateMealPlan, mealPlanId, planData);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node
      n1.receive({});
    });
  });

  it('should update a meal plan with parameters from msg.payload', function (done) {
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
        operation: 'update',
        // No mealPlanId or planData set in the node config
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    const mealPlanId = 'plan-456';
    const planData = {
      title: 'Updated Sunday Plan',
      meals: [{ name: 'Dinner', recipeId: 'recipe-789' }],
    };

    // Reset updateMealPlan stub to return specific data
    mockClient.mealPlans.updateMealPlan = sinon.stub().resolves({
      id: mealPlanId,
      date: '2025-05-11',
      title: 'Updated Sunday Plan',
      meals: [{ id: 'meal-789', name: 'Dinner', recipeId: 'recipe-789' }],
    });

    helper.load([rewiredPlanningNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', true);
          msg.payload.should.have.property('operation', 'update');
          msg.payload.should.have.property('data');
          msg.payload.data.should.have.property('id', mealPlanId);
          msg.payload.data.should.have.property('title', 'Updated Sunday Plan');
          msg.payload.data.should.have.property('meals');
          msg.payload.data.meals.should.have.length(1);
          msg.payload.data.meals[0].should.have.property('id', 'meal-789');
          msg.payload.data.meals[0].should.have.property('name', 'Dinner');

          // Verify the stub was called with the correct parameters
          sinon.assert.calledOnce(mockClient.mealPlans.updateMealPlan);
          sinon.assert.calledWith(mockClient.mealPlans.updateMealPlan, mealPlanId, planData);

          done();
        } catch (err) {
          done(err);
        }
      });

      // Trigger the node with mealPlanId and planData in the payload
      n1.receive({
        payload: {
          mealPlanId: mealPlanId,
          planData: planData,
        },
      });
    });
  });

  it('should fail if no meal plan ID is provided', function (done) {
    const planData = {
      title: 'Updated Saturday Plan',
      meals: [{ name: 'Breakfast', recipeId: 'recipe-123' }],
    };

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
        operation: 'update',
        // No mealPlanId provided
        planData: JSON.stringify(planData),
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    helper.load([rewiredPlanningNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', false);
          msg.payload.should.have.property('operation', 'update');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property(
            'message',
            'No meal plan ID provided for update operation. Specify in node config or msg.payload.mealPlanId',
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

  it('should fail if no plan data is provided', function (done) {
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
        operation: 'update',
        mealPlanId: 'plan-123',
        // No planData provided
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    helper.load([rewiredPlanningNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', false);
          msg.payload.should.have.property('operation', 'update');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property(
            'message',
            'No plan data provided for update operation. Specify in node config or msg.payload.planData',
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
    const mealPlanId = 'plan-123';
    const planData = {
      title: 'Updated Saturday Plan',
      meals: [{ name: 'Breakfast', recipeId: 'recipe-123' }],
    };

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
        operation: 'update',
        mealPlanId: mealPlanId,
        planData: JSON.stringify(planData),
        wires: [['n2']],
      },
      { id: 'n2', type: 'helper' },
    ];

    // Make the updateMealPlan stub throw an error
    mockClient.mealPlans.updateMealPlan = sinon.stub().rejects(new Error('API Error: Meal plan not found'));

    helper.load([rewiredPlanningNode, configNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');

      n2.on('input', function (msg) {
        try {
          msg.should.have.property('payload');
          msg.payload.should.have.property('success', false);
          msg.payload.should.have.property('operation', 'update');
          msg.payload.should.have.property('error');
          msg.payload.error.should.have.property('message', 'API Error: Meal plan not found');

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
