/**
 * Mock server config node for testing
 */

const { mockClient } = require('./mock-client');

// Create a mock version of the config node
function createMockConfigNode(RED) {
    function MockMealieServerConfigNode(config) {
        this.name = config.name || 'Mock Mealie Server';
        this.url = config.url || 'http://localhost:9000';
        this.timeout = config.timeout || 5000;
        this.apiToken = 'test-token'; // Always provide a token for testing

        // Always return the mock client
        this.getMealieClient = async function() {
            return mockClient;
        };
    }

    // Register the mock type
    RED.nodes.registerType('mealie-server-config', MockMealieServerConfigNode, {
        credentials: {
            apiToken: { type: 'password' },
        },
    });

    return MockMealieServerConfigNode;
}

module.exports = {
    createMockConfigNode
};
