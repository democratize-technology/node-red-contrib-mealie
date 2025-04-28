# Domain-Operation Architecture

The node-red-contrib-mealie package implements a domain-operation architectural pattern that provides a flexible and efficient way to interact with the Mealie API through Node-RED.

## Core Concepts

### Domain Nodes

Domain nodes represent major functional areas of the Mealie API. Each domain node handles multiple related operations within its domain. The package includes the following domain nodes:

- **mealie-recipe**: Recipe management operations
- **mealie-household**: Household management operations
- **mealie-shopping**: Shopping list operations
- **mealie-planning**: Meal planning operations
- **mealie-organizer**: Categories, tags, and cookbooks operations
- **mealie-admin**: Administrative operations
- **mealie-utility**: Utility functions and schema operations
- **mealie-bulk**: Bulk import/export operations
- **mealie-parser**: Recipe parsing operations

### Operations

Operations are specific actions that can be performed within a domain. For example, the recipe domain includes operations like get, search, create, update, and delete.

### Configuration vs. Dynamic Operation

Each domain node can be configured in two ways:

1. **Static Configuration**: The operation and its parameters are set in the node's configuration
2. **Dynamic Operation**: The operation and parameters are provided in the incoming message

## Message Format

### Input Format

The standard input message format for domain nodes is:

```json
{
    "operation": "operationName", // Optional: overrides node configuration
    "params": {
        // Operation-specific parameters
    }
}
```

For simpler operations, parameters can also be specified directly in the payload:

```json
{
    "operation": "get",
    "slug": "my-recipe-slug"
}
```

### Output Format

All domain nodes produce a standardized output format:

```json
{
    "success": true|false,
    "operation": "operationName",
    "data": {
        // Operation result for successful operations
    },
    "error": {
        "code": "ERROR_CODE",
        "message": "Human-readable error message",
        "details": {}
    }
}
```

- `success`: Boolean indicating if the operation succeeded
- `operation`: The operation that was performed
- `data`: Present only for successful operations, contains the operation result
- `error`: Present only for failed operations, contains error details

## Node Behavior

### Operation Handling

Each domain node implements a strategy pattern to handle different operations:

1. Determine the operation (from configuration or message)
2. Validate required parameters for the operation
3. Execute the operation using the client wrapper
4. Format the response according to the standard output format

### Validation

Domain nodes validate that all required parameters for an operation are provided, either through node configuration or in the message. If validation fails, the node returns an error with code `VALIDATION_ERROR`.

### Error Handling

All domain nodes implement consistent error handling:

1. API errors are caught and transformed into standardized error objects
2. Network errors are properly identified and reported
3. Authentication issues are detected and reported specifically

## Dynamic UI

Each domain node implements a dynamic UI that adapts based on the selected operation:

1. The node configuration panel shows/hides fields based on the selected operation
2. Only relevant fields for the current operation are displayed
3. The UI updates in real-time when the operation selection changes

## Benefits of Domain-Operation Architecture

1. **Reduced Node Count**: Instead of 35+ individual function nodes, the package provides 9 domain nodes with equivalent functionality
2. **Simplified Flows**: Fewer nodes make flows cleaner and easier to understand
3. **Flexible Configuration**: Choose between static configuration or dynamic operation based on your needs
4. **Consistent Interface**: Standardized input and output formats across all operations
5. **Improved Maintainability**: Centralized error handling and validation
6. **Better Performance**: Loading fewer node types improves startup time and reduces memory usage

## Example Flow Pattern

```
[inject] → [function: set operation and params] → [mealie-recipe] → [debug]
```

This simple flow can be configured to perform any recipe operation by changing the function node content, without modifying the flow structure.

## Migration from Individual Nodes

If you're migrating from individual operation nodes to the domain-operation pattern, use this mapping:

1. Identify the domain of the original node (e.g., `mealie-recipe-get` is in the recipe domain)
2. Replace it with the corresponding domain node (`mealie-recipe`)
3. Configure the domain node with the same operation as the original node
4. Maintain the same input message format

See the [migration guide](../migration-guide.md) for more detailed examples.