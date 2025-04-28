# Household Domain Node (mealie-household)

The Household domain node handles operations related to household management in Mealie, allowing you to retrieve and update household information, manage members, and configure household preferences.

## Node Configuration

- **Name**: Optional name for the node instance
- **Server**: Reference to the Mealie server configuration node
- **Operation**: The operation to perform (can be overridden via msg.payload.operation)
- **Household ID**: ID of the household for operations (can be overridden via msg.payload.householdId)
- **Member ID**: Member ID for member operations (can be overridden via msg.payload.memberId)
- **Preferences Data**: JSON data for preference updates (can be overridden via msg.payload.preferencesData)

## Supported Operations

### Household Management

#### Get Households (`getHouseholds`)

Retrieves all households or a specific household if householdId is provided.

**Parameters**:

| Parameter   | Type   | Required | Description                             |
|-------------|--------|----------|-----------------------------------------|
| householdId | string | No       | Optional ID of household to retrieve    |

**Example Input (All Households)**:
```json
{
    "operation": "getHouseholds"
}
```

**Example Input (Specific Household)**:
```json
{
    "operation": "getHouseholds",
    "householdId": "household-uuid"
}
```

**Example Output**:
```json
{
    "success": true,
    "operation": "getHouseholds",
    "data": [
        {
            "id": "household-uuid-1",
            "name": "Family Kitchen",
            "groupId": "group-uuid-1",
            "createdAt": "2025-01-01T00:00:00Z",
            "updatedAt": "2025-04-01T12:30:45Z"
        },
        {
            "id": "household-uuid-2",
            "name": "Vacation Home",
            "groupId": "group-uuid-1",
            "createdAt": "2025-02-15T00:00:00Z",
            "updatedAt": "2025-04-05T09:12:33Z"
        }
    ]
}
```

### Member Management

#### Get Members (`getMembers`)

Retrieves all members of a household.

**Parameters**:

| Parameter   | Type   | Required | Description                          |
|-------------|--------|----------|--------------------------------------|
| householdId | string | Yes      | ID of the household                  |

**Example Input**:
```json
{
    "operation": "getMembers",
    "householdId": "household-uuid"
}
```

**Example Output**:
```json
{
    "success": true,
    "operation": "getMembers",
    "data": [
        {
            "id": "user-uuid-1",
            "username": "john",
            "fullName": "John Doe",
            "email": "john@example.com",
            "admin": true
        },
        {
            "id": "user-uuid-2",
            "username": "jane",
            "fullName": "Jane Smith",
            "email": "jane@example.com",
            "admin": false
        }
    ]
}
```

#### Get Specific Member (`getMember`)

Retrieves a specific member from a household.

**Parameters**:

| Parameter   | Type   | Required | Description                          |
|-------------|--------|----------|--------------------------------------|
| householdId | string | Yes      | ID of the household                  |
| memberId    | string | Yes      | ID of the member to retrieve         |

**Example Input**:
```json
{
    "operation": "getMember",
    "householdId": "household-uuid",
    "memberId": "user-uuid"
}
```

**Example Output**:
```json
{
    "success": true,
    "operation": "getMember",
    "data": {
        "id": "user-uuid",
        "username": "john",
        "fullName": "John Doe",
        "email": "john@example.com",
        "admin": true
    }
}
```

### Preferences Management

#### Get Preferences (`getPreferences`)

Retrieves the preferences for a household.

**Parameters**:

| Parameter   | Type   | Required | Description                          |
|-------------|--------|----------|--------------------------------------|
| householdId | string | Yes      | ID of the household                  |

**Example Input**:
```json
{
    "operation": "getPreferences",
    "householdId": "household-uuid"
}
```

**Example Output**:
```json
{
    "success": true,
    "operation": "getPreferences",
    "data": {
        "id": "prefs-uuid",
        "householdId": "household-uuid",
        "notificationTime": "18:00",
        "recipePublic": false,
        "recipeLandingType": "all",
        "defaultPageSize": 25,
        "defaultColorMode": "system",
        "firstDayOfWeek": 0,
        "showDisabled": false,
        "experimentalFeatures": false
    }
}
```

#### Update Preferences (`updatePreferences`)

Updates the preferences for a household.

**Parameters**:

| Parameter      | Type   | Required | Description                          |
|----------------|--------|----------|--------------------------------------|
| householdId    | string | Yes      | ID of the household                  |
| preferencesData| object | Yes      | Updated preferences data             |

**Example Input**:
```json
{
    "operation": "updatePreferences",
    "householdId": "household-uuid",
    "preferencesData": {
        "notificationTime": "19:00",
        "defaultColorMode": "dark",
        "firstDayOfWeek": 1
    }
}
```

**Example Output**:
```json
{
    "success": true,
    "operation": "updatePreferences",
    "data": {
        "id": "prefs-uuid",
        "householdId": "household-uuid",
        "notificationTime": "19:00",
        "recipePublic": false,
        "recipeLandingType": "all",
        "defaultPageSize": 25,
        "defaultColorMode": "dark",
        "firstDayOfWeek": 1,
        "showDisabled": false,
        "experimentalFeatures": false
    }
}
```

### Invitations

#### Get Invitations (`getInvitations`)

Retrieves all invitations for a household.

**Parameters**:

| Parameter   | Type   | Required | Description                          |
|-------------|--------|----------|--------------------------------------|
| householdId | string | Yes      | ID of the household                  |

**Example Input**:
```json
{
    "operation": "getInvitations",
    "householdId": "household-uuid"
}
```

**Example Output**:
```json
{
    "success": true,
    "operation": "getInvitations",
    "data": [
        {
            "id": "invitation-uuid-1",
            "email": "newuser@example.com",
            "token": "invitation-token-1",
            "createdAt": "2025-04-20T09:30:00Z",
            "expiresAt": "2025-04-27T09:30:00Z",
            "used": false
        },
        {
            "id": "invitation-uuid-2",
            "email": "anotheruser@example.com",
            "token": "invitation-token-2",
            "createdAt": "2025-04-21T10:15:00Z",
            "expiresAt": "2025-04-28T10:15:00Z",
            "used": true
        }
    ]
}
```

#### Create Invitation (`createInvitation`)

Creates a new invitation for a household.

**Parameters**:

| Parameter   | Type   | Required | Description                            |
|-------------|--------|----------|----------------------------------------|
| householdId | string | Yes      | ID of the household                    |
| email       | string | Yes      | Email address to invite                |
| expiresIn   | number | No       | Expiration time in hours (default: 168)|

**Example Input**:
```json
{
    "operation": "createInvitation",
    "householdId": "household-uuid",
    "email": "newmember@example.com",
    "expiresIn": 48
}
```

**Example Output**:
```json
{
    "success": true,
    "operation": "createInvitation",
    "data": {
        "id": "new-invitation-uuid",
        "email": "newmember@example.com",
        "token": "new-invitation-token",
        "createdAt": "2025-04-29T14:00:00Z",
        "expiresAt": "2025-05-01T14:00:00Z",
        "used": false
    }
}
```

#### Delete Invitation (`deleteInvitation`)

Deletes an invitation.

**Parameters**:

| Parameter     | Type   | Required | Description                          |
|---------------|--------|----------|--------------------------------------|
| householdId   | string | Yes      | ID of the household                  |
| invitationId  | string | Yes      | ID of the invitation to delete       |

**Example Input**:
```json
{
    "operation": "deleteInvitation",
    "householdId": "household-uuid",
    "invitationId": "invitation-uuid"
}
```

**Example Output**:
```json
{
    "success": true,
    "operation": "deleteInvitation",
    "data": {
        "success": true
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

Common error codes for household operations:

- `MISSING_PARAMETER`: A required parameter is missing
- `HOUSEHOLD_NOT_FOUND`: The requested household could not be found
- `MEMBER_NOT_FOUND`: The requested member could not be found
- `INVITATION_NOT_FOUND`: The requested invitation could not be found
- `INVALID_PREFERENCES`: The preference data is invalid
- `PERMISSION_DENIED`: User doesn't have permission for the household
- `NETWORK_ERROR`: Failed to connect to the Mealie server
- `AUTHENTICATION_ERROR`: Invalid API key

## Flow Examples

### Display Household Members

```
[inject] → [mealie-household: operation=getMembers] → [template: format member list] → [dashboard]
```

### Update Notification Time

```
[time picker] → [function: build preferences update] → [mealie-household: operation=updatePreferences] → [debug]
```

### Invitation Management

```
[inject: email] → [function: create invitation] → [mealie-household: operation=createInvitation] → [email node]
```

## Best Practices

1. **Permission Checks**: Remember that household operations require appropriate permissions
2. **Caching**: Consider caching household and preference information if accessed frequently
3. **Invitations**: Set appropriate expiration times for invitations
4. **Error Handling**: Always connect to the error output for proper handling of failures
5. **Preference Updates**: Only include the preferences you want to update in the preferencesData object
6. **Default Household**: Most users will only have one household, but the API supports multiple
7. **Group Relationship**: Remember that households are associated with groups in Mealie's data model