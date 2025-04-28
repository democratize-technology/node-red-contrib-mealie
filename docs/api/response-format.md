# Response Format

This document describes the standard response format used by all nodes in the node-red-contrib-mealie package. Following this standard format ensures consistent handling of responses in your flows.

## Basic Structure

All nodes produce responses in a standard format through their output ports:

### Success Output (First Port)

```json
{
    "success": true,
    "operation": "operationName",
    "data": {
        // Operation result data
    }
}
```

### Error Output (Second Port)

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

## Response Fields

### Common Fields

Both success and error responses include these fields:

- `success`: Boolean indicating if the operation succeeded (`true`) or failed (`false`)
- `operation`: String identifying the operation that was performed

### Success-Specific Fields

- `data`: Contains the operation result data, which varies by operation

### Error-Specific Fields

- `error`: Object containing error information:
  - `code`: String identifier for the error type
  - `message`: Human-readable description of the error
  - `details`: Object with additional context (optional)

## Data Structures

The structure of the `data` field varies by operation and domain. Here are common patterns:

### Single Resource Response

Used for get, create, and update operations:

```json
{
    "success": true,
    "operation": "get",
    "data": {
        "id": "resource-uuid",
        "name": "Resource Name",
        // Other resource properties
    }
}
```

### Collection Response

Used for list and search operations:

```json
{
    "success": true,
    "operation": "search",
    "data": {
        "items": [
            {
                "id": "resource-uuid-1",
                "name": "Resource Name 1",
                // Other resource properties
            },
            // More items
        ],
        "page": 1,
        "perPage": 10,
        "total": 42,
        "totalPages": 5
    }
}
```

### Success Confirmation Response

Used for delete and some update operations:

```json
{
    "success": true,
    "operation": "delete",
    "data": {
        "success": true
    }
}
```

### Binary Data Reference Response

Used for operations that involve files, like images:

```json
{
    "success": true,
    "operation": "image",
    "data": {
        "url": "https://mealie.example.com/api/media/recipes/recipe-slug/image.jpg"
    }
}
```

## Error Codes

Common error codes you might encounter:

| Code                    | Description                                       |
|-------------------------|---------------------------------------------------|
| `UNKNOWN_ERROR`         | Unclassified error                                |
| `NETWORK_ERROR`         | Failed to connect to the server                   |
| `TIMEOUT_ERROR`         | Request timed out                                 |
| `INVALID_CREDENTIALS`   | API key is invalid or missing                     |
| `PERMISSION_DENIED`     | Insufficient permissions for operation            |
| `MISSING_PARAMETER`     | Required parameter is missing                     |
| `INVALID_PARAMETER`     | Parameter has invalid value                       |
| `INVALID_OPERATION`     | Operation is not supported                        |
| `RESOURCE_NOT_FOUND`    | The requested resource could not be found         |
| `RESOURCE_EXISTS`       | A resource with that identifier already exists    |
| `VALIDATION_FAILED`     | The input data failed validation                  |
| `SERVER_ERROR`          | An error occurred on the Mealie server            |
| `MISSING_CONFIG`        | Server configuration is missing                   |
| `INVALID_CONFIG`        | Server configuration is invalid                   |

## Handling Responses in Flows

### Processing Success Responses

Use standard Node-RED nodes to process success responses:

```
[mealie-recipe] → [switch: msg.payload.success == true] → [function: process data]
```

Example function node to process data:

```javascript
// Extract recipe details
const recipe = msg.payload.data;
msg.recipe = {
    name: recipe.name,
    ingredients: recipe.recipeIngredient.map(i => i.note),
    instructions: recipe.recipeInstructions.map(i => i.text)
};
return msg;
```

### Handling Pagination

For paginated responses, you might need to handle multiple pages:

```javascript
// Process paginated results
const response = msg.payload.data;
const items = response.items;

// Add to existing items if we're processing multiple pages
if (!flow.get('allItems')) {
    flow.set('allItems', []);
}
flow.set('allItems', flow.get('allItems').concat(items));

// Check if we need to get more pages
if (response.page < response.totalPages) {
    // Request next page
    msg.payload = {
        operation: "search",
        params: {
            ...msg.payload.params,
            page: response.page + 1
        }
    };
    return [msg, null]; // Send to first output to continue pagination
} else {
    // All pages processed
    msg.payload = flow.get('allItems');
    flow.set('allItems', null); // Clean up
    return [null, msg]; // Send to second output with complete results
}
```

### Handling Error Responses

Use a switch node to route different error types:

```
[mealie-recipe] → [switch: msg.payload.success] → [debug: Success output]
                                               → [switch: msg.payload.error.code] → [function: Handle NetworkError]
                                                                                 → [function: Handle NotFoundError]
                                                                                 → [debug: Other errors]
```

Example error handling function:

```javascript
// Network error handler
const error = msg.payload.error;
if (error.code === 'NETWORK_ERROR') {
    // Set retry mechanism
    if (!flow.get('retryCount')) {
        flow.set('retryCount', 0);
    }
    
    const retryCount = flow.get('retryCount') + 1;
    flow.set('retryCount', retryCount);
    
    if (retryCount <= 3) {
        // Retry the operation
        msg.payload = flow.get('lastOperation');
        msg.delay = retryCount * 1000; // Increasing delay
        return [msg, null]; // Send to retry path
    } else {
        // Max retries reached
        msg.payload = {
            error: "Failed after 3 retry attempts",
            details: error
        };
        flow.set('retryCount', 0); // Reset counter
        return [null, msg]; // Send to failure path
    }
}
```

## Best Practices

1. **Always Check Success**: Verify `msg.payload.success` before processing the response
2. **Handle Both Outputs**: Connect both success and error outputs to appropriate handlers
3. **Preserve Original Message**: When processing responses, preserve the original message structure when possible
4. **Log Errors Appropriately**: Use debug nodes to log errors with useful context
5. **Handle Specific Error Codes**: Implement specific handling for common error codes
6. **Implement Retry Logic**: For network errors, consider implementing retry logic
7. **Provide User Feedback**: Transform errors into user-friendly messages when appropriate

## Examples

### Complete Response Handling Flow

```
[inject] → [mealie-recipe] → [switch: msg.payload.success] → [function: Process Data] → [dashboard]
                                                          → [switch: msg.payload.error.code] → [function: Handle Network Error] → [delay] → [back to mealie-recipe]
                                                                                           → [function: Handle Not Found] → [dashboard: "Recipe not found"]
                                                                                           → [function: Handle Generic Error] → [dashboard: "Error occurred"]
```

This flow pattern provides comprehensive response handling with specific paths for different error types and success scenarios.