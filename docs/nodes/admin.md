# Admin Domain Node (mealie-admin)

The Admin domain node provides access to Mealie server administration functions, allowing you to manage users, groups, perform server maintenance, and retrieve server information.

## Node Configuration

- **Name**: Optional name for the node instance
- **Server**: Reference to the Mealie server configuration node
- **Operation**: The operation to perform (can be overridden via msg.payload.operation)
- **User ID**: User ID for user-related operations (can be overridden via msg.payload.userId)
- **Group ID**: Group ID for group-related operations (can be overridden via msg.payload.groupId)
- **Backup ID**: Backup ID for backup operations (can be overridden via msg.payload.backupId)
- **User Data**: JSON data for user creation or update (can be overridden via msg.payload.userData)
- **Group Data**: JSON data for group creation or update (can be overridden via msg.payload.groupData)
- **Task Name**: Maintenance task name (can be overridden via msg.payload.taskName)

## Supported Operations

### Server Information

#### Get Server Info (`getInfo`)

Retrieves basic server information.

**Parameters**: None required

**Example Input**:
```json
{
    "operation": "getInfo"
}
```

**Example Output**:
```json
{
    "success": true,
    "operation": "getInfo",
    "data": {
        "version": "1.0.0",
        "productionMode": true,
        "demoStatus": false,
        "apiPort": 9000,
        "apiDocs": "/docs",
        "allowSignup": false
    }
}
```

#### Get Server Statistics (`getStatistics`)

Retrieves server usage statistics.

**Parameters**: None required

**Example Input**:
```json
{
    "operation": "getStatistics"
}
```

**Example Output**:
```json
{
    "success": true,
    "operation": "getStatistics",
    "data": {
        "totalRecipes": 250,
        "totalUsers": 10,
        "totalGroups": 3,
        "totalCategories": 15,
        "totalTags": 42,
        "totalShoppingLists": 8
    }
}
```

### User Management

#### Get Users (`getUsers`)

Retrieves all users or a specific user if userId is provided.

**Parameters**:

| Parameter | Type   | Required | Description                           |
|-----------|--------|----------|---------------------------------------|
| userId    | string | No       | Optional ID of user to retrieve       |

**Example Input (All Users)**:
```json
{
    "operation": "getUsers"
}
```

**Example Input (Specific User)**:
```json
{
    "operation": "getUsers",
    "userId": "user-uuid"
}
```

**Example Output**:
```json
{
    "success": true,
    "operation": "getUsers",
    "data": [
        {
            "id": "user-uuid-1",
            "username": "admin",
            "fullName": "Administrator",
            "email": "admin@example.com",
            "admin": true,
            "groupId": "group-uuid"
        },
        {
            "id": "user-uuid-2",
            "username": "user",
            "fullName": "Regular User",
            "email": "user@example.com",
            "admin": false,
            "groupId": "group-uuid"
        }
    ]
}
```

#### Create User (`createUser`)

Creates a new user.

**Parameters**:

| Parameter | Type   | Required | Description                  |
|-----------|--------|----------|------------------------------|
| userData  | object | Yes      | User data for the new user   |

**Example Input**:
```json
{
    "operation": "createUser",
    "userData": {
        "username": "newuser",
        "fullName": "New User",
        "email": "newuser@example.com",
        "password": "securepassword",
        "admin": false,
        "groupId": "group-uuid"
    }
}
```

**Example Output**:
```json
{
    "success": true,
    "operation": "createUser",
    "data": {
        "id": "new-user-uuid",
        "username": "newuser",
        "fullName": "New User",
        "email": "newuser@example.com",
        "admin": false,
        "groupId": "group-uuid"
    }
}
```

#### Update User (`updateUser`)

Updates an existing user.

**Parameters**:

| Parameter | Type   | Required | Description                  |
|-----------|--------|----------|------------------------------|
| userId    | string | Yes      | ID of the user to update     |
| userData  | object | Yes      | Updated user data            |

**Example Input**:
```json
{
    "operation": "updateUser",
    "userId": "user-uuid",
    "userData": {
        "fullName": "Updated Name",
        "admin": true
    }
}
```

**Example Output**:
```json
{
    "success": true,
    "operation": "updateUser",
    "data": {
        "id": "user-uuid",
        "username": "user",
        "fullName": "Updated Name",
        "email": "user@example.com",
        "admin": true,
        "groupId": "group-uuid"
    }
}
```

#### Delete User (`deleteUser`)

Deletes a user.

**Parameters**:

| Parameter | Type   | Required | Description                  |
|-----------|--------|----------|------------------------------|
| userId    | string | Yes      | ID of the user to delete     |

**Example Input**:
```json
{
    "operation": "deleteUser",
    "userId": "user-uuid"
}
```

**Example Output**:
```json
{
    "success": true,
    "operation": "deleteUser",
    "data": {
        "success": true
    }
}
```

### Group Management

#### Get Groups (`getGroups`)

Retrieves all groups or a specific group if groupId is provided.

**Parameters**:

| Parameter | Type   | Required | Description                           |
|-----------|--------|----------|---------------------------------------|
| groupId   | string | No       | Optional ID of group to retrieve      |

**Example Input (All Groups)**:
```json
{
    "operation": "getGroups"
}
```

**Example Input (Specific Group)**:
```json
{
    "operation": "getGroups",
    "groupId": "group-uuid"
}
```

**Example Output**:
```json
{
    "success": true,
    "operation": "getGroups",
    "data": [
        {
            "id": "group-uuid-1",
            "name": "Family",
            "preferences": {
                "privateGroup": false,
                "firstDayOfWeek": 0
            }
        },
        {
            "id": "group-uuid-2",
            "name": "Friends",
            "preferences": {
                "privateGroup": true,
                "firstDayOfWeek": 1
            }
        }
    ]
}
```

#### Create Group (`createGroup`)

Creates a new group.

**Parameters**:

| Parameter | Type   | Required | Description                  |
|-----------|--------|----------|------------------------------|
| groupData | object | Yes      | Group data for the new group |

**Example Input**:
```json
{
    "operation": "createGroup",
    "groupData": {
        "name": "New Group",
        "preferences": {
            "privateGroup": false,
            "firstDayOfWeek": 0
        }
    }
}
```

**Example Output**:
```json
{
    "success": true,
    "operation": "createGroup",
    "data": {
        "id": "new-group-uuid",
        "name": "New Group",
        "preferences": {
            "privateGroup": false,
            "firstDayOfWeek": 0
        }
    }
}
```

#### Update Group (`updateGroup`)

Updates an existing group.

**Parameters**:

| Parameter | Type   | Required | Description                  |
|-----------|--------|----------|------------------------------|
| groupId   | string | Yes      | ID of the group to update    |
| groupData | object | Yes      | Updated group data           |

**Example Input**:
```json
{
    "operation": "updateGroup",
    "groupId": "group-uuid",
    "groupData": {
        "name": "Updated Group Name",
        "preferences": {
            "privateGroup": true
        }
    }
}
```

**Example Output**:
```json
{
    "success": true,
    "operation": "updateGroup",
    "data": {
        "id": "group-uuid",
        "name": "Updated Group Name",
        "preferences": {
            "privateGroup": true,
            "firstDayOfWeek": 0
        }
    }
}
```

#### Delete Group (`deleteGroup`)

Deletes a group.

**Parameters**:

| Parameter | Type   | Required | Description                  |
|-----------|--------|----------|------------------------------|
| groupId   | string | Yes      | ID of the group to delete    |

**Example Input**:
```json
{
    "operation": "deleteGroup",
    "groupId": "group-uuid"
}
```

**Example Output**:
```json
{
    "success": true,
    "operation": "deleteGroup",
    "data": {
        "success": true
    }
}
```

### Backup Management

#### Get Backups (`getBackups`)

Retrieves all available backups.

**Parameters**: None required

**Example Input**:
```json
{
    "operation": "getBackups"
}
```

**Example Output**:
```json
{
    "success": true,
    "operation": "getBackups",
    "data": [
        {
            "id": "backup-uuid-1",
            "name": "backup-2025-04-01.zip",
            "createdAt": "2025-04-01T12:00:00Z",
            "size": 1024000,
            "tags": ["automated"]
        },
        {
            "id": "backup-uuid-2",
            "name": "backup-2025-04-15.zip",
            "createdAt": "2025-04-15T12:00:00Z",
            "size": 1048576,
            "tags": ["pre-update"]
        }
    ]
}
```

#### Create Backup (`createBackup`)

Creates a new server backup.

**Parameters**:

| Parameter | Type   | Required | Description                         |
|-----------|--------|----------|-------------------------------------|
| tag       | string | No       | Optional tag for the backup         |

**Example Input**:
```json
{
    "operation": "createBackup",
    "tag": "manual-backup"
}
```

**Example Output**:
```json
{
    "success": true,
    "operation": "createBackup",
    "data": {
        "id": "new-backup-uuid",
        "name": "backup-2025-04-29.zip",
        "createdAt": "2025-04-29T15:30:00Z",
        "size": 1048576,
        "tags": ["manual-backup"]
    }
}
```

#### Restore Backup (`restoreBackup`)

Restores the server from a backup.

**Parameters**:

| Parameter | Type   | Required | Description                    |
|-----------|--------|----------|--------------------------------|
| backupId  | string | Yes      | ID of the backup to restore    |

**Example Input**:
```json
{
    "operation": "restoreBackup",
    "backupId": "backup-uuid"
}
```

**Example Output**:
```json
{
    "success": true,
    "operation": "restoreBackup",
    "data": {
        "success": true,
        "message": "Restore completed successfully"
    }
}
```

#### Delete Backup (`deleteBackup`)

Deletes a backup.

**Parameters**:

| Parameter | Type   | Required | Description                  |
|-----------|--------|----------|------------------------------|
| backupId  | string | Yes      | ID of the backup to delete   |

**Example Input**:
```json
{
    "operation": "deleteBackup",
    "backupId": "backup-uuid"
}
```

**Example Output**:
```json
{
    "success": true,
    "operation": "deleteBackup",
    "data": {
        "success": true
    }
}
```

### Maintenance

#### Run Maintenance Task (`runMaintenance`)

Runs a server maintenance task.

**Parameters**:

| Parameter | Type   | Required | Description                    |
|-----------|--------|----------|--------------------------------|
| taskName  | string | Yes      | Name of the maintenance task   |

Available maintenance tasks:
- `cleanup_images`: Remove unused recipe images
- `cleanup_assets`: Remove unused recipe assets
- `cleanup_tokens`: Remove expired authentication tokens
- `vacuum_database`: Optimize database storage
- `check_integrity`: Check database integrity

**Example Input**:
```json
{
    "operation": "runMaintenance",
    "taskName": "cleanup_images"
}
```

**Example Output**:
```json
{
    "success": true,
    "operation": "runMaintenance",
    "data": {
        "taskName": "cleanup_images",
        "status": "completed",
        "details": {
            "imagesRemoved": 15,
            "spaceFreed": "24MB"
        }
    }
}
```

## Error Handling

The node outputs errors on the second output port with the following format:

```json
{
    "success": false,
    "operation": "operationName",
    "error": {
        "code": "ERROR_CODE",
        "message": "Human-readable error message",
        "details": {
            // Additional error context if available
        }
    }
}
```

Common error codes for admin operations:

- `MISSING_PARAMETER`: A required parameter is missing
- `USER_NOT_FOUND`: The requested user could not be found
- `GROUP_NOT_FOUND`: The requested group could not be found
- `BACKUP_NOT_FOUND`: The requested backup could not be found
- `INVALID_USER_DATA`: The user data is invalid
- `INVALID_GROUP_DATA`: The group data is invalid
- `INVALID_TASK`: The maintenance task name is invalid
- `PERMISSION_DENIED`: The API key doesn't have admin permissions
- `NETWORK_ERROR`: Failed to connect to the Mealie server
- `AUTHENTICATION_ERROR`: Invalid API key

## Flow Examples

### Server Information Dashboard

```
[inject: trigger hourly] → [mealie-admin: operation=getInfo] → [function: extract info] → [dashboard]
```

### User Management

```
[inject: list users] → [mealie-admin: operation=getUsers] → [function: format user list] → [ui_table]
```

### Backup Management

```
[inject: create backup] → [function: set tag] → [mealie-admin: operation=createBackup] → [debug]
```

### Maintenance Schedule

```
[inject: weekly schedule] → [function: rotate tasks] → [mealie-admin: operation=runMaintenance] → [debug]
```

## Best Practices

1. **Admin Permissions**: Ensure the API key used has administrator permissions
2. **Error Handling**: Always connect to the error output for proper handling of failures
3. **User Creation**: When creating users, generate secure passwords or implement password reset flow
4. **Backup Naming**: Use descriptive tags for backups to identify their purpose
5. **Maintenance Planning**: Schedule maintenance tasks during low-usage periods
6. **Backup Before Changes**: Create a backup before making administrative changes
7. **User Data Privacy**: Be careful with user data, especially when exposing it in dashboards