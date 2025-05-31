# Error Handling Architecture

The node-red-contrib-mealie package implements a comprehensive error handling system that provides consistent, informative error reporting across all nodes.

## Error Hierarchy

The package uses a hierarchy of error types to categorize different error conditions:

```
MealieError (base error class)
├── NetworkError
├── AuthenticationError
├── ValidationError
├── ConfigurationError
└── RateLimitError
```

### MealieError

Base error class that all other error types extend. Contains:
- Error code
- Human-readable message
- Optional details object with additional information

### NetworkError

Represents failures in network connectivity or communication with the Mealie server:
- Connection failures
- Timeouts
- DNS resolution issues

### AuthenticationError

Represents authentication or authorization issues:
- Invalid API key
- Expired credentials
- Insufficient permissions

### ValidationError

Represents invalid input or parameter issues:
- Missing required parameters
- Invalid parameter values
- Invalid operation names
- Malformed JSON input
- Oversized input data
- Security violations (prototype pollution attempts)

### ConfigurationError

Represents issues with the node or server configuration:
- Missing server configuration
- Invalid server URL
- Misconfigured node settings

### RateLimitError

Represents rate limiting issues from the Mealie server:
- HTTP 429 "Too Many Requests" responses
- API rate limit exceeded
- Server temporarily refusing requests

## Error Codes

Each error includes a specific error code that identifies the exact error condition:

| Code                    | Error Type           | Description                                  |
|-------------------------|--------------------- |----------------------------------------------|
| `UNKNOWN_ERROR`         | MealieError          | Unclassified error                           |
| `NETWORK_ERROR`         | NetworkError         | Failed to connect to the server              |
| `TIMEOUT_ERROR`         | NetworkError         | Request timed out                            |
| `INVALID_CREDENTIALS`   | AuthenticationError  | API key is invalid or missing                |
| `PERMISSION_DENIED`     | AuthenticationError  | Insufficient permissions for operation       |
| `MISSING_PARAMETER`     | ValidationError      | Required parameter is missing                |
| `INVALID_PARAMETER`     | ValidationError      | Parameter has invalid value                  |
| `INVALID_OPERATION`     | ValidationError      | Operation is not supported                   |
| `MISSING_CONFIG`        | ConfigurationError   | Server configuration is missing              |
| `INVALID_CONFIG`        | ConfigurationError   | Server configuration is invalid              |
| `RATE_LIMIT_ERROR`      | RateLimitError       | Server is rate limiting requests             |

## Error Handling Strategy

### 1. Error Creation

Errors are created using factory functions that ensure consistent structure:

```javascript
// Example of creating a ValidationError
const error = new ValidationError(
  'MISSING_PARAMETER', 
  'Required parameter "slug" is missing',
  { paramName: 'slug' }
);
```

### 2. Retry Logic

Starting from version 0.2.1, the package includes intelligent retry logic for transient failures:

**Retryable Errors:**
- Network errors (connection failures, timeouts, DNS issues)
- Rate limiting errors (HTTP 429)
- Server errors (HTTP 5xx status codes)

**Non-Retryable Errors:**
- Authentication errors (HTTP 401/403)
- Validation errors (HTTP 400)
- Other client errors (HTTP 4xx)

**Retry Configuration:**
- Maximum attempts: 3 total (initial attempt + 2 retries)
- Exponential backoff: 1s, 2s, 4s intervals (with 30% jitter)
- Fast test mode: 10ms, 20ms, 40ms intervals during testing
- Environment variable opt-out: Set `MEALIE_RETRY_ENABLED=false` to disable retries

### 3. Error Transformation

API errors and other exceptions are transformed into the appropriate MealieError subtype:

- HTTP 401/403 errors → AuthenticationError
- HTTP 400 errors → ValidationError
- HTTP 429 errors → RateLimitError
- HTTP 5xx errors → MealieError (with statusCode preserved for retry logic)
- Network exceptions → NetworkError
- Other exceptions → MealieError

### 4. Error Handling in Nodes

Each node implements a consistent error handling pattern:

```javascript
try {
  // Node operation
} catch (error) {
  handleError(node, error);
}
```

The `handleError` utility:
1. Logs the error with appropriate level
2. Transforms the error if needed
3. Sends the standardized error object to the error output

### 5. Error Output Format

All errors are output in a standardized format:

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

## Node Status Display

All Mealie nodes provide consistent visual status feedback:

### Success Status
- **Color**: Green dot
- **Message**: `{operation} success` (e.g., "create success", "get success")
- **Duration**: Automatically clears after 5 seconds

### Error Status
- **Color**: Red dot
- **Message**: Error message text
- **Duration**: Automatically clears after 5 seconds

### Status Utilities

The package provides utilities for consistent status handling across all nodes:

```javascript
const { setSuccessStatus, setErrorStatus, clearStatus } = require('../../lib/node-status');

// Set success status with automatic clearing
setSuccessStatus(node, 'create');

// Set error status with automatic clearing
setErrorStatus(node, 'Connection failed');

// Clear status immediately
clearStatus(node);
```

## Error Handling Utilities

The package provides several utilities to standardize error handling:

### withErrorHandling

A higher-order function that wraps operations with consistent error handling:

```javascript
const result = await withErrorHandling(
  async () => await client.recipes.getRecipe(slug),
  'Failed to retrieve recipe'
);
```

### handleError

Processes errors and sends them to the appropriate node output:

```javascript
handleError(node, error, msg);
```

## Migration Notes

### Version 0.2.1 Breaking Changes

**⚠️ Important Behavior Changes:**

- **Increased Operation Duration**: Operations that previously failed immediately may now take up to ~45 seconds to fail (3 attempts with exponential backoff)
- **Retry Behavior**: Network errors, rate limiting, and server errors now automatically retry
- **New Error Type**: Added `RateLimitError` for HTTP 429 responses

**Migration Considerations:**

1. **Flow Timing**: Flows may appear to "hang" during retry attempts. This is normal behavior.
2. **Error Handling**: Add handling for the new `RateLimitError` type in error handling logic.
3. **Testing**: Update integration tests to account for retry delays.
4. **User Experience**: Consider adding progress indicators for operations that may retry.

## Best Practices for Flow Developers

When working with node-red-contrib-mealie nodes:

1. **Connect to Error Output**: Always connect the second output (error) of domain nodes to handle error cases
2. **Check Success Flag**: Verify the `msg.payload.success` flag before processing results
3. **Handle Specific Errors**: Use switch nodes to handle different error codes appropriately
4. **Provide Complete Parameters**: Ensure all required parameters for an operation are provided
5. **Validate Inputs**: Pre-validate complex inputs before sending to Mealie nodes
6. **Account for Retries**: Be patient with operations that may retry on transient failures

## Example Error Handling Flow

```
[mealie-recipe] → [switch: msg.payload.success] → [debug: Success output]
                                                → [switch: msg.payload.error.code] → [function: Handle NetworkError]
                                                                                  → [function: Handle AuthError]
                                                                                  → [function: Handle ValidationError]
                                                                                  → [debug: Unhandled error]
```

This pattern allows for specific handling of different error conditions while maintaining a clean flow structure.