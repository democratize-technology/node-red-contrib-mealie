# API Reference

This section provides detailed reference documentation for the APIs and message formats used in the node-red-contrib-mealie package.

## Message Formats

- [Operation Format](./operation-format.md): Standard format for operation requests
- [Response Format](./response-format.md): Standard format for operation responses

## API Domain Reference

The following documents provide detailed information about the API operations available for each domain:

- [Recipe API](./recipe-api.md): Recipe operations
- [Household API](./household-api.md): Household management operations
- [Shopping API](./shopping-api.md): Shopping list operations
- [Planning API](./planning-api.md): Meal planning operations
- [Organizer API](./organizer-api.md): Categories, tags, and cookbooks operations
- [Admin API](./admin-api.md): Administrative operations
- [Utility API](./utility-api.md): Utility and schema operations
- [Bulk API](./bulk-api.md): Bulk import/export operations
- [Parser API](./parser-api.md): Recipe parsing operations

## Authentication

All API operations require authentication via an API key. This key is configured in the mealie-server-config node and used for all requests. For details on how authentication works in the Mealie API, see the [Authentication documentation](./authentication.md).

## Common Parameters

Some parameters are common across multiple operations:

### Pagination Parameters

For operations that retrieve lists of items:

| Parameter | Type   | Description                                   | Default |
|-----------|--------|-----------------------------------------------|---------|
| page      | number | Page number (1-based) for paginated results   | 1       |
| perPage   | number | Number of items per page                      | 10      |

### Filtering Parameters

For search operations:

| Parameter  | Type   | Description                                  |
|------------|--------|----------------------------------------------|
| query      | string | Text search query                            |
| tags       | array  | Array of tag slugs to filter by              |
| categories | array  | Array of category slugs to filter by         |
| orderBy    | string | Property to sort results by                  |
| orderDirection | string | Direction: 'asc' or 'desc'               |

## Error Handling

All operations can return errors with standard error codes. See the [Error Handling](../architecture/error-handling.md) documentation for details.

## API Version Compatibility

The node-red-contrib-mealie package is designed to work with Mealie API v1. For more details on API compatibility, see the [Version Compatibility documentation](./version-compatibility.md).

## Advanced Usage

For advanced usage patterns and customizations, see the [Advanced API Usage documentation](./advanced-usage.md).