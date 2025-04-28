const should = require('should');
const helper = require('node-red-node-test-helper');
const configNode = require('../../nodes/config/mealie-server-config');
const sinon = require('sinon');

describe('mealie-server-config Node', function() {
    
    beforeEach(function(done) {
        helper.startServer(done);
    });
    
    afterEach(function(done) {
        helper.unload();
        helper.stopServer(done);
        sinon.restore();
    });
    
    it('should be loaded', function(done) {
        const flow = [{ 
            id: 'n1', 
            type: 'mealie-server-config', 
            name: 'Test Config',
            url: 'https://mealie.test.com'
        }];
        
        helper.load(configNode, flow, function() {
            const n1 = helper.getNode('n1');
            n1.should.have.property('name', 'Test Config');
            n1.should.have.property('url', 'https://mealie.test.com');
            done();
        });
    });
    
    it('should store credentials securely', function(done) {
        const flow = [{ 
            id: 'n1', 
            type: 'mealie-server-config', 
            name: 'Test Config'
        }];
        
        const credentials = {
            n1: {
                apiToken: 'test-token-123'
            }
        };
        
        helper.load(configNode, flow, credentials, function() {
            const n1 = helper.getNode('n1');
            should.exist(n1.credentials);
            n1.credentials.should.have.property('apiToken', 'test-token-123');
            done();
        });
    });
    
    it('should create authenticated Mealie client', function(done) {
        // Mock the MealieClient and services
        const mockClient = {
            login: sinon.stub().resolves()
        };
        
        // Create mock service classes
        class RecipeService { constructor() {} }
        class HouseholdsService { constructor() {} }
        class AboutService { constructor() {} }
        class GroupsService { constructor() {} }
        class OrganizerService { constructor() {} }
        class UserService { constructor() {} }
        class MediaService { constructor() {} }
        class AdminService { constructor() {} }
        
        // Create mock Mealie module
        const mockImport = async () => ({
            MealieClient: function(options) {
                this.options = options;
                this.login = mockClient.login;
                return this;
            },
            RecipeService,
            HouseholdsService,
            AboutService,
            GroupsService,
            OrganizerService, 
            UserService,
            MediaService,
            AdminService
        });
        
        const flow = [{ 
            id: 'n1', 
            type: 'mealie-server-config', 
            url: 'https://mealie.test.com',
            timeout: 3000
        }];
        
        const credentials = {
            n1: {
                apiToken: 'test-token-123'
            }
        };
        
        helper.load(configNode, flow, credentials, function() {
            const n1 = helper.getNode('n1');
            n1.dynamicImport = mockImport; // Override import for testing
            
            n1.getMealieClient()
                .then(client => {
                    // Verify the client
                    should.exist(client);
                    // Verify client was created with correct options
                    client.options.should.have.property('baseUrl', 'https://mealie.test.com');
                    client.options.should.have.property('timeout', 3000);
                    client.options.should.have.property('token', 'test-token-123');
                    
                    // Verify services are attached
                    client.should.have.property('recipes');
                    client.should.have.property('households');
                    client.should.have.property('about');
                    client.should.have.property('groups');
                    client.should.have.property('organizers');
                    client.should.have.property('users');
                    client.should.have.property('media');
                    client.should.have.property('admin');
                    done();
                })
                .catch(done);
        });
    });
    
    it('should handle missing credentials', function(done) {
        const flow = [{ 
            id: 'n1', 
            type: 'mealie-server-config', 
            url: 'https://mealie.test.com'
        }];
        
        helper.load(configNode, flow, function() {
            const n1 = helper.getNode('n1');
            
            n1.getMealieClient()
                .then(() => {
                    done(new Error('Should have thrown an error'));
                })
                .catch(error => {
                    error.message.should.equal('Missing Mealie server URL or API token');
                    done();
                });
        });
    });
    
    it('should handle connection errors', function(done) {
        // Mock the import function that fails
        class RecipeService { constructor() { throw new Error('Connection failed'); } }
        
        const mockImport = async () => ({
            MealieClient: function() {
                return this;
            },
            RecipeService
        });
        
        const flow = [{ 
            id: 'n1', 
            type: 'mealie-server-config', 
            url: 'https://mealie.test.com'
        }];
        
        const credentials = {
            n1: {
                apiToken: 'test-token-123'
            }
        };
        
        helper.load(configNode, flow, credentials, function() {
            const n1 = helper.getNode('n1');
            n1.dynamicImport = mockImport; // Override import for testing
            
            n1.getMealieClient()
                .then(() => {
                    done(new Error('Should have thrown an error'));
                })
                .catch(error => {
                    error.message.should.equal('Failed to connect to Mealie: Connection failed');
                    done();
                });
        });
    });
});
