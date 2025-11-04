# Error Logging

This application uses centralized error logging to help debug issues in production.

## How It Works

All server-side errors are automatically logged to Vercel with structured context including:
- Timestamp
- Error message and stack trace
- Action being performed
- User/group IDs (when available)
- Environment (development/production)

## Viewing Logs in Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click on the **"Logs"** tab
4. Look for entries starting with `[ERROR]`

## Log Format

Errors are logged as JSON for easy searching:

```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "level": "error",
  "message": "Failed to create recipe",
  "stack": "Error: ...",
  "context": {
    "action": "createRecipe",
    "groupId": "abc123",
    "recipeName": "Pasta"
  },
  "environment": "production"
}
```

## Searching Logs

In Vercel logs, you can filter by:
- **Error level**: Search for `[ERROR]` or `[WARNING]`
- **Specific action**: Search for action name like `createRecipe`
- **User/group**: Search by ID
- **Time range**: Use Vercel's date filters

## Security

- **Server-side only**: Logs only appear in Vercel's server logs, never in the browser
- **Sanitized**: Sensitive data (passwords, tokens, API keys) are automatically removed
- **Safe context**: Only logs user IDs, action names, and error details

## Adding Error Logging to New Code

Use the `logError()` function from `src/lib/errorLogger.ts`:

```typescript
import { logError } from '@/lib/errorLogger';

try {
  // Your code here
} catch (error) {
  logError(error, {
    action: 'yourActionName',
    groupId: 'optional-group-id',
    // Add any other helpful context
  });
  return { success: false, error: 'User-friendly message' };
}
```

## Future Enhancements

The error logger is designed to easily integrate with external services:

- **Sentry**: Uncomment the Sentry integration code
- **LogRocket**: Add session replay
- **Custom analytics**: Add custom tracking
