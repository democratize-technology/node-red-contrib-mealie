# node-red-contrib-mealie

Node-RED nodes for interacting with [Mealie](https://mealie.io/), a self-hosted recipe manager and meal planner.

## Features

- Connect to your Mealie instance using API token authentication
- Recipe management: create, read, update, delete recipes
- Meal planning integration
- Shopping list management
- Household and group management
- Media and asset handling
- Administrative functions for server maintenance and user management

## Prerequisites

- Node-RED >= 2.0.0
- Node.js >= 14.0.0
- A running Mealie instance with API access

## Installation

Install via the Node-RED Palette Manager or run the following command in your Node-RED user directory:

```bash
npm install node-red-contrib-mealie
```

## Configuration

1. Add a `mealie-server-config` configuration node
2. Enter your Mealie server URL (e.g., `https://mealie.yourdomain.com`)
3. Enter your API token (generated from Mealie's settings)
4. Set optional timeout value (default: 5000ms)

## Available Nodes

The package provides domain-based nodes that consolidate multiple operations:

### Configuration Node

- **mealie-server-config**: Server configuration and connection management

### Domain Nodes (v0.2.0+)

- **mealie-recipe**: Recipe management (get, search, create, update, delete, image, asset)
- **mealie-household**: Household management (get, getMembers, getPreferences, updatePreferences)
- **mealie-shopping**: Shopping list management (getList, createList, updateList, deleteList, getItems, createItem, addRecipe)
- **mealie-planning**: Meal planning (get, create, update, delete)
- **mealie-organizer**: Recipe organization (getCategories, getTags, getCookbooks, createCookbook)
- **mealie-admin**: Server administration (getInfo, getUsers, getGroups, manageBackup, maintenance)
- **mealie-utility**: Utility functions (getSchema, getVersion)
- **mealie-bulk**: Bulk operations (exportRecipes, importRecipes)
- **mealie-parser**: Recipe parsing (parseUrl, parseText)

Each domain node supports multiple operations that can be configured statically in the node settings or dynamically via the input message.

## Operation Pattern

The domain nodes use an operation-based pattern where:

1. Each node has an "Operation" dropdown to select the function
2. The UI dynamically adapts to show relevant fields for the selected operation
3. Operations can be overridden at runtime by setting `msg.payload.operation`

### Example Usage

Static configuration:
```
[mealie-recipe (operation: get, slug: "pasta-carbonara")] -> [debug]
```

Dynamic configuration:
```javascript
// in a function node:
msg.payload = {
    operation: "search",
    params: {
        tags: ["italian", "quick"]
    }
};
return msg;
```

## Documentation

For more detailed documentation, see:

- [Domain Operation Architecture](./docs/architecture/domain-operation-architecture.md)
- [API Reference](./docs/api-reference.md)

## Development

This project is developed in phases:

1. **Phase 1**: Foundation (configuration, client wrapper, error handling) ✅ COMPLETED
2. **Phase 2**: Essential Recipe Nodes ✅ COMPLETED
3. **Phase 3**: Household & Shopping ✅ COMPLETED
4. **Phase 4**: Organization & Planning ✅ COMPLETED
5. **Phase 5**: Advanced Features ✅ COMPLETED
6. **Phase 6**: Admin & Polish ✅ COMPLETED
7. **Phase 7**: Domain-Operation Architecture ✅ COMPLETED

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License

## Credits

Built on top of the [node-mealie](https://github.com/jeremyg484/node-mealie) API wrapper.
