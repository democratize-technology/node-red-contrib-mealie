/**
 * Admin domain node for Mealie API
 * Handles multiple admin operations in a single configurable node
 */

const { executeWithClient } = require('../../lib/client-wrapper');
const { ValidationError } = require('../../lib/errors');
const { setSuccessStatus, setErrorStatus, clearStatusTimer } = require('../../lib/node-status');

module.exports = function(RED) {
    function MealieAdminNode(config) {
        RED.nodes.createNode(this, config);

        // Copy config properties to node
        this.name = config.name;
        this.server = config.server;
        this.operation = config.operation;
        this.userId = config.userId;
        this.groupId = config.groupId;
        this.backupId = config.backupId;
        this.userData = config.userData;
        this.groupData = config.groupData;
        this.taskName = config.taskName;
        this.config = RED.nodes.getNode(this.server);

        const node = this;
        let statusTimer;

        // Handle input message
        node.on('input', async function(msg, send, done) {
            // Ensure backward compatibility with Node-RED < 1.0
            send = send || function() { node.send.apply(node, arguments); };
            done = done || function(error) { if (error) { node.error(error, msg); } };

            try {
                // Determine operation (from config or payload)
                const operation = msg.payload?.operation || node.operation;

                if (!operation) {
                    throw new ValidationError('No operation specified. Set in node config or msg.payload.operation');
                }

                // Execute the appropriate operation
                let result;

                switch (operation) {
                case 'getInfo':
                    result = await handleGetInfoOperation(node, msg);
                    break;
                case 'getUsers':
                    result = await handleGetUsersOperation(node, msg);
                    break;
                case 'createUser':
                    result = await handleCreateUserOperation(node, msg);
                    break;
                case 'updateUser':
                    result = await handleUpdateUserOperation(node, msg);
                    break;
                case 'deleteUser':
                    result = await handleDeleteUserOperation(node, msg);
                    break;
                case 'getGroups':
                    result = await handleGetGroupsOperation(node, msg);
                    break;
                case 'createGroup':
                    result = await handleCreateGroupOperation(node, msg);
                    break;
                case 'updateGroup':
                    result = await handleUpdateGroupOperation(node, msg);
                    break;
                case 'deleteGroup':
                    result = await handleDeleteGroupOperation(node, msg);
                    break;
                case 'getBackups':
                    result = await handleGetBackupsOperation(node, msg);
                    break;
                case 'createBackup':
                    result = await handleCreateBackupOperation(node, msg);
                    break;
                case 'restoreBackup':
                    result = await handleRestoreBackupOperation(node, msg);
                    break;
                case 'deleteBackup':
                    result = await handleDeleteBackupOperation(node, msg);
                    break;
                case 'runMaintenance':
                    result = await handleRunMaintenanceOperation(node, msg);
                    break;
                default:
                    throw new ValidationError(`Unsupported operation: ${operation}`);
                }

                // Send successful result
                msg.payload = {
                    success: true,
                    operation: operation,
                    data: result
                };

                // Set node status to show success
                clearStatusTimer(statusTimer);
                statusTimer = setSuccessStatus(node, operation);

                // Use single output pattern
                send(msg);
                done();
            } catch (error) {
                // Create standardized error response
                msg.payload = {
                    success: false,
                    operation: msg.payload?.operation || node.operation,
                    error: {
                        message: error.message,
                        code: error.code || 'UNKNOWN_ERROR',
                        details: error.details || null
                    }
                };

                // Set node status to show error
                clearStatusTimer(statusTimer);
                statusTimer = setErrorStatus(node, error.message);

                // Log error to runtime
                node.error(error.message, msg);

                // Send error message on the same output
                send(msg);
                done(error);
            }
        });

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

        // Clean up timer on node close
        node.on('close', function() {
            clearStatusTimer(statusTimer);
        });
    }

    RED.nodes.registerType('mealie-admin', MealieAdminNode);
};