/**
 * Mock client for Mealie API
 */
const sinon = require('sinon');

// Create mock client for all services
const mockClient = {
    // Recipe service
    recipes: {
        getRecipe: sinon.stub().resolves({ id: '123', name: 'Test Recipe', slug: 'test-recipe' }),
        getAllRecipes: sinon.stub().resolves([{ id: '123', name: 'Test Recipe', slug: 'test-recipe' }]),
        createRecipe: sinon.stub().resolves({ id: '123', name: 'New Recipe', slug: 'new-recipe' }),
        updateRecipe: sinon.stub().resolves({ id: '123', name: 'Updated Recipe', slug: 'test-recipe' }),
        deleteRecipe: sinon.stub().resolves({ success: true }),
        getRecipeImage: sinon.stub().resolves({ url: 'http://example.com/image.jpg' }),
        uploadRecipeImage: sinon.stub().resolves({ success: true }),
        getRecipeAssets: sinon.stub().resolves([{ name: 'asset.pdf', id: 'asset-123' }]),
        getRecipeAsset: sinon.stub().resolves({ name: 'asset.pdf', id: 'asset-123', content: 'asset-data' }),
        uploadRecipeAsset: sinon.stub().resolves({ id: 'asset-123', name: 'asset.pdf' }),
        deleteRecipeAsset: sinon.stub().resolves({ success: true }),
    },
    // Household service
    households: {
        getHousehold: sinon.stub().resolves({ id: '456', name: 'Test Household' }),
        getAllHouseholds: sinon.stub().resolves([{ id: '456', name: 'Test Household' }]),
        getHouseholdMembers: sinon.stub().resolves([{ id: 'user-123', name: 'Test User' }]),
        getHouseholdPreferences: sinon.stub().resolves({ id: '456', notificationTime: '08:00' }),
        updateHouseholdPreferences: sinon.stub().resolves({ id: '456', notificationTime: '09:00' }),
    },
    // Shopping list service
    shoppingLists: {
        getShoppingList: sinon.stub().resolves({ id: '789', name: 'Test Shopping List' }),
        getAllShoppingLists: sinon.stub().resolves([{ id: '789', name: 'Test Shopping List' }]),
        createShoppingList: sinon.stub().resolves({ id: '789', name: 'New Shopping List' }),
        updateShoppingList: sinon.stub().resolves({ id: '789', name: 'Updated Shopping List' }),
        deleteShoppingList: sinon.stub().resolves({ success: true }),
        getShoppingListItems: sinon.stub().resolves([{ id: 'item-123', name: 'Test Item' }]),
        createShoppingListItem: sinon.stub().resolves({ id: 'item-123', name: 'New Item' }),
        addRecipeToShoppingList: sinon.stub().resolves({ success: true }),
    },
    // Organizer service
    organizers: {
        getCategory: sinon.stub().resolves({ id: 'cat-123', name: 'Test Category' }),
        getAllCategories: sinon.stub().resolves([{ id: 'cat-123', name: 'Test Category' }]),
        getTag: sinon.stub().resolves({ id: 'tag-123', name: 'Test Tag' }),
        getAllTags: sinon.stub().resolves([{ id: 'tag-123', name: 'Test Tag' }]),
        getCookbook: sinon.stub().resolves({ id: 'cb-123', name: 'Test Cookbook' }),
        getAllCookbooks: sinon.stub().resolves([{ id: 'cb-123', name: 'Test Cookbook' }]),
        createCookbook: sinon.stub().resolves({ id: 'cb-123', name: 'New Cookbook' }),
    },
    // Meal planning service  
    mealPlans: {
        getMealPlan: sinon.stub().resolves({ id: 'mp-123', date: '2025-01-01' }),
        getAllMealPlans: sinon.stub().resolves([{ id: 'mp-123', date: '2025-01-01' }]),
        createMealPlan: sinon.stub().resolves({ id: 'mp-123', date: '2025-01-01' }),
        updateMealPlan: sinon.stub().resolves({ id: 'mp-123', date: '2025-01-01' }),
        deleteMealPlan: sinon.stub().resolves({ success: true }),
    },
    // Admin service
    admin: {
        getServerInfo: sinon.stub().resolves({ version: '1.0.0', production: true }),
        getUser: sinon.stub().resolves({ id: 'user-123', name: 'Test User' }),
        getAllUsers: sinon.stub().resolves([{ id: 'user-123', name: 'Test User' }]),
        createUser: sinon.stub().resolves({ id: 'user-123', name: 'New User' }),
        updateUser: sinon.stub().resolves({ id: 'user-123', name: 'Updated User' }),
        deleteUser: sinon.stub().resolves({ success: true }),
        getGroup: sinon.stub().resolves({ id: 'group-123', name: 'Test Group' }),
        getAllGroups: sinon.stub().resolves([{ id: 'group-123', name: 'Test Group' }]),
        createGroup: sinon.stub().resolves({ id: 'group-123', name: 'New Group' }),
        updateGroup: sinon.stub().resolves({ id: 'group-123', name: 'Updated Group' }),
        deleteGroup: sinon.stub().resolves({ success: true }),
        getBackups: sinon.stub().resolves([{ id: 'backup-123', name: 'Test Backup' }]),
        createBackup: sinon.stub().resolves({ id: 'backup-123', name: 'New Backup' }),
        restoreBackup: sinon.stub().resolves({ success: true }),
        deleteBackup: sinon.stub().resolves({ success: true }),
        runMaintenanceTask: sinon.stub().resolves({ success: true, taskName: 'test-task' }),
    },
    // Parser service
    parser: {
        parseUrl: sinon.stub().resolves({ recipe: { name: 'Parsed Recipe' } }),
        parseIngredientText: sinon.stub().resolves([{ name: 'Ingredient', amount: 1, unit: 'cup' }]),
    },
    // Utility service
    utilities: {
        getSchema: sinon.stub().resolves({ components: {}, paths: {} }),
        getVersion: sinon.stub().resolves({ version: '1.0.0' }),
    },
    // Bulk operations service
    bulk: {
        exportRecipes: sinon.stub().resolves({ recipes: [{ id: '123', name: 'Test Recipe' }] }),
        importRecipesFromUrls: sinon.stub().resolves({ imported: 1, failed: 0 }),
        importRecipes: sinon.stub().resolves({ imported: 1, failed: 0 }),
    },
};

// Add backward compatibility aliases for test files that use singular names
mockClient.household = mockClient.households;
mockClient.shopping = mockClient.shoppingLists; 
mockClient.planning = mockClient.mealPlans;

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

    // Expose all services through the client
    get recipes() { return mockClient.recipes; }
    get households() { return mockClient.households; }
    get shoppingLists() { return mockClient.shoppingLists; }
    get organizers() { return mockClient.organizers; }
    get mealPlans() { return mockClient.mealPlans; }
    get admin() { return mockClient.admin; }
    get parser() { return mockClient.parser; }
    get utilities() { return mockClient.utilities; }
    get bulk() { return mockClient.bulk; }
    
    // Backward compatibility aliases for tests that use singular names
    get household() { return this.households; }
    get shopping() { return this.shoppingLists; }
    get planning() { return this.mealPlans; }
}

module.exports = { mockClient, MockMealieClient };
