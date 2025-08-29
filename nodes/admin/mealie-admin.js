/**
 * Admin domain node for Mealie API
 * Handles multiple admin operations in a single configurable node
 */

const { executeWithClient } = require('../../lib/client-wrapper');
const { ValidationError } = require('../../lib/errors');
const { createMealieNode } = require('../../lib/base-node');

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
    const userData = msg.payload?.userData || node.userData;

    if (!userData) {
        throw new ValidationError('No user data provided for createUser operation. Specify in node config or msg.payload.userData');
    }

    // Parse the user data if it's a string
    const parsedUserData = typeof userData === 'string' ? JSON.parse(userData) : userData;

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.admin.createUser(parsedUserData);
        },
        node,
        msg
    );
}

// Helper for updateUser operation
async function handleUpdateUserOperation(node, msg) {
    const userId = msg.payload?.userId || node.userId;
    const userData = msg.payload?.userData || node.userData;

    if (!userId) {
        throw new ValidationError('No user ID provided for updateUser operation. Specify in node config or msg.payload.userId');
    }

    if (!userData) {
        throw new ValidationError('No user data provided for updateUser operation. Specify in node config or msg.payload.userData');
    }

    // Parse the user data if it's a string
    const parsedUserData = typeof userData === 'string' ? JSON.parse(userData) : userData;

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.admin.updateUser(userId, parsedUserData);
        },
        node,
        msg
    );
}

// Helper for deleteUser operation
async function handleDeleteUserOperation(node, msg) {
    const userId = msg.payload?.userId || node.userId;

    if (!userId) {
        throw new ValidationError('No user ID provided for deleteUser operation. Specify in node config or msg.payload.userId');
    }

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
    const groupData = msg.payload?.groupData || node.groupData;

    if (!groupData) {
        throw new ValidationError('No group data provided for createGroup operation. Specify in node config or msg.payload.groupData');
    }

    // Parse the group data if it's a string
    const parsedGroupData = typeof groupData === 'string' ? JSON.parse(groupData) : groupData;

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.admin.createGroup(parsedGroupData);
        },
        node,
        msg
    );
}

// Helper for updateGroup operation
async function handleUpdateGroupOperation(node, msg) {
    const groupId = msg.payload?.groupId || node.groupId;
    const groupData = msg.payload?.groupData || node.groupData;

    if (!groupId) {
        throw new ValidationError('No group ID provided for updateGroup operation. Specify in node config or msg.payload.groupId');
    }

    if (!groupData) {
        throw new ValidationError('No group data provided for updateGroup operation. Specify in node config or msg.payload.groupData');
    }

    // Parse the group data if it's a string
    const parsedGroupData = typeof groupData === 'string' ? JSON.parse(groupData) : groupData;

    return await executeWithClient(
        node.config,
        async (client) => {
            return await client.admin.updateGroup(groupId, parsedGroupData);
        },
        node,
        msg
    );
}

// Helper for deleteGroup operation
async function handleDeleteGroupOperation(node, msg) {
    const groupId = msg.payload?.groupId || node.groupId;

    if (!groupId) {
        throw new ValidationError('No group ID provided for deleteGroup operation. Specify in node config or msg.payload.groupId');
    }

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
    const backupId = msg.payload?.backupId || node.backupId;

    if (!backupId) {
        throw new ValidationError('No backup ID provided for restoreBackup operation. Specify in node config or msg.payload.backupId');
    }

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
    const backupId = msg.payload?.backupId || node.backupId;

    if (!backupId) {
        throw new ValidationError('No backup ID provided for deleteBackup operation. Specify in node config or msg.payload.backupId');
    }

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
    const taskName = msg.payload?.taskName || node.taskName;

    if (!taskName) {
        throw new ValidationError('No task name provided for runMaintenance operation. Specify in node config or msg.payload.taskName');
    }

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