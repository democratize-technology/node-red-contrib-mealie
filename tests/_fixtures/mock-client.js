/**
 * Mock client for Mealie API
 */
const sinon = require('sinon');

// Create mock client for all services
const mockClient = {
  recipes: {
    getRecipe: sinon.stub().resolves({ id: '123', name: 'Test Recipe' }),
    getAllRecipes: sinon.stub().resolves([{ id: '123', name: 'Test Recipe' }]),
    createRecipe: sinon.stub().resolves({ id: '123', name: 'New Recipe', slug: 'new-recipe' }),
    updateRecipe: sinon.stub().resolves({ id: '123', name: 'Updated Recipe', slug: 'test-recipe' }),
    deleteRecipe: sinon.stub().resolves({ success: true }),
    getRecipeAssets: sinon.stub().resolves([{ name: 'asset.pdf', id: 'asset-123' }]),
    getRecipeImage: sinon.stub().resolves({ url: 'http://example.com/image.jpg' }),
  },
  households: {
    getHouseholds: sinon.stub().resolves([{ id: '456', name: 'Test Household' }]),
    getHousehold: sinon.stub().resolves({ id: '456', name: 'Test Household' }),
    getMembers: sinon.stub().resolves([{ id: 'user-123', name: 'Test User' }]),
    getPreferences: sinon.stub().resolves({ id: '456', notificationTime: '08:00' }),
    updatePreferences: sinon.stub().resolves({ id: '456', notificationTime: '09:00' }),
  },
  shopping: {
    getShoppingLists: sinon.stub().resolves([{ id: '789', name: 'Test Shopping List' }]),
    getShoppingList: sinon.stub().resolves({ id: '789', name: 'Test Shopping List' }),
    createShoppingList: sinon.stub().resolves({ id: '789', name: 'New Shopping List' }),
    updateShoppingList: sinon.stub().resolves({ id: '789', name: 'Updated Shopping List' }),
    deleteShoppingList: sinon.stub().resolves({ success: true }),
    getShoppingListItems: sinon.stub().resolves([{ id: 'item-123', name: 'Test Item' }]),
    createShoppingListItem: sinon.stub().resolves({ id: 'item-123', name: 'New Item' }),
    addRecipeToShoppingList: sinon.stub().resolves({ success: true }),
  },
  organizers: {
    getCategories: sinon.stub().resolves([{ id: 'cat-123', name: 'Test Category' }]),
    getTags: sinon.stub().resolves([{ id: 'tag-123', name: 'Test Tag' }]),
    getCookbooks: sinon.stub().resolves([{ id: 'cb-123', name: 'Test Cookbook' }]),
    createCookbook: sinon.stub().resolves({ id: 'cb-123', name: 'New Cookbook' }),
  },
  planning: {
    getMealPlans: sinon.stub().resolves([{ id: 'mp-123', date: '2025-01-01' }]),
    getMealPlan: sinon.stub().resolves({ id: 'mp-123', date: '2025-01-01' }),
    createMealPlan: sinon.stub().resolves({ id: 'mp-123', date: '2025-01-01' }),
    updateMealPlan: sinon.stub().resolves({ id: 'mp-123', date: '2025-01-01' }),
    deleteMealPlan: sinon.stub().resolves({ success: true }),
  },
  admin: {
    getServerInfo: sinon.stub().resolves({ version: '1.0.0', production: true }),
    getServerStatistics: sinon.stub().resolves({ recipes: 100, users: 10 }),
    getUsers: sinon.stub().resolves([{ id: 'user-123', name: 'Test User' }]),
    getUser: sinon.stub().resolves({ id: 'user-123', name: 'Test User' }),
    createUser: sinon.stub().resolves({ id: 'user-123', name: 'New User' }),
  },
  about: {
    getVersion: sinon.stub().resolves({ version: '1.0.0' }),
    getAbout: sinon.stub().resolves({ name: 'Mealie API' }),
  },
  users: {
    getCurrentUser: sinon.stub().resolves({ id: 'user-123', name: 'Current User' }),
  },
  media: {
    upload: sinon.stub().resolves({ id: 'media-123', url: 'http://example.com/media.jpg' }),
  },
  groups: {
    getGroups: sinon.stub().resolves([{ id: 'group-123', name: 'Test Group' }]),
  },
  parser: {
    parseUrl: sinon.stub().resolves({ recipe: { name: 'Parsed Recipe' } }),
    parseIngredients: sinon.stub().resolves([{ name: 'Ingredient', amount: 1, unit: 'cup' }]),
  },
  utilities: {
    getSchema: sinon.stub().resolves({ components: {}, paths: {} }),
  },
  bulk: {
    exportRecipes: sinon.stub().resolves({ recipes: [{ id: '123', name: 'Test Recipe' }] }),
    importRecipes: sinon.stub().resolves({ imported: 1, failed: 0 }),
  },
};

// Mock MealieClient class
class MockMealieClient {
  constructor(options) {
    this.options = options || {};
    this.baseUrl = options.baseUrl || 'http://localhost:9000';
    this.apiKey = options.apiKey || 'test-api-key';
    this.apiVersion = options.apiVersion || 'v1';
  }

  // Add any client methods that might be directly accessed
  request() {
    return Promise.resolve({});
  }
}

module.exports = { mockClient, MockMealieClient };
