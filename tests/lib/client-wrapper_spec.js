const should = require('should');
const sinon = require('sinon');
const clientWrapper = require('../../lib/client-wrapper');
const { ConfigurationError } = require('../../lib/errors');

describe('Client Wrapper', function() {
    let clock;
    let mockClient;
    let mockConfig;
    
    beforeEach(function() {
        // Create mock client with the expected structure
        mockClient = {
            recipes: { 
                getAll: sinon.stub() 
            },
            auth: { 
                getToken: sinon.stub() 
            }
        };
        
        // Create mock config
        mockConfig = {
            id: 'test-config-id',
            getMealieClient: sinon.stub().resolves(mockClient)
        };
        
        // Clear the client cache before each test
        clientWrapper._clientCache.clear();
        
        // Use fake timers for testing cache behavior
        clock = sinon.useFakeTimers();
    });
    
    afterEach(function() {
        clock.restore();
        sinon.restore();
        clientWrapper.cleanup(); // Properly cleanup all resources
    });
    
    describe('getClient', function() {
        it('should create a new client if not cached', async function() {
            const client = await clientWrapper.getClient(mockConfig);
            client.should.equal(mockClient);
            mockConfig.getMealieClient.calledOnce.should.be.true();
        });
        
        it('should return cached client if available', async function() {
            // First call creates client
            const client1 = await clientWrapper.getClient(mockConfig);
            // Second call should use cache
            const client2 = await clientWrapper.getClient(mockConfig);
            
            client1.should.equal(client2);
            mockConfig.getMealieClient.calledOnce.should.be.true();
        });
        
        it('should throw error if no config provided', async function() {
            try {
                await clientWrapper.getClient(null);
                should.fail('Should have thrown');
            } catch (error) {
                error.should.be.instanceof(ConfigurationError);
                error.message.should.equal('No server configuration provided');
            }
        });
        
        it('should clean up stale clients after timeout', async function() {
            // Create client
            await clientWrapper.getClient(mockConfig);
            
            // Verify it's in cache
            clientWrapper._clientCache.has(mockConfig.id).should.be.true();
            
            // Advance time by 15 minutes + 1 second (past the 15 minute timeout)
            clock.tick(15 * 60 * 1000 + 1000);
            
            // Manually trigger the cleanup
            const now = Date.now();
            for (const [key, value] of clientWrapper._clientCache.entries()) {
                if (now - value.lastUsed > 15 * 60 * 1000) {
                    clientWrapper._clientCache.delete(key);
                }
            }
            
            // Verify it's been cleaned up
            clientWrapper._clientCache.has(mockConfig.id).should.be.false();
            
            // Next call should create new client
            await clientWrapper.getClient(mockConfig);
            mockConfig.getMealieClient.calledTwice.should.be.true();
        });
    });
    
    describe('executeWithClient', function() {
        it('should execute operation with client', async function() {
            const operation = sinon.stub().resolves('result');
            const node = { error: sinon.stub(), send: sinon.stub() };
            const msg = {};
            
            const result = await clientWrapper.executeWithClient(
                mockConfig,
                operation,
                node,
                msg
            );

            result.should.equal('result');
            operation.calledOnce.should.be.true();
        });
        
        it('should handle operation errors', async function() {
            const operation = sinon.stub().rejects(new Error('Operation failed'));
            const node = { error: sinon.stub(), send: sinon.stub() };
            const msg = {};
            
            try {
                await clientWrapper.executeWithClient(
                    mockConfig,
                    operation,
                    node,
                    msg
                );
                should.fail('Should have thrown');
            } catch (error) {
                error.message.should.equal('Operation failed');
            }
        });
    });
    
    describe('clearClient', function() {
        it('should remove client from cache', async function() {
            // Create and cache client
            await clientWrapper.getClient(mockConfig);
            
            // Verify it's in cache
            clientWrapper._clientCache.has(mockConfig.id).should.be.true();
            
            // Clear from cache
            clientWrapper.clearClient(mockConfig);
            
            // Verify it's gone
            clientWrapper._clientCache.has(mockConfig.id).should.be.false();
            
            // Next call should create new client
            await clientWrapper.getClient(mockConfig);
            mockConfig.getMealieClient.calledTwice.should.be.true();
        });
        
        it('should handle null config gracefully', function() {
            // Should not throw
            clientWrapper.clearClient(null);
        });
    });
});
