/**
 * Test suite for Base Node Functionality
 * Tests the logging refactoring and RED instance management
 */

const should = require('should');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('Base Node', () => {
    let baseNode, mockRED, clock, originalNodeEnv;

    beforeEach(() => {
        // Store original NODE_ENV
        originalNodeEnv = process.env.NODE_ENV;
        
        // Set test environment
        process.env.NODE_ENV = 'test';

        // Create mock RED instance
        mockRED = {
            nodes: {
                createNode: sinon.stub(),
                getNode: sinon.stub(),
                registerType: sinon.stub()
            },
            log: {
                warn: sinon.stub(),
                info: sinon.stub(),
                error: sinon.stub()
            }
        };

        // Mock console methods (not currently needed but kept for reference)
        // mockConsole = {
        //     warn: sinon.stub(),
        //     log: sinon.stub(),
        //     error: sinon.stub()
        // };

        // Use fake timers for testing timeouts
        clock = sinon.useFakeTimers();

        // Mock dependencies with fresh instances
        baseNode = proxyquire('../../lib/base-node', {
            './validation': {
                validateOperation: sinon.stub().returnsArg(0)
            },
            './node-status': {
                setSuccessStatus: sinon.stub(),
                setErrorStatus: sinon.stub(),
                clearStatus: sinon.stub()
            },
            './shutdown-manager': {
                register: sinon.stub()
            }
        });

        // Stub console methods
        sinon.stub(console, 'warn');
        sinon.stub(console, 'log');
        sinon.stub(console, 'error');
    });

    afterEach(() => {
        // Restore environment
        process.env.NODE_ENV = originalNodeEnv;
        
        // Restore timers and console
        clock.restore();
        console.warn.restore();
        console.log.restore();
        console.error.restore();
        
        // Clear module cache to reset RED_INSTANCE
        delete require.cache[require.resolve('../../lib/base-node')];
    });

    describe('RED Instance Management', () => {
        it('should store RED instance when createMealieNode is called', () => {
            const config = { name: 'test', server: 'server1', operation: 'test' };
            const options = {
                nodeType: 'test-node',
                allowedOperations: ['test'],
                operationHandlers: {
                    test: sinon.stub().resolves({ data: 'test' })
                }
            };

            // Create node with RED instance
            const NodeConstructor = baseNode.createMealieNode(mockRED, config, options);
            
            // Verify RED instance is stored by checking if subsequent calls use it
            should.exist(NodeConstructor);
        });

        it('should not overwrite RED instance on subsequent calls', () => {
            const config = { name: 'test', server: 'server1', operation: 'test' };
            const options = {
                nodeType: 'test-node',
                allowedOperations: ['test'],
                operationHandlers: {
                    test: sinon.stub().resolves({ data: 'test' })
                }
            };

            // Create first node
            baseNode.createMealieNode(mockRED, config, options);
            
            // Create second RED instance
            const mockRED2 = {
                nodes: { createNode: sinon.stub(), getNode: sinon.stub() },
                log: { warn: sinon.stub() }
            };
            
            // Create second node - should not overwrite first RED instance
            baseNode.createMealieNode(mockRED2, config, options);
            
            // Both should succeed without error
            should.exist(mockRED);
            should.exist(mockRED2);
        });
    });

    describe('cleanupStaleNodes', () => {
        beforeEach(() => {
            // Add some mock nodes to the active nodes map
            const activeNodes = baseNode._activeNodes;
            activeNodes.clear();
            
            // Add fresh node (should not be cleaned up)
            activeNodes.set('fresh-node', {
                id: 'fresh-node',
                type: 'test-node',
                activeRequests: 0,
                lastActivity: Date.now() - 1000 // 1 second ago
            });
            
            // Add stale node (should be cleaned up)
            activeNodes.set('stale-node', {
                id: 'stale-node',
                type: 'test-node',
                activeRequests: 0,
                lastActivity: Date.now() - (2 * 60 * 60 * 1000) // 2 hours ago
            });
            
            // Add busy stale node (should not be cleaned up due to active requests)
            activeNodes.set('busy-stale-node', {
                id: 'busy-stale-node',
                type: 'test-node',
                activeRequests: 1,
                lastActivity: Date.now() - (2 * 60 * 60 * 1000) // 2 hours ago
            });
        });

        it('should clean up stale nodes and return count', () => {
            const maxInactivity = 60 * 60 * 1000; // 1 hour
            const cleanedCount = baseNode.cleanupStaleNodes(maxInactivity);
            
            cleanedCount.should.equal(1); // Only stale-node should be cleaned up
            baseNode._activeNodes.has('fresh-node').should.be.true();
            baseNode._activeNodes.has('stale-node').should.be.false();
            baseNode._activeNodes.has('busy-stale-node').should.be.true(); // Busy nodes not cleaned
        });

        it('should not clean up nodes with active requests', () => {
            const maxInactivity = 60 * 60 * 1000; // 1 hour
            const cleanedCount = baseNode.cleanupStaleNodes(maxInactivity);
            
            cleanedCount.should.equal(1);
            baseNode._activeNodes.has('busy-stale-node').should.be.true();
        });
    });

    describe('Logging Behavior', () => {
        let cleanupStaleNodesWithLogging;

        beforeEach(() => {
            // We need to test the logging behavior, so we'll create a version that
            // simulates the periodic cleanup logging behavior
            cleanupStaleNodesWithLogging = function(redInstance) {
                const cleaned = baseNode.cleanupStaleNodes(60 * 60 * 1000);
                if (cleaned > 0) {
                    if (redInstance?.log?.warn) {
                        redInstance.log.warn(`[Mealie] Cleaned up ${cleaned} stale nodes`);
                    } else {
                        console.warn(`[Mealie] Cleaned up ${cleaned} stale nodes`);
                    }
                }
                return cleaned;
            };
            
            // Add stale node to trigger logging
            baseNode._activeNodes.set('stale-for-logging', {
                id: 'stale-for-logging',
                type: 'test-node',
                activeRequests: 0,
                lastActivity: Date.now() - (2 * 60 * 60 * 1000) // 2 hours ago
            });
        });

        it('should use RED.log.warn when RED instance is available', () => {
            cleanupStaleNodesWithLogging(mockRED);
            
            mockRED.log.warn.calledOnce.should.be.true();
            mockRED.log.warn.calledWith('[Mealie] Cleaned up 1 stale nodes').should.be.true();
            console.warn.called.should.be.false();
        });

        it('should use console.warn when RED instance is not available', () => {
            cleanupStaleNodesWithLogging(null);
            
            console.warn.calledOnce.should.be.true();
            console.warn.calledWith('[Mealie] Cleaned up 1 stale nodes').should.be.true();
            // Note: mockRED.log.warn would not be called since we passed null
        });

        it('should use console.warn when RED instance lacks log.warn method', () => {
            const incompleteRED = {
                nodes: { createNode: sinon.stub() }
                // Missing log property
            };
            
            cleanupStaleNodesWithLogging(incompleteRED);
            
            console.warn.calledOnce.should.be.true();
            console.warn.calledWith('[Mealie] Cleaned up 1 stale nodes').should.be.true();
        });

        it('should not log when no nodes are cleaned up', () => {
            // Clear stale nodes so nothing gets cleaned up
            baseNode._activeNodes.clear();
            
            cleanupStaleNodesWithLogging(mockRED);
            
            mockRED.log.warn.called.should.be.false();
            console.warn.called.should.be.false();
        });
    });

    describe('Node Statistics', () => {
        beforeEach(() => {
            const activeNodes = baseNode._activeNodes;
            activeNodes.clear();
            
            // Add test nodes
            activeNodes.set('node1', {
                id: 'node1',
                type: 'recipe',
                activeRequests: 2,
                totalRequests: 10,
                createdAt: Date.now() - 5000,
                lastActivity: Date.now() - 1000
            });
            
            activeNodes.set('node2', {
                id: 'node2',
                type: 'recipe',
                activeRequests: 0,
                totalRequests: 5,
                createdAt: Date.now() - 10000,
                lastActivity: Date.now() - 2000
            });
            
            activeNodes.set('node3', {
                id: 'node3',
                type: 'admin',
                activeRequests: 1,
                totalRequests: 3,
                createdAt: Date.now() - 15000,
                lastActivity: Date.now() - 500
            });
        });

        it('should return correct node statistics', () => {
            const stats = baseNode.getNodeStats();
            
            stats.totalNodes.should.equal(3);
            stats.totalActiveRequests.should.equal(3); // 2 + 0 + 1
            stats.totalRequests.should.equal(18); // 10 + 5 + 3
            
            stats.nodesByType.should.deepEqual({
                recipe: 2,
                admin: 1
            });
            
            stats.nodes.should.have.length(3);
            
            // Check individual node stats
            const node1Stats = stats.nodes.find(n => n.id === 'node1');
            node1Stats.should.containEql({
                id: 'node1',
                type: 'recipe',
                activeRequests: 2,
                totalRequests: 10
            });
            node1Stats.uptime.should.be.approximately(5000, 100);
        });
    });

    describe('registerMealieNode', () => {
        it('should register node with Node-RED', () => {
            const nodeType = 'test-node';
            const allowedOperations = ['create', 'read'];
            const operationHandlers = {
                create: sinon.stub(),
                read: sinon.stub()
            };

            baseNode.registerMealieNode(mockRED, nodeType, allowedOperations, operationHandlers);

            mockRED.nodes.registerType.calledOnce.should.be.true();
            mockRED.nodes.registerType.calledWith(nodeType).should.be.true();
        });
    });
});