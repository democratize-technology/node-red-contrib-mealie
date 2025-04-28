# node-red-contrib-mealie Documentation

This directory contains comprehensive documentation for the node-red-contrib-mealie package, which provides Node-RED nodes for interacting with the Mealie recipe management system API.

## Documentation Structure

- **[Getting Started](./getting-started.md)**: Installation and basic configuration
- **[Architecture](./architecture/)**: Design principles and technical architecture
  - [Domain-Operation Architecture](./architecture/domain-operation-architecture.md): How domain-based nodes work
  - [Error Handling](./architecture/error-handling.md): Error handling patterns used in the package
- **[API Reference](./api/)**: Detailed reference for all API operations
  - [Operation Format](./api/operation-format.md): Standard message format for operations
  - [Response Format](./api/response-format.md): Standard response format from nodes
- **[Nodes](./nodes/)**: Documentation for each domain node
  - [Server Configuration](./nodes/config.md): Mealie server connection configuration
  - [Recipe Operations](./nodes/recipe.md): Recipe-related operations
  - [Household Operations](./nodes/household.md): Household management operations
  - [Shopping Operations](./nodes/shopping.md): Shopping list operations
  - [Planning Operations](./nodes/planning.md): Meal planning operations
  - [Organizer Operations](./nodes/organizer.md): Category, tag, and cookbook operations
  - [Admin Operations](./nodes/admin.md): Administrative operations
  - [Utility Operations](./nodes/utility.md): Utility and schema operations
  - [Bulk Operations](./nodes/bulk.md): Bulk import/export operations
  - [Parser Operations](./nodes/parser.md): Recipe parsing operations
- **[Examples](./examples.md)**: Example flows and usage patterns
- **[Troubleshooting](./troubleshooting.md)**: Common issues and solutions

## Version Compatibility

This documentation applies to node-red-contrib-mealie version 0.2.0 and above, which uses the domain-operation architecture.

## Additional Resources

- [Mealie API Documentation](https://nightly.mealie.io/api/docs): Official Mealie API documentation
- [Node-RED Documentation](https://nodered.org/docs/): Official Node-RED documentation