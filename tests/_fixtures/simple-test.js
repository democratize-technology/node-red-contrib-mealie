/**
 * Simple test script that directly checks if the mock client is working
 */

const { mockClient } = require('./mock-client');

async function runSimpleTest() {
    try {
        console.log('Testing mock client...');

        // Test getRecipe
        const recipe = await mockClient.recipes.getRecipe('test-recipe');
        console.log('getRecipe result:', recipe);

        // Test getAllRecipes
        const recipes = await mockClient.recipes.getAllRecipes();
        console.log('getAllRecipes result:', recipes);

        // Test createRecipe
        const newRecipe = await mockClient.recipes.createRecipe({ name: 'New Recipe' });
        console.log('createRecipe result:', newRecipe);

        // Test updateRecipe
        const updatedRecipe = await mockClient.recipes.updateRecipe('test-recipe', { name: 'Updated Recipe' });
        console.log('updateRecipe result:', updatedRecipe);

        // Test deleteRecipe
        const deleteResult = await mockClient.recipes.deleteRecipe('test-recipe');
        console.log('deleteRecipe result:', deleteResult);

        console.log('All tests passed!');
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the tests
runSimpleTest();
