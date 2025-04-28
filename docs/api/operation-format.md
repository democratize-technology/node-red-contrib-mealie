# Operation Format

This document describes the standard message format used for operations in the node-red-contrib-mealie package. Following these formatting conventions ensures consistent interaction with all nodes.

## Input Message Format

All domain nodes accept a standard input message format with operation information and parameters.

### Basic Structure

```json
{
    "operation": "operationName",
    "params": {
        // Operation-specific parameters
    }
}
```

Where:
- `operation`: (Optional) String identifying the operation to perform. If omitted, the node uses the operation configured in its settings.
- `params`: (Optional) Object containing operation-specific parameters.

### Parameter Placement Options

The package supports two equivalent ways to provide parameters:

#### 1. Using the params object (recommended for complex operations)

```json
{
    "operation": "search",
    "params": {
        "query": "pasta",
        "tags": ["italian"],
        "page": 1,
        "perPage": 10
    }
}
```

#### 2. Using top-level properties (simpler for basic operations)

```json
{
    "operation": "get",
    "slug": "spaghetti-carbonara"
}
```

Both approaches are equivalent; the nodes will look for parameters in both locations, with properties directly in the payload taking precedence over those in the params object.

## Parameter Types

### String Parameters

Text values like slugs, IDs, names, etc.

```json
{
    "operation": "get",
    "slug": "pizza-dough"
}
```

### Numeric Parameters

Integer or floating-point values.

```json
{
    "operation": "search",
    "params": {
        "page": 2,
        "perPage": 25
    }
}
```

### Boolean Parameters

True/false flags.

```json
{
    "operation": "search",
    "params": {
        "includeTags": true,
        "includeImage": false
    }
}
```

### Array Parameters

Lists of values.

```json
{
    "operation": "search",
    "params": {
        "tags": ["italian", "quick", "pasta"]
    }
}
```

### Object Parameters

Complex structured data.

```json
{
    "operation": "create",
    "recipeData": {
        "name": "Chocolate Cake",
        "description": "Delicious chocolate cake recipe",
        "recipeIngredient": [
            {"note": "2 cups flour"},
            {"note": "1 cup sugar"}
        ]
    }
}
```

### Binary/Buffer Data

For operations like image uploads, binary data should be provided as a Buffer object.

```javascript
// In a function node:
msg.payload = {
    operation: "image",
    slug: "chocolate-cake",
    imageAction: "upload",
    imageData: Buffer.from(/* image data */)
};
return msg;
```

## Operation Naming Conventions

Operations follow a consistent naming pattern across all domain nodes:

- `get`: Retrieve a resource by ID or slug
- `getAll`: List all resources of a type
- `search`: Find resources matching criteria
- `create`: Create a new resource
- `update`: Modify an existing resource
- `delete`: Remove a resource
- `add`: Add a relationship between resources
- `remove`: Remove a relationship between resources

## Domain-Specific Operation Formats

Each domain has specific operations with their own parameter requirements. Refer to the documentation for each domain node:

- [Recipe Operations](../nodes/recipe.md)
- [Household Operations](../nodes/household.md)
- [Shopping Operations](../nodes/shopping.md)
- [Planning Operations](../nodes/planning.md)
- [Organizer Operations](../nodes/organizer.md)
- [Admin Operations](../nodes/admin.md)
- [Utility Operations](../nodes/utility.md)
- [Bulk Operations](../nodes/bulk.md)
- [Parser Operations](../nodes/parser.md)

## Parameter Validation

Nodes automatically validate that all required parameters for an operation are provided. If validation fails, the node returns an error with code `VALIDATION_ERROR`.

### Required vs. Optional Parameters

Parameters are categorized as:

- **Required**: Must be provided for the operation to succeed
- **Optional**: Have default values or can be omitted

The documentation for each operation clearly indicates which parameters are required.

## Dynamic vs. Static Configuration

Parameters can be provided through two approaches:

### 1. Static Configuration (Node Settings)

Parameters configured in the node's settings panel are used by default. This approach is suitable for:
- Parameters that rarely change (like server URLs)
- Simple flows where the operation is always the same
- Improving flow readability by making the configuration visible in the node

### 2. Dynamic Configuration (Message Payload)

Parameters provided in the message payload override those in the node configuration. This approach is suitable for:
- Parameters that change with each execution
- Complex flows where operations vary based on conditions
- Programmatically generating parameters

## Best Practices

1. **Be Explicit**: Always include the operation name, even when using the node's default configuration
2. **Use Structured Params**: For complex operations, use the `params` object to organize parameters
3. **Validate Inputs**: Pre-validate complex inputs before sending to Mealie nodes
4. **Use Consistent Formatting**: Maintain consistent formatting across your flows
5. **Document Custom Formats**: If you create custom formats in your functions, document them
6. **Consider Readability**: Balance between node configuration and message payload for optimal flow readability

## Examples

### Basic Get Operation

```json
{
    "operation": "get",
    "slug": "chocolate-cake"
}
```

### Search with Multiple Parameters

```json
{
    "operation": "search",
    "params": {
        "query": "cake",
        "tags": ["dessert", "baking"],
        "page": 1,
        "perPage": 25,
        "includeImage": true
    }
}
```

### Create with Complex Data

```json
{
    "operation": "create",
    "recipeData": {
        "name": "Chocolate Cake",
        "description": "Rich chocolate cake recipe",
        "recipeYield": "8 servings",
        "recipeIngredient": [
            {"note": "2 cups all-purpose flour"},
            {"note": "1 3/4 cups granulated sugar"},
            {"note": "3/4 cup unsweetened cocoa powder"},
            {"note": "1 1/2 teaspoons baking powder"},
            {"note": "1 1/2 teaspoons baking soda"},
            {"note": "1 teaspoon salt"},
            {"note": "2 eggs"},
            {"note": "1 cup milk"},
            {"note": "1/2 cup vegetable oil"},
            {"note": "2 teaspoons vanilla extract"},
            {"note": "1 cup boiling water"}
        ],
        "recipeInstructions": [
            {"text": "Preheat oven to 350°F (175°C)."},
            {"text": "Grease and flour two 9-inch round cake pans."},
            {"text": "In a large bowl, combine flour, sugar, cocoa, baking powder, baking soda, and salt."},
            {"text": "Add eggs, milk, oil, and vanilla; beat on medium speed for 2 minutes."},
            {"text": "Stir in boiling water (batter will be thin)."},
            {"text": "Pour into prepared pans."},
            {"text": "Bake for 30-35 minutes or until a toothpick inserted comes out clean."},
            {"text": "Cool completely before frosting."}
        ],
        "tags": ["dessert", "chocolate", "cake", "baking"],
        "recipeCategory": ["dessert"]
    }
}
```

### Dynamic Operation Selection in a Function Node

```javascript
// In a function node
const operations = {
    "GET": { operation: "get", slug: msg.slug },
    "SEARCH": { operation: "search", params: { query: msg.searchTerm } },
    "CREATE": { operation: "create", recipeData: msg.recipe },
    "UPDATE": { operation: "update", slug: msg.slug, recipeData: msg.recipe },
    "DELETE": { operation: "delete", slug: msg.slug }
};

// Select operation based on a message property or flow context
msg.payload = operations[msg.selectedOperation];
return msg;
```

This approach allows for dynamic operation selection while maintaining consistent message formats.