# Recipe Domain Node (mealie-recipe)

The Recipe domain node handles all recipe-related operations in the Mealie API, allowing you to get, search, create, update, and delete recipes, as well as manage recipe images and assets.

## Node Configuration

- **Name**: Optional name for the node instance
- **Server**: Reference to the Mealie server configuration node
- **Operation**: The operation to perform (can be overridden via msg.payload.operation)
- **Slug**: Recipe slug for operations that require it (can be overridden via msg.payload.slug)
- **Recipe Data**: JSON data for recipe creation or update (can be overridden via msg.payload.recipeData)

## Supported Operations

### Get Recipe (`get`)

Retrieves a single recipe by its slug.

#### Parameters

| Parameter | Type   | Required | Description                  |
|-----------|--------|----------|------------------------------|
| slug      | string | Yes      | The recipe slug to retrieve  |

#### Example Input

```json
{
    "operation": "get",
    "slug": "spaghetti-carbonara"
}
```

#### Example Output

```json
{
    "success": true,
    "operation": "get",
    "data": {
        "id": "recipe-uuid",
        "name": "Spaghetti Carbonara",
        "slug": "spaghetti-carbonara",
        "description": "A classic Italian pasta dish...",
        "recipeCategory": ["pasta", "dinner"],
        "tags": ["italian", "easy"],
        "recipeIngredient": [...],
        "recipeInstructions": [...],
        // Other recipe properties
    }
}
```

### Search Recipes (`search`)

Searches for recipes based on query parameters.

#### Parameters

| Parameter     | Type   | Required | Description                                  |
|---------------|--------|----------|----------------------------------------------|
| query         | string | No       | Text search query                            |
| page          | number | No       | Page number for pagination (default: 1)      |
| perPage       | number | No       | Items per page (default: 10)                 |
| cookbook      | string | No       | Filter by cookbook ID                        |
| categories    | array  | No       | Filter by category slugs                     |
| tags          | array  | No       | Filter by tag slugs                          |
| includeImage  | boolean| No       | Include image data (default: false)          |

#### Example Input

```json
{
    "operation": "search",
    "params": {
        "query": "pasta",
        "tags": ["italian", "quick"],
        "perPage": 25
    }
}
```

#### Example Output

```json
{
    "success": true,
    "operation": "search",
    "data": {
        "items": [
            {
                "id": "recipe-uuid-1",
                "name": "Spaghetti Carbonara",
                "slug": "spaghetti-carbonara",
                // Recipe summary properties
            },
            // More recipe items
        ],
        "page": 1,
        "perPage": 25,
        "total": 42,
        "totalPages": 2
    }
}
```

### Create Recipe (`create`)

Creates a new recipe.

#### Parameters

| Parameter  | Type   | Required | Description                  |
|------------|--------|----------|------------------------------|
| recipeData | object | Yes      | The recipe data to create    |

#### Example Input

```json
{
    "operation": "create",
    "recipeData": {
        "name": "Chocolate Chip Cookies",
        "description": "Classic chocolate chip cookies recipe",
        "recipeCategory": ["dessert", "baking"],
        "tags": ["cookies", "chocolate"],
        "recipeIngredient": [
            {"note": "2 cups all-purpose flour"},
            {"note": "1 cup chocolate chips"}
            // More ingredients
        ],
        "recipeInstructions": [
            {"text": "Preheat oven to 350°F"},
            {"text": "Mix dry ingredients"}
            // More instructions
        ],
        // Other recipe properties
    }
}
```

#### Example Output

```json
{
    "success": true,
    "operation": "create",
    "data": {
        "id": "new-recipe-uuid",
        "name": "Chocolate Chip Cookies",
        "slug": "chocolate-chip-cookies",
        // Other recipe properties with the created recipe
    }
}
```

### Update Recipe (`update`)

Updates an existing recipe.

#### Parameters

| Parameter  | Type   | Required | Description                  |
|------------|--------|----------|------------------------------|
| slug       | string | Yes      | The recipe slug to update    |
| recipeData | object | Yes      | The updated recipe data      |

#### Example Input

```json
{
    "operation": "update",
    "slug": "chocolate-chip-cookies",
    "recipeData": {
        "name": "Chocolate Chip Cookies",
        "description": "Updated chocolate chip cookies recipe",
        // Other recipe properties to update
    }
}
```

#### Example Output

```json
{
    "success": true,
    "operation": "update",
    "data": {
        "id": "recipe-uuid",
        "name": "Chocolate Chip Cookies",
        "slug": "chocolate-chip-cookies",
        "description": "Updated chocolate chip cookies recipe",
        // Other recipe properties with the updated recipe
    }
}
```

### Delete Recipe (`delete`)

Deletes a recipe.

#### Parameters

| Parameter | Type   | Required | Description                  |
|-----------|--------|----------|------------------------------|
| slug      | string | Yes      | The recipe slug to delete    |

#### Example Input

```json
{
    "operation": "delete",
    "slug": "chocolate-chip-cookies"
}
```

#### Example Output

```json
{
    "success": true,
    "operation": "delete",
    "data": {
        "success": true
    }
}
```

### Manage Recipe Image (`image`)

Gets or uploads a recipe image.

#### Parameters

| Parameter   | Type          | Required | Description                                 |
|-------------|---------------|----------|---------------------------------------------|
| slug        | string        | Yes      | The recipe slug                             |
| imageAction | string        | No       | Action to perform: 'get' or 'upload' (default: 'get') |
| imageData   | object/buffer | For upload | The image data to upload                  |

#### Example Input (Get Image)

```json
{
    "operation": "image",
    "slug": "chocolate-chip-cookies",
    "imageAction": "get"
}
```

#### Example Output (Get Image)

```json
{
    "success": true,
    "operation": "image",
    "data": {
        "url": "https://mealie.example.com/api/media/recipes/chocolate-chip-cookies/images/min-original.webp"
    }
}
```

#### Example Input (Upload Image)

For upload, use a multipart node or function that sets `msg.payload.imageData` to the image buffer.

```json
{
    "operation": "image",
    "slug": "chocolate-chip-cookies",
    "imageAction": "upload",
    "imageData": "<Buffer ...>"
}
```

### Manage Recipe Assets (`asset`)

Lists, gets, uploads, or deletes recipe assets (PDFs, etc.).

#### Parameters

| Parameter   | Type          | Required | Description                                       |
|-------------|---------------|----------|---------------------------------------------------|
| slug        | string        | Yes      | The recipe slug                                   |
| assetAction | string        | No       | 'list', 'get', 'upload', 'delete' (default: 'list') |
| assetId     | string        | For get/delete | The asset ID                               |
| assetData   | object/buffer | For upload | The asset data to upload                        |
| assetName   | string        | For upload | Name for the uploaded asset                     |

#### Example Input (List Assets)

```json
{
    "operation": "asset",
    "slug": "chocolate-chip-cookies",
    "assetAction": "list"
}
```

#### Example Output (List Assets)

```json
{
    "success": true,
    "operation": "asset",
    "data": [
        {
            "id": "asset-uuid-1",
            "name": "nutrition-facts.pdf",
            "contentType": "application/pdf"
        },
        // More assets
    ]
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

Common error codes for recipe operations:

- `MISSING_PARAMETER`: A required parameter is missing
- `RECIPE_NOT_FOUND`: The requested recipe could not be found
- `INVALID_RECIPE_DATA`: The recipe data is invalid
- `NETWORK_ERROR`: Failed to connect to the Mealie server
- `AUTHENTICATION_ERROR`: Invalid API key or insufficient permissions

## Flow Examples

### Get Recipe Details

```
[inject: {"slug": "pizza-dough"}] → [mealie-recipe: operation=get] → [debug]
```

### Search Recipes by Tag

```
[inject: {"params": {"tags": ["italian"]}}] → [mealie-recipe: operation=search] → [debug]
```

### Create a Recipe

```
[inject: {"recipeData": {...}}] → [mealie-recipe: operation=create] → [debug]
```

### Update a Recipe and Get the Updated Version

```
[inject] → [function: set update data] → [mealie-recipe: operation=update] → [function: extract slug] → [mealie-recipe: operation=get] → [debug]
```

## Best Practices

1. Use the node configuration for common operations and only override via message for dynamic cases
2. Consider using the search operation with pagination for large recipe collections
3. Include proper error handling by connecting to the second output port
4. For image and asset operations, use function nodes to prepare the data correctly
5. When creating or updating recipes, validate the recipe data structure before sending to the node