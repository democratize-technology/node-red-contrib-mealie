/**
 * Mock for node-mealie module
 *
 * This file provides a complete mock implementation of the node-mealie module
 * for use with proxyquire in tests.
 */

const { mockClient, MockMealieClient } = require('./mock-client');

// Mock service classes
class RecipeService {
    constructor(_client) {
        Object.assign(this, mockClient.recipes);
    }
}

class HouseholdsService {
    constructor(_client) {
        Object.assign(this, mockClient.households);
    }
}

class AboutService {
    constructor(_client) {
        Object.assign(this, mockClient.about);
    }
}

class GroupsService {
    constructor(_client) {
        Object.assign(this, mockClient.groups);
    }
}

class OrganizerService {
    constructor(_client) {
        Object.assign(this, mockClient.organizers);
    }
}

class UserService {
    constructor(_client) {
        Object.assign(this, mockClient.users);
    }
}

class MediaService {
    constructor(_client) {
        Object.assign(this, mockClient.media);
    }
}

class AdminService {
    constructor(_client) {
        Object.assign(this, mockClient.admin);
    }
}

// Export the module mock
module.exports = {
    MealieClient: MockMealieClient,
    RecipeService,
    HouseholdsService,
    AboutService,
    GroupsService,
    OrganizerService,
    UserService,
    MediaService,
    AdminService
};
