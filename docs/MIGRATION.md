# Migration Guide

## v0.3.0 - Retry Logic Implementation

### Breaking Behavior Changes

The introduction of intelligent retry logic changes operation timing behavior:

#### Increased Failure Times
- **Before**: Operations failed immediately (< 1 second) on network errors
- **After**: Operations retry up to 3 times with exponential backoff (up to ~45 seconds maximum)

#### Flow Behavior Changes  
- Node-RED flows may appear to "hang" during retry attempts
- Debug nodes may show longer delays between error messages
- Timeout-sensitive flows may need adjustment

#### Retryable Error Types
The following errors will now automatically retry:
- Network errors (FetchError, ECONNREFUSED, ETIMEDOUT)
- Rate limiting (HTTP 429 responses)
- Server errors (HTTP 5xx responses)

#### Non-Retryable Errors
These errors fail immediately (no behavior change):
- Authentication errors (HTTP 401/403)
- Validation errors (HTTP 400)
- Configuration errors

#### Recommended Migration Actions
1. **Review flows** that depend on immediate failure detection
2. **Adjust timeout values** in downstream nodes if needed  
3. **Monitor flow performance** after upgrade
4. **Update error handling logic** to account for retry attempt logging

#### New Error Messages
- Retry attempts are logged: "Retry attempt X of 3"
- Final error messages remain unchanged after retry exhaustion
- Successful operation responses are unaffected

### Benefits
- Improved reliability for unstable network connections
- Better handling of temporary Mealie server issues
- Reduced manual intervention for transient failures
- More professional production behavior