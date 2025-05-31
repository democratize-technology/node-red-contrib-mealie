# Security Features

The node-red-contrib-mealie package includes comprehensive security features to protect against common vulnerabilities and ensure safe handling of user input.

## Input Validation and Sanitization

All user inputs are validated and sanitized before processing to prevent security vulnerabilities and ensure data integrity.

### Safe JSON Parsing

JSON strings are parsed using secure methods that prevent:
- **Prototype pollution attacks**: Blocks dangerous keys like `__proto__`, `constructor`, and `prototype`
- **Memory exhaustion**: Enforces size limits on JSON strings (default: 1MB)
- **Malformed JSON**: Provides clear error messages for invalid JSON

```javascript
// Example: Safe JSON parsing with size limit
const data = safeJsonParse(jsonString, 512 * 1024); // 512KB limit
```

### Input Size Limits

To prevent denial-of-service attacks, the package enforces limits on:
- **JSON string size**: Maximum 1MB by default
- **String field length**: Maximum 10,000 characters for most fields
- **Array length**: Maximum 1,000 items
- **Object keys**: Maximum 100 keys per object
- **Nesting depth**: Maximum 10 levels of object nesting

### String Validation

All string inputs are validated with:
- **Length limits**: Prevents oversized strings
- **Pattern matching**: Validates formats (e.g., slugs, IDs)
- **Trimming**: Removes leading/trailing whitespace
- **Type conversion**: Safely converts non-string values

### Operation Validation

Operation names are validated against allowed lists to prevent:
- **Invalid operations**: Only permitted operations are allowed
- **Injection attacks**: Operation names are strictly validated
- **Typos and errors**: Clear error messages for invalid operations

## Slug and ID Validation

Recipe slugs and other identifiers are validated using strict patterns:

### Slug Format
- Only lowercase letters, numbers, and hyphens
- Cannot start or end with hyphens
- Maximum 100 characters
- Pattern: `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`

### ID Validation
- Accepts numeric IDs (non-negative integers)
- Accepts string IDs (max 100 characters)
- Converts numeric strings to numbers when appropriate
- Validates UUID-like string formats

## Recipe Data Validation

Recipe data undergoes comprehensive validation:

### Required Fields
- **Name**: Required, max 255 characters
- **Description**: Optional, max 5,000 characters

### Numeric Fields
- **prepTime, cookTime, totalTime**: Must be non-negative numbers
- **recipeYield**: Can be string (e.g., "4 servings") or number

### Array Fields
- **Ingredients, instructions, tags**: Limited to 1,000 items each
- **Categories**: Validated for reasonable sizes

### String Fields
- **Instructions**: Max 20,000 characters
- **Notes, summary**: Max 5,000 characters each

## Protection Against Common Attacks

### Prototype Pollution Prevention
```javascript
// These dangerous inputs are blocked:
{"__proto__": {"polluted": true}}
{"constructor": {"prototype": {"polluted": true}}}
```

### JSON Injection Prevention
- All JSON parsing is done safely with error handling
- Malformed JSON throws clear validation errors
- No direct `eval()` or similar unsafe operations

### Size-based DoS Prevention
- Input size limits prevent memory exhaustion
- Nested object depth limits prevent stack overflow
- Array size limits prevent excessive processing

## Error Handling Security

Error messages are designed to be informative without revealing sensitive information:
- **Generic error messages**: Avoid exposing internal system details
- **Structured error codes**: Allow programmatic error handling
- **Safe error logging**: Prevents log injection attacks

## Best Practices for Users

### Input Validation
1. **Validate data before sending**: Pre-validate complex inputs in your flows
2. **Use appropriate limits**: Don't send unnecessarily large payloads
3. **Handle errors gracefully**: Always connect error outputs and handle validation errors

### Secure Configuration
1. **Protect API keys**: Store credentials securely in Node-RED
2. **Use HTTPS**: Always use secure connections to Mealie servers
3. **Regular updates**: Keep the package updated for latest security fixes

### Flow Design
1. **Sanitize user inputs**: Validate any user-provided data before processing
2. **Implement rate limiting**: Prevent excessive API calls
3. **Monitor for errors**: Track validation errors to detect potential attacks

## Security Validation Examples

### Valid Recipe Data
```json
{
  "name": "Chocolate Chip Cookies",
  "description": "Delicious homemade cookies",
  "prepTime": 15,
  "cookTime": 12,
  "recipeYield": "24 cookies",
  "recipeIngredient": [
    "2 cups flour",
    "1 cup sugar",
    "1/2 cup butter"
  ],
  "tags": ["dessert", "cookies", "easy"]
}
```

### Blocked Malicious Input
```json
{
  "__proto__": {
    "polluted": true
  },
  "constructor": {
    "prototype": {
      "isAdmin": true
    }
  }
}
```

The validation system will reject this input with a clear error message about dangerous keys.

## Security Updates

Security features are continuously updated. Check the changelog for:
- New validation rules
- Updated size limits
- Additional security protections
- Vulnerability fixes

Report security issues through the project's GitHub issues with the "security" label.