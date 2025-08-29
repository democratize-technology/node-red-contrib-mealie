/**
 * Node status utility for consistent status handling across all Mealie nodes
 * Enhanced with proper timer tracking to prevent memory leaks
 */

// Track all active timers to prevent memory leaks
// Key: node.id, Value: { timerId, operation, timestamp }
const activeTimers = new Map();

/**
 * Clear existing timer for a node if it exists
 * @param {string} nodeId - The node ID
 * @returns {boolean} True if a timer was cleared
 */
function clearExistingTimer(nodeId) {
    const timerInfo = activeTimers.get(nodeId);
    if (timerInfo && timerInfo.timerId) {
        clearTimeout(timerInfo.timerId);
        activeTimers.delete(nodeId);
        return true;
    }
    return false;
}

/**
 * Set node status with automatic clearing after timeout
 * Enhanced with proper timer tracking and race condition prevention
 * @param {object} node - The Node-RED node instance
 * @param {boolean} success - Whether the operation was successful
 * @param {string} message - The status message to display
 * @param {number} timeout - Timeout in milliseconds before clearing status (default: 5000)
 * @returns {number} Timer ID that can be used to clear the timeout
 */
function setNodeStatus(node, success, message, timeout = 5000) {
    // Ensure node has an ID for tracking
    const nodeId = node.id || node._id || `node_${Date.now()}_${Math.random()}`;
    
    // Clear any existing timer for this node (prevents accumulation)
    clearExistingTimer(nodeId);
    
    // Set the status
    if (success) {
        node.status({fill: 'green', shape: 'dot', text: message});
    } else {
        node.status({fill: 'red', shape: 'dot', text: message});
    }

    // Create new timer and track it
    const timerId = setTimeout(() => {
        node.status({});
        // Clean up from tracking map when timer fires
        activeTimers.delete(nodeId);
    }, timeout);

    // Store timer info for tracking
    activeTimers.set(nodeId, {
        timerId,
        operation: message,
        timestamp: Date.now()
    });

    return timerId;
}

/**
 * Set success status for a node operation
 * @param {object} node - The Node-RED node instance
 * @param {string} operation - The operation name
 * @param {number} timeout - Timeout in milliseconds before clearing status (default: 5000)
 * @returns {number} Timer ID that can be used to clear the timeout
 */
function setSuccessStatus(node, operation, timeout = 5000) {
    return setNodeStatus(node, true, operation + ' success', timeout);
}

/**
 * Set error status for a node operation
 * @param {object} node - The Node-RED node instance
 * @param {string} errorMessage - The error message to display
 * @param {number} timeout - Timeout in milliseconds before clearing status (default: 5000)
 * @returns {number} Timer ID that can be used to clear the timeout
 */
function setErrorStatus(node, errorMessage, timeout = 5000) {
    return setNodeStatus(node, false, errorMessage, timeout);
}

/**
 * Clear node status immediately
 * @param {object} node - The Node-RED node instance
 */
function clearStatus(node) {
    // Clear any active timer for this node
    const nodeId = node.id || node._id;
    if (nodeId) {
        clearExistingTimer(nodeId);
    }
    node.status({});
}

/**
 * Clear status timer and optionally clear status immediately
 * Enhanced to work with timer tracking system
 * @param {number} timerId - The timer ID to clear (deprecated, kept for backward compatibility)
 * @param {object} node - The Node-RED node instance (optional)
 * @param {boolean} clearImmediate - Whether to clear status immediately (default: false)
 */
function clearStatusTimer(timerId, node = null, clearImmediate = false) {
    // Handle legacy timer ID parameter
    if (timerId && !node) {
        clearTimeout(timerId);
        return;
    }
    
    // If node provided, use new tracking system
    if (node) {
        const nodeId = node.id || node._id;
        if (nodeId) {
            clearExistingTimer(nodeId);
        }
        
        if (clearImmediate) {
            clearStatus(node);
        }
    } else if (timerId) {
        // Fallback for legacy usage
        clearTimeout(timerId);
    }
}

/**
 * Clear all active timers (useful for cleanup on shutdown)
 * @returns {number} Number of timers cleared
 */
function clearAllTimers() {
    let count = 0;
    for (const [, timerInfo] of activeTimers.entries()) {
        if (timerInfo && timerInfo.timerId) {
            clearTimeout(timerInfo.timerId);
            count++;
        }
    }
    activeTimers.clear();
    return count;
}

/**
 * Get statistics about active timers (for monitoring)
 * @returns {object} Timer statistics
 */
function getTimerStats() {
    const now = Date.now();
    const stats = {
        activeTimers: activeTimers.size,
        timers: []
    };
    
    for (const [nodeId, timerInfo] of activeTimers.entries()) {
        stats.timers.push({
            nodeId,
            operation: timerInfo.operation,
            age: now - timerInfo.timestamp
        });
    }
    
    return stats;
}

// Register cleanup with centralized shutdown manager
const shutdownManager = require('./shutdown-manager');

if (process.env.NODE_ENV !== 'test') {
    shutdownManager.register(clearAllTimers, 'node-status');
}

module.exports = {
    setNodeStatus,
    setSuccessStatus,
    setErrorStatus,
    clearStatus,
    clearStatusTimer,
    clearAllTimers,
    getTimerStats,
    // Export for testing purposes
    _activeTimers: activeTimers
};