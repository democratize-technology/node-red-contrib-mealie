/**
 * Node status utility for consistent status handling across all Mealie nodes
 */

/**
 * Set node status with automatic clearing after timeout
 * @param {object} node - The Node-RED node instance
 * @param {boolean} success - Whether the operation was successful
 * @param {string} message - The status message to display
 * @param {number} timeout - Timeout in milliseconds before clearing status (default: 5000)
 * @returns {number} Timer ID that can be used to clear the timeout
 */
function setNodeStatus(node, success, message, timeout = 5000) {
    if (success) {
        node.status({fill: 'green', shape: 'dot', text: message});
    } else {
        node.status({fill: 'red', shape: 'dot', text: message});
    }

    // Clear status after timeout and return timer ID
    return setTimeout(() => {
        node.status({});
    }, timeout);
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
    node.status({});
}

/**
 * Clear status timer and optionally clear status immediately
 * @param {number} timerId - The timer ID to clear
 * @param {object} node - The Node-RED node instance (optional)
 * @param {boolean} clearImmediate - Whether to clear status immediately (default: false)
 */
function clearStatusTimer(timerId, node = null, clearImmediate = false) {
    if (timerId) {
        clearTimeout(timerId);
    }
    if (clearImmediate && node) {
        clearStatus(node);
    }
}

module.exports = {
    setNodeStatus,
    setSuccessStatus,
    setErrorStatus,
    clearStatus,
    clearStatusTimer
};