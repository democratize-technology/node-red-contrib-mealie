# Getting Started with node-red-contrib-mealie

This guide will help you set up and start using the node-red-contrib-mealie package to connect Node-RED with your Mealie recipe management system.

## Prerequisites

- Node-RED installed and running (v3.0.0 or higher recommended)
- A running Mealie instance (v1.0.0 or higher)
- API access to your Mealie instance
- Node.js v20.0.0 or higher

## Installation

Install node-red-contrib-mealie from within your Node-RED user directory:

```bash
cd ~/.node-red
npm install node-red-contrib-mealie
```

Or use the Node-RED Palette Manager:

1. Open Node-RED
2. Go to the menu (top right) and select "Manage palette"
3. Switch to the "Install" tab
4. Search for "node-red-contrib-mealie"
5. Click "Install"

## Configuration

### 1. Add and Configure a Mealie Server

1. Drag a **mealie-server-config** node to your flow or double-click any Mealie node to create a new server configuration
2. Set the following properties:
   - **Name**: A descriptive name for this server connection
   - **Server URL**: The URL of your Mealie server (e.g., `http://mealie.example.com` or `http://localhost:9000`)
   - **API Key**: Your Mealie API key
   - **API Version**: The API version (default: `v1`)

### 2. Test the Connection

1. Drag a **mealie-utility** node onto your flow
2. Configure it to use your server and set the operation to "Get Version"
3. Connect an inject node to trigger it and a debug node to see the output
4. Deploy and click the inject node
5. Check the debug output to verify a successful connection

## Basic Usage Pattern

The node-red-contrib-mealie package uses a domain-operation pattern, where each node represents a domain (like recipes, shopping lists, etc.) and can perform various operations within that domain.

### Example: Retrieving a Recipe

1. Drag a **mealie-recipe** node onto your flow
2. Configure it:
   - Select your server configuration
   - Set the operation to "Get Recipe"
   - Optionally set a slug in the node configuration or provide it in the message
3. Connect an inject node with the following payload:
   ```json
   {
       "slug": "my-recipe-slug"
   }
   ```
4. Connect a debug node to display the results
5. Deploy and trigger the flow

The output will include:
```json
{
    "success": true,
    "operation": "get",
    "data": {
        "id": "recipe-id",
        "name": "Recipe Name",
        "slug": "my-recipe-slug",
        // ... other recipe data
    }
}
```

### Dynamic Operation Selection

Instead of hardcoding the operation in the node configuration, you can specify it dynamically in your message:

```json
{
    "operation": "search",
    "params": {
        "query": "pasta"
    }
}
```

This approach allows you to reuse the same node for different operations based on your flow's logic.

## Next Steps

- Explore the [domain nodes documentation](./nodes/) to learn about all available operations
- Check the [examples](./examples.md) for common usage patterns
- Review the [architecture documentation](./architecture/) to understand the design principles

## Troubleshooting

If you encounter issues:

1. Check the [troubleshooting guide](./troubleshooting.md)
2. Verify your Mealie server is accessible from Node-RED
3. Confirm your API key has the necessary permissions
4. Check the Node-RED logs for error messages