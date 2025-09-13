/**
 * Admin domain node for Mealie API
 * Handles multiple admin operations in a single configurable node
 */

const { executeWithClient } = require('../../lib/client-wrapper');
const { createMealieNode } = require('../../lib/base-node');
const { getAndValidateParameter } = require('../../lib/validation');

// Helper for getInfo operation
async function handleGetInfoOperation(node, msg) {
    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.admin.getServerInfo();
        },
        node,
        msg
    );
}

// Helper for getUsers operation
async function handleGetUsersOperation(node, msg) {
    const userId = msg.payload?.userId || node.userId;

    return await executeWithClient(
        node.config,
        async (client) => {
            if (userId) {
                return await client.admin.getUser(userId);
            } else {
                return await client.admin.getAllUsers();
            }
        },
        node,
        msg
    );
}

// Helper for createUser operation
async function handleCreateUserOperation(node, msg) {
    const userData = getAndValidateParameter(node, msg, 'userData', { required: true, jsonParse: true, context: 'user data for createUser operation' });

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.admin.createUser(userData);
        },
        node,
        msg
    );
}

// Helper for updateUser operation
async function handleUpdateUserOperation(node, msg) {
    const userId = getAndValidateParameter(node, msg, 'userId', { required: true, context: 'user ID for updateUser operation' });
    const userData = getAndValidateParameter(node, msg, 'userData', { required: true, jsonParse: true, context: 'user data for updateUser operation' });

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.admin.updateUser(userId, userData);
        },
        node,
        msg
    );
}

// Helper for deleteUser operation
async function handleDeleteUserOperation(node, msg) {
    const userId = getAndValidateParameter(node, msg, 'userId', { required: true, context: 'user ID for deleteUser operation' });

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.admin.deleteUser(userId);
        },
        node,
        msg
    );
}

// Helper for getGroups operation
async function handleGetGroupsOperation(node, msg) {
    const groupId = msg.payload?.groupId || node.groupId;

    return await executeWithClient(
        node.config,
        async (client) => {
            if (groupId) {
                return await client.admin.getGroup(groupId);
            } else {
                return await client.admin.getAllGroups();
            }
        },
        node,
        msg
    );
}

// Helper for createGroup operation
async function handleCreateGroupOperation(node, msg) {
    const groupData = getAndValidateParameter(node, msg, 'groupData', { required: true, jsonParse: true, context: 'group data for createGroup operation' });

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.admin.createGroup(groupData);
        },
        node,
        msg
    );
}

// Helper for updateGroup operation
async function handleUpdateGroupOperation(node, msg) {
    const groupId = getAndValidateParameter(node, msg, 'groupId', { required: true, context: 'group ID for updateGroup operation' });
    const groupData = getAndValidateParameter(node, msg, 'groupData', { required: true, jsonParse: true, context: 'group data for updateGroup operation' });

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.admin.updateGroup(groupId, groupData);
        },
        node,
        msg
    );
}

// Helper for deleteGroup operation
async function handleDeleteGroupOperation(node, msg) {
    const groupId = getAndValidateParameter(node, msg, 'groupId', { required: true, context: 'group ID for deleteGroup operation' });

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.admin.deleteGroup(groupId);
        },
        node,
        msg
    );
}

// Helper for getBackups operation
async function handleGetBackupsOperation(node, msg) {
    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.admin.getBackups();
        },
        node,
        msg
    );
}

// Helper for createBackup operation
async function handleCreateBackupOperation(node, msg) {
    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.admin.createBackup();
        },
        node,
        msg
    );
}

// Helper for restoreBackup operation
async function handleRestoreBackupOperation(node, msg) {
    const backupId = getAndValidateParameter(node, msg, 'backupId', { required: true, context: 'backup ID for restoreBackup operation' });

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.admin.restoreBackup(backupId);
        },
        node,
        msg
    );
}

// Helper for deleteBackup operation
async function handleDeleteBackupOperation(node, msg) {
    const backupId = getAndValidateParameter(node, msg, 'backupId', { required: true, context: 'backup ID for deleteBackup operation' });

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.admin.deleteBackup(backupId);
        },
        node,
        msg
    );
}

// Helper for runMaintenance operation
async function handleRunMaintenanceOperation(node, msg) {
    const taskName = getAndValidateParameter(node, msg, 'taskName', { required: true, context: 'task name for runMaintenance operation' });

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.admin.runMaintenanceTask(taskName);
        },
        node,
        msg
    );
}

// Define allowed operations for admin node
const ALLOWED_OPERATIONS = [
    'getInfo', 'getUsers', 'createUser', 'updateUser', 'deleteUser',
    'getGroups', 'createGroup', 'updateGroup', 'deleteGroup',
    'getBackups', 'createBackup', 'restoreBackup', 'deleteBackup', 'runMaintenance'
];

// Define operation handlers
const OPERATION_HANDLERS = {
    getInfo: handleGetInfoOperation,
    getUsers: handleGetUsersOperation,
    createUser: handleCreateUserOperation,
    updateUser: handleUpdateUserOperation,
    deleteUser: handleDeleteUserOperation,
    getGroups: handleGetGroupsOperation,
    createGroup: handleCreateGroupOperation,
    updateGroup: handleUpdateGroupOperation,
    deleteGroup: handleDeleteGroupOperation,
    getBackups: handleGetBackupsOperation,
    createBackup: handleCreateBackupOperation,
    restoreBackup: handleRestoreBackupOperation,
    deleteBackup: handleDeleteBackupOperation,
    runMaintenance: handleRunMaintenanceOperation
};

module.exports = function(RED) {
    // Create the node using the base handler
    const MealieAdminNode = createMealieNode(RED, null, {
        nodeType: 'mealie-admin',
        allowedOperations: ALLOWED_OPERATIONS,
        operationHandlers: OPERATION_HANDLERS
    });

    RED.nodes.registerType('mealie-admin', MealieAdminNode);
};