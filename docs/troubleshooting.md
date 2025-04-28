# Troubleshooting Guide

This guide addresses common issues that might arise when using the node-red-contrib-mealie package and provides solutions to resolve them.

## Connection Issues

### Cannot Connect to Mealie Server

**Symptoms:**
- Network error message in debug output
- Error code: `NETWORK_ERROR`
- Operations consistently fail with connection errors

**Possible Causes and Solutions:**

1. **Incorrect Server URL**
   - Verify the URL in the mealie-server-config node
   - Ensure the protocol (http/https) is specified correctly
   - Check for typos in the domain or IP address

2. **Network Connectivity**
   - Verify your Node-RED instance can reach the Mealie server
   - Check firewall rules that might be blocking the connection
   - Verify the Mealie server is running and accessible

3. **SSL/TLS Issues**
   - If using HTTPS, ensure certificates are valid
   - For self-signed certificates, you might need to configure Node.js to accept them

**Diagnostic Steps:**
```
[inject] → [http request to mealie API] → [debug]
```
Use this flow to test direct HTTP connectivity to your Mealie server.

### Authentication Failures

**Symptoms:**
- Authentication error message in debug output
- Error code: `INVALID_CREDENTIALS` or `PERMISSION_DENIED`
- Operations fail after connecting successfully

**Possible Causes and Solutions:**

1. **Invalid API Key**
   - Verify the API key in the mealie-server-config node
   - Regenerate a new API key in Mealie if necessary

2. **Insufficient Permissions**
   - Verify the API key has appropriate permissions for the operations
   - Check user roles and permissions in Mealie

3. **API Key Expired**
   - Generate a new API key in Mealie
   - Update the key in the mealie-server-config node

**Diagnostic Steps:**
```javascript
// In a function node
msg.headers = {
    "Authorization": "Bearer " + msg.apiKey
};
msg.url = config.baseUrl + "/api/v1/users/self";
return msg;
```
Use this with an HTTP request node to test authentication directly.

## Operation Issues

### Resource Not Found Errors

**Symptoms:**
- Error message indicating resource not found
- Error code: `RESOURCE_NOT_FOUND`
- Occurs when trying to access specific resources

**Possible Causes and Solutions:**

1. **Incorrect Slug or ID**
   - Verify the slug or ID is correct
   - Check for case sensitivity issues
   - Confirm the resource exists in Mealie

2. **Resource Deleted**
   - The resource might have been deleted outside of Node-RED
   - Search for the resource to verify its existence

3. **Permission Issues**
   - Verify the API key has access to the resource

**Diagnostic Steps:**
Use the search operation to confirm the resource exists before trying to access it directly.

### Validation Errors

**Symptoms:**
- Error message about missing or invalid parameters
- Error code: `MISSING_PARAMETER` or `INVALID_PARAMETER`
- Operations fail with validation errors

**Possible Causes and Solutions:**

1. **Missing Required Parameters**
   - Check the documentation for required parameters
   - Ensure all required parameters are provided

2. **Incorrect Parameter Format**
   - Verify parameter types match documentation
   - Check for formatting issues (e.g., dates, arrays)

3. **Invalid Values**
   - Ensure parameter values are valid
   - Check for constraints on values (e.g., length limits)

**Diagnostic Steps:**
Use debug nodes to inspect the message payload before it reaches the Mealie node.

## Performance Issues

### Slow Response Times

**Symptoms:**
- Operations take a long time to complete
- Timeouts occur for larger operations

**Possible Causes and Solutions:**

1. **Large Data Sets**
   - Use pagination for large collections
   - Filter results using query parameters when possible

2. **Network Latency**
   - Consider hosting Node-RED closer to your Mealie server
   - Implement caching for frequently accessed data

3. **Mealie Server Load**
   - Check Mealie server resource usage
   - Consider upgrading server resources if necessary

## Common Error Messages and Solutions

### "Required Parameter Missing"

**Solution:** Check the operation documentation and ensure all required parameters are provided in the message payload or node configuration.

### "Network Error: ECONNREFUSED"

**Solution:** Verify the Mealie server is running and the URL in the server config node is correct.

### "Authentication Failed: Invalid API Key"

**Solution:** Generate a new API key in Mealie and update it in the server config node.

### "The specified 'slug' does not exist"

**Solution:** Verify the slug exists by using the search operation first, then use the exact slug for get operations.

### "Invalid Recipe Data: Validation Failed"

**Solution:** Check the recipe data structure against the Mealie API documentation and ensure required fields are provided.

## Advanced Troubleshooting

### Enabling Debug Mode

For detailed logging, you can enable debug mode in Node-RED:

1. Go to Node-RED settings (typically in `settings.js`)
2. Set `logging.console.level` to `debug`
3. Restart Node-RED

### Creating a Minimal Reproduction Flow

When troubleshooting complex issues, create a minimal flow that demonstrates the problem:

1. Create a new flow tab
2. Add only the essential nodes needed to reproduce the issue
3. Use debug nodes to examine inputs and outputs
4. Export the flow for sharing if seeking help

### Connection Tracing

To trace API connections:

```
[inject] → [function: set trace headers] → [mealie-recipe] → [debug]
```

Function node content:
```javascript
// Enable detailed logging
msg.trace = true;
return msg;
```

## Seeking Help

If you're still experiencing issues:

1. Check the GitHub repository issues for similar problems
2. Create a new issue with:
   - Detailed description of the problem
   - Steps to reproduce
   - Error messages and codes
   - Node-RED and Mealie versions
   - A minimal example flow (exported JSON)

## Common Workflow Problems and Solutions

### Recipe Search Not Returning Expected Results

**Problem:** Search does not return recipes you expect to find.

**Solution:**
- Try different search terms - the search is based on the Mealie search implementation
- Use tags or categories instead of text search for more precise filtering
- Check that the recipes exist and are visible to your API key's user

### Images Not Displaying After Upload

**Problem:** Uploaded images don't appear or URLs don't work.

**Solution:**
- Verify image format is supported by Mealie (JPG, PNG, WebP)
- Check image size (large images might be rejected)
- Ensure the URL is accessible from where you're viewing it
- Use the get image operation to verify the image was saved

### Recipe Creation Issues

**Problem:** Recipe creation fails with validation errors.

**Solution:**
- Ensure you're providing all required fields
- Format ingredients and instructions as arrays of objects
- Validate your JSON structure before sending
- Start with a minimal recipe and add fields incrementally

### Intermittent Connection Issues

**Problem:** Operations sometimes succeed and sometimes fail.

**Solution:**
- Implement retry logic for network operations
- Add delay nodes between rapid-fire operations
- Consider rate limiting your API requests
- Check if Mealie server has resource constraints

Remember that most issues can be diagnosed by examining the error message and code, which provide specific information about what went wrong.