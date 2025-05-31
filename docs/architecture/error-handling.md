# Error Handling Architecture

The node-red-contrib-mealie package implements a comprehensive error handling system that provides consistent, informative error reporting across all nodes.

## Error Hierarchy

The package uses a hierarchy of error types to categorize different error conditions:

```
MealieError (base error class)
├── NetworkError
├── RateLimitError
├── AuthenticationError
├── ValidationError
└── ConfigurationError
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

### RateLimitError

Represents rate limiting responses from the Mealie server:
- HTTP 429 (Too Many Requests) responses
- API quota exceeded errors

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

## Error Codes

Each error includes a specific error code that identifies the exact error condition:

| Code                    | Error Type           | Description                                  |
|-------------------------|--------------------- |----------------------------------------------|
| `UNKNOWN_ERROR`         | MealieError          | Unclassified error                           |
| `NETWORK_ERROR`         | NetworkError         | Failed to connect to the server              |
| `RATE_LIMIT_ERROR`      | RateLimitError       | API rate limit exceeded                      |
| `TIMEOUT_ERROR`         | NetworkError         | Request timed out                            |
| `INVALID_CREDENTIALS`   | AuthenticationError  | API key is invalid or missing                |
| `PERMISSION_DENIED`     | AuthenticationError  | Insufficient permissions for operation       |
| `MISSING_PARAMETER`     | ValidationError      | Required parameter is missing                |
| `INVALID_PARAMETER`     | ValidationError      | Parameter has invalid value                  |
| `INVALID_OPERATION`     | ValidationError      | Operation is not supported                   |
| `MISSING_CONFIG`        | ConfigurationError   | Server configuration is missing              |
| `INVALID_CONFIG`        | ConfigurationError   | Server configuration is invalid              |

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

### 2. Error Transformation

API errors and other exceptions are transformed into the appropriate MealieError subtype:

- HTTP 401/403 errors → AuthenticationError
- HTTP 429 errors → RateLimitError
- HTTP 400 errors → ValidationError
- Network exceptions → NetworkError
- Other exceptions → MealieError

### 3. Error Handling in Nodes

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

### 4. Error Output Format

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

## Retry Logic

The package implements intelligent retry logic for transient failures using the [cockatiel](https://github.com/connor4312/cockatiel) library. Operations are automatically retried in the following scenarios:

### Retryable Conditions

- **Network Errors**: Connection failures, timeouts, DNS resolution issues
- **Rate Limiting**: HTTP 429 (Too Many Requests) responses  
- **Server Errors**: HTTP 5xx responses indicating temporary server issues

### Retry Configuration

The retry logic uses exponential backoff with the following settings:

- **Maximum Attempts**: 3 retries per operation
- **Initial Delay**: 1 second
- **Maximum Delay**: 30 seconds
- **Backoff Strategy**: Exponential with factor of 2
- **Jitter**: Enabled to prevent thundering herd

### Non-Retryable Conditions

The following errors are **not** retried to avoid unnecessary delays:

- **Authentication Errors**: HTTP 401/403 responses
- **Validation Errors**: HTTP 400 responses  
- **Client Configuration Errors**: Misconfigured nodes or servers

### Retry Behavior

When a retry is attempted:

1. The node logs the retry attempt number
2. Exponential backoff delay is applied
3. The operation is re-executed with a fresh client connection
4. If all retries are exhausted, the final error is propagated

This approach significantly improves reliability for users with unstable network connections or when the Mealie server is experiencing temporary issues.

### handleError

Processes errors and sends them to the appropriate node output:

```javascript
handleError(node, error, msg);
```

## Best Practices for Flow Developers

When working with node-red-contrib-mealie nodes:

1. **Connect to Error Output**: Always connect the second output (error) of domain nodes to handle error cases
2. **Check Success Flag**: Verify the `msg.payload.success` flag before processing results
3. **Handle Specific Errors**: Use switch nodes to handle different error codes appropriately
4. **Provide Complete Parameters**: Ensure all required parameters for an operation are provided
5. **Validate Inputs**: Pre-validate complex inputs before sending to Mealie nodes

## Example Error Handling Flow

```
[mealie-recipe] → [switch: msg.payload.success] → [debug: Success output]
                                                → [switch: msg.payload.error.code] → [function: Handle NetworkError]
                                                                                  → [function: Handle AuthError]
                                                                                  → [function: Handle ValidationError]
                                                                                  → [debug: Unhandled error]
```

This pattern allows for specific handling of different error conditions while maintaining a clean flow structure.