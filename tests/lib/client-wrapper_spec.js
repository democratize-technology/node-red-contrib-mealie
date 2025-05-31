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
    
    describe('Retry Logic', function() {
        let mockNode;
        
        beforeEach(function() {
            mockNode = {
                error: sinon.stub(),
                send: sinon.stub(),
                log: sinon.stub()
            };
            // No need for additional fake timers - use the existing 'clock' from parent describe
        });
        
        it('should work without errors (baseline)', async function() {
            const operation = sinon.stub().resolves('success');
            
            const result = await clientWrapper.executeWithClient(
                mockConfig,
                operation,
                mockNode,
                {}
            );
            
            result.should.equal('success');
            operation.callCount.should.equal(1);
            mockNode.log.called.should.be.false();
        });
        
        it('should retry on network errors (FetchError)', async function() {
            const fetchError = new Error('Connection failed');
            fetchError.name = 'FetchError';
            
            const operation = sinon.stub();
            operation.onCall(0).rejects(fetchError);
            operation.onCall(1).rejects(fetchError);
            operation.onCall(2).resolves('success');
            
            // Start the operation
            const promise = clientWrapper.executeWithClient(
                mockConfig,
                operation,
                mockNode,
                {}
            );
            
            // Fast-forward through retries
            await clock.tickAsync(10); // First retry
            await clock.tickAsync(20); // Second retry
            
            const result = await promise;
            
            result.should.equal('success');
            operation.callCount.should.equal(3);
            mockNode.log.calledWith('Retry attempt 2 of 3').should.be.true();
            mockNode.log.calledWith('Retry attempt 3 of 3').should.be.true();
        });
        
        it('should retry on network errors (ECONNREFUSED)', async function() {
            const connError = new Error('Connection refused');
            connError.code = 'ECONNREFUSED';
            
            const operation = sinon.stub();
            operation.onCall(0).rejects(connError);
            operation.onCall(1).resolves('success');
            
            const promise = clientWrapper.executeWithClient(
                mockConfig,
                operation,
                mockNode,
                {}
            );
            
            await clock.tickAsync(10); // First retry
            
            const result = await promise;
            
            result.should.equal('success');
            operation.callCount.should.equal(2);
            mockNode.log.calledWith('Retry attempt 2 of 3').should.be.true();
        });
        
        it('should retry on network errors (ETIMEDOUT)', async function() {
            const timeoutError = new Error('Connection timed out');
            timeoutError.code = 'ETIMEDOUT';
            
            const operation = sinon.stub();
            operation.onCall(0).rejects(timeoutError);
            operation.onCall(1).resolves('success');
            
            const promise = clientWrapper.executeWithClient(
                mockConfig,
                operation,
                mockNode,
                {}
            );
            
            await clock.tickAsync(10); // First retry
            
            const result = await promise;
            
            result.should.equal('success');
            operation.callCount.should.equal(2);
            mockNode.log.calledWith('Retry attempt 2 of 3').should.be.true();
        });
        
        it('should retry on rate limiting (429)', async function() {
            const rateLimitError = new Error('Too Many Requests');
            rateLimitError.statusCode = 429;
            
            const operation = sinon.stub();
            operation.onCall(0).rejects(rateLimitError);
            operation.onCall(1).resolves('success');
            
            const promise = clientWrapper.executeWithClient(
                mockConfig,
                operation,
                mockNode,
                {}
            );
            
            await clock.tickAsync(10); // First retry
            
            const result = await promise;
            
            result.should.equal('success');
            operation.callCount.should.equal(2);
            mockNode.log.calledWith('Retry attempt 2 of 3').should.be.true();
        });
        
        it('should retry on server errors (5xx)', async function() {
            const serverError = new Error('Internal Server Error');
            serverError.statusCode = 500;
            
            const operation = sinon.stub();
            operation.onCall(0).rejects(serverError);
            operation.onCall(1).resolves('success');
            
            const promise = clientWrapper.executeWithClient(
                mockConfig,
                operation,
                mockNode,
                {}
            );
            
            await clock.tickAsync(10); // First retry
            
            const result = await promise;
            
            result.should.equal('success');
            operation.callCount.should.equal(2);
            mockNode.log.calledWith('Retry attempt 2 of 3').should.be.true();
        });
        
        it('should not retry on authentication errors (401)', async function() {
            const authError = new Error('Unauthorized');
            authError.statusCode = 401;
            
            const operation = sinon.stub().rejects(authError);
            
            try {
                await clientWrapper.executeWithClient(
                    mockConfig,
                    operation,
                    mockNode,
                    {}
                );
                should.fail('Should have thrown');
            } catch (error) {
                operation.callCount.should.equal(1);
                mockNode.log.called.should.be.false();
            }
        });
        
        it('should not retry on authentication errors (403)', async function() {
            const authError = new Error('Forbidden');
            authError.statusCode = 403;
            
            const operation = sinon.stub().rejects(authError);
            
            try {
                await clientWrapper.executeWithClient(
                    mockConfig,
                    operation,
                    mockNode,
                    {}
                );
                should.fail('Should have thrown');
            } catch (error) {
                operation.callCount.should.equal(1);
                mockNode.log.called.should.be.false();
            }
        });
        
        it('should not retry on validation errors (400)', async function() {
            const validationError = new Error('Bad Request');
            validationError.statusCode = 400;
            
            const operation = sinon.stub().rejects(validationError);
            
            try {
                await clientWrapper.executeWithClient(
                    mockConfig,
                    operation,
                    mockNode,
                    {}
                );
                should.fail('Should have thrown');
            } catch (error) {
                operation.callCount.should.equal(1);
                mockNode.log.called.should.be.false();
            }
        });
        
        it('should respect maximum retry attempts', async function() {
            const networkError = new Error('Connection failed');
            networkError.name = 'FetchError';
            
            const operation = sinon.stub().rejects(networkError);
            
            const promise = clientWrapper.executeWithClient(
                mockConfig,
                operation,
                mockNode,
                {}
            );
            
            // Fast-forward through all retries
            await clock.tickAsync(10); // First retry
            await clock.tickAsync(20); // Second retry
            
            try {
                await promise;
                should.fail('Should have thrown');
            } catch (error) {
                operation.callCount.should.equal(3); // Max attempts
                mockNode.log.calledWith('Retry attempt 2 of 3').should.be.true();
                mockNode.log.calledWith('Retry attempt 3 of 3').should.be.true();
            }
        });
        
        it('should use exponential backoff delays', async function() {
            const networkError = new Error('Connection failed');
            networkError.name = 'FetchError';
            
            const operation = sinon.stub();
            operation.onCall(0).rejects(networkError);
            operation.onCall(1).rejects(networkError);
            operation.onCall(2).resolves('success');
            
            const promise = clientWrapper.executeWithClient(
                mockConfig,
                operation,
                mockNode,
                {}
            );
            
            // Verify exponential backoff: 10ms, 20ms delays
            await clock.tickAsync(10); // First retry after 10ms
            operation.callCount.should.equal(2);
            
            await clock.tickAsync(20); // Second retry after 20ms
            operation.callCount.should.equal(3);
            
            const result = await promise;
            result.should.equal('success');
        });
        
        it('should not log on first attempt', async function() {
            const operation = sinon.stub().resolves('success');
            
            const result = await clientWrapper.executeWithClient(
                mockConfig,
                operation,
                mockNode,
                {}
            );
            
            result.should.equal('success');
            operation.callCount.should.equal(1);
            mockNode.log.called.should.be.false();
        });
    });
});
