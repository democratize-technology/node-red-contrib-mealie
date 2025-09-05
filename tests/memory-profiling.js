#!/usr/bin/env node

/**
 * Memory profiling script to demonstrate improvements
 * Simulates rapid message sequences and monitors memory usage
 */

const nodeStatus = require('../lib/node-status');
const clientWrapper = require('../lib/client-wrapper');
const baseNode = require('../lib/base-node');

// Utility to format bytes to human readable
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get memory usage statistics
function getMemoryStats() {
    const usage = process.memoryUsage();
    return {
        rss: formatBytes(usage.rss),           // Resident Set Size
        heapTotal: formatBytes(usage.heapTotal),
        heapUsed: formatBytes(usage.heapUsed),
        external: formatBytes(usage.external),
        arrayBuffers: formatBytes(usage.arrayBuffers)
    };
}

// Simulate a Node-RED node
class MockNode {
    constructor(id) {
        this.id = id;
        this.statusCalls = 0;
    }
    
    status(obj) {
        this.statusCalls++;
        this.lastStatus = obj;
    }
    
    error(_msg) {
        // Mock error handler
    }
    
    warn(msg) {
        console.warn(`[Node ${this.id}]`, msg);
    }
}

// Test timer management with rapid status updates
async function testTimerManagement() {
    console.log('\n=== Testing Timer Management ===');
    console.log('Memory before test:', getMemoryStats());
    
    const nodes = [];
    const statusUpdateCount = 1000;
    const nodeCount = 50;
    
    // Create multiple nodes
    for (let i = 0; i < nodeCount; i++) {
        // PERFORMANCE-CRITICAL: Using .push() in test loop to avoid spread operation overhead
        nodes.push(new MockNode(`node_${i}`));
    }
    
    console.log(`Created ${nodeCount} mock nodes`);
    
    // Simulate rapid status updates
    console.log(`Performing ${statusUpdateCount} rapid status updates per node...`);
    const startTime = Date.now();
    
    for (let i = 0; i < statusUpdateCount; i++) {
        for (const node of nodes) {
            // Rapid status updates - this would previously accumulate timers
            nodeStatus.setSuccessStatus(node, `operation_${i % 10}`, 100);
            
            // Occasionally set error status
            if (i % 5 === 0) {
                nodeStatus.setErrorStatus(node, `Error ${i}`, 100);
            }
        }
        
        // Allow some timers to fire
        if (i % 100 === 0) {
            await new Promise(resolve => setTimeout(resolve, 110));
        }
    }
    
    const duration = Date.now() - startTime;
    console.log(`Completed in ${duration}ms`);
    
    // Check timer statistics
    const timerStats = nodeStatus.getTimerStats();
    console.log('Active timers:', timerStats.activeTimers);
    console.log('Memory after rapid updates:', getMemoryStats());
    
    // Clear all nodes
    for (const node of nodes) {
        nodeStatus.clearStatus(node);
    }
    
    // Final cleanup
    nodeStatus.clearAllTimers();
    console.log('Active timers after cleanup:', nodeStatus.getTimerStats().activeTimers);
    console.log('Memory after cleanup:', getMemoryStats());
    
    return {
        nodeCount,
        statusUpdateCount,
        duration,
        finalActiveTimers: nodeStatus.getTimerStats().activeTimers
    };
}

// Test client cache with LRU eviction
async function testClientCache() {
    console.log('\n=== Testing Client Cache Management ===');
    console.log('Memory before test:', getMemoryStats());
    
    // Simulate many config nodes
    const configCount = 100;
    const configs = [];
    
    for (let i = 0; i < configCount; i++) {
        // PERFORMANCE-CRITICAL: Using .push() in test loop to avoid spread operation overhead
        configs.push({
            id: `config_${i}`,
            getMealieClient: async () => ({
                id: `client_${i}`,
                data: Buffer.alloc(1024 * 10) // 10KB per client
            })
        });
    }
    
    console.log(`Created ${configCount} mock configs`);
    
    // Access clients in a pattern that tests LRU
    console.log('Accessing clients to test LRU eviction...');
    for (let round = 0; round < 3; round++) {
        for (let i = 0; i < configCount; i++) {
            await clientWrapper.getClient(configs[i]);
            
            // Access some clients more frequently (hot clients)
            if (i < 10) {
                await clientWrapper.getClient(configs[i]);
            }
        }
    }
    
    // Get cache statistics
    const cacheStats = clientWrapper.getCacheStats();
    console.log('Cache statistics:', {
        currentSize: cacheStats.currentSize,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        evictions: cacheStats.evictions,
        hitRate: (cacheStats.hitRate * 100).toFixed(2) + '%'
    });
    
    console.log('Memory after cache operations:', getMemoryStats());
    
    // Cleanup
    clientWrapper.cleanup();
    console.log('Memory after cleanup:', getMemoryStats());
    
    return cacheStats;
}

// Test node lifecycle management
async function testNodeLifecycle() {
    console.log('\n=== Testing Node Lifecycle Management ===');
    console.log('Memory before test:', getMemoryStats());
    
    // Simulate creating and destroying nodes
    const cycleCount = 100;
    const nodesPerCycle = 10;
    
    console.log(`Running ${cycleCount} create/destroy cycles with ${nodesPerCycle} nodes each...`);
    
    for (let cycle = 0; cycle < cycleCount; cycle++) {
        // Create nodes
        const nodes = [];
        for (let i = 0; i < nodesPerCycle; i++) {
            const node = new MockNode(`cycle_${cycle}_node_${i}`);
            // PERFORMANCE-CRITICAL: Using .push() in test loop to avoid spread operation overhead
            nodes.push(node);
            
            // Simulate some activity
            nodeStatus.setSuccessStatus(node, 'test', 50);
        }
        
        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Clean up nodes
        for (const node of nodes) {
            nodeStatus.clearStatus(node);
        }
        
        // Check for memory leaks every 10 cycles
        if ((cycle + 1) % 10 === 0) {
            const activeTimers = nodeStatus.getTimerStats().activeTimers;
            const activeNodes = baseNode._activeNodes.size;
            
            if (activeTimers > nodesPerCycle * 2) {
                console.warn(`Warning: ${activeTimers} timers active after cycle ${cycle + 1}`);
            }
            if (activeNodes > nodesPerCycle * 2) {
                console.warn(`Warning: ${activeNodes} nodes tracked after cycle ${cycle + 1}`);
            }
        }
    }
    
    const finalStats = {
        activeTimers: nodeStatus.getTimerStats().activeTimers,
        trackedNodes: baseNode._activeNodes.size
    };
    
    console.log('Final statistics:', finalStats);
    console.log('Memory after lifecycle test:', getMemoryStats());
    
    // Force garbage collection if available
    if (global.gc) {
        global.gc();
        console.log('Memory after GC:', getMemoryStats());
    }
    
    return finalStats;
}

// Stress test to check for memory leaks
async function stressTest() {
    console.log('\n=== Running Stress Test ===');
    const initialMemory = process.memoryUsage().heapUsed;
    console.log('Initial heap used:', formatBytes(initialMemory));
    
    // Run multiple iterations to detect memory growth
    const iterations = 5;
    const memorySnapshots = [];
    
    for (let i = 0; i < iterations; i++) {
        console.log(`\n--- Iteration ${i + 1}/${iterations} ---`);
        
        // Run all tests
        await testTimerManagement();
        await testClientCache();
        await testNodeLifecycle();
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        
        // Take memory snapshot
        const currentMemory = process.memoryUsage().heapUsed;
        // PERFORMANCE-CRITICAL: Using .push() in test loop to avoid spread operation overhead
        memorySnapshots.push(currentMemory);
        console.log(`Heap after iteration ${i + 1}: ${formatBytes(currentMemory)}`);
        
        // Wait between iterations
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Analyze memory growth
    const memoryGrowth = memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0];
    const avgGrowthPerIteration = memoryGrowth / (iterations - 1);
    
    console.log('\n=== Memory Analysis ===');
    console.log('Memory snapshots:', memorySnapshots.map(formatBytes));
    console.log('Total memory growth:', formatBytes(memoryGrowth));
    console.log('Average growth per iteration:', formatBytes(avgGrowthPerIteration));
    
    if (avgGrowthPerIteration > 1024 * 1024) { // More than 1MB per iteration
        console.warn('⚠️  WARNING: Potential memory leak detected!');
    } else {
        console.log('✅ Memory usage appears stable');
    }
    
    return {
        initialMemory,
        finalMemory: memorySnapshots[memorySnapshots.length - 1],
        totalGrowth: memoryGrowth,
        avgGrowthPerIteration
    };
}

// Main execution
async function main() {
    console.log('=== Mealie Node-RED Memory Profiling ===');
    console.log('Node version:', process.version);
    console.log('Platform:', process.platform);
    console.log('Architecture:', process.arch);
    
    try {
        // Run individual tests
        const timerResults = await testTimerManagement();
        const cacheResults = await testClientCache();
        const lifecycleResults = await testNodeLifecycle();
        
        // Run stress test
        const stressResults = await stressTest();
        
        // Summary
        console.log('\n=== SUMMARY ===');
        console.log('Timer Management:', {
            'Nodes tested': timerResults.nodeCount,
            'Status updates': timerResults.statusUpdateCount,
            'Duration': `${timerResults.duration}ms`,
            'Leaked timers': timerResults.finalActiveTimers
        });
        
        console.log('Cache Management:', {
            'Hit rate': (cacheResults.hitRate * 100).toFixed(2) + '%',
            'Evictions': cacheResults.evictions,
            'Final size': cacheResults.currentSize
        });
        
        console.log('Node Lifecycle:', {
            'Leaked timers': lifecycleResults.activeTimers,
            'Leaked nodes': lifecycleResults.trackedNodes
        });
        
        console.log('Memory Stability:', {
            'Total growth': formatBytes(stressResults.totalGrowth),
            'Avg per iteration': formatBytes(stressResults.avgGrowthPerIteration),
            'Status': stressResults.avgGrowthPerIteration > 1024 * 1024 ? '⚠️ LEAK DETECTED' : '✅ STABLE'
        });
        
    } catch (error) {
        console.error('Error during profiling:', error);
        process.exit(1);
    } finally {
        // Final cleanup
        nodeStatus.clearAllTimers();
        clientWrapper.cleanup();
    }
}

// Run with garbage collection exposed for better analysis
// Usage: node --expose-gc tests/memory-profiling.js
if (require.main === module) {
    main().then(() => {
        console.log('\n✅ Memory profiling completed successfully');
        process.exit(0);
    }).catch(err => {
        console.error('❌ Memory profiling failed:', err);
        process.exit(1);
    });
}