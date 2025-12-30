# Cloudflare AI Gateway Setup

## What is AI Gateway?

Cloudflare AI Gateway provides:
- **Caching** - Identical requests return instantly from cache
- **Analytics** - Track API usage, costs, and performance
- **Rate Limiting** - Control API consumption
- **Lower Latency** - Optimized routing through Cloudflare's network
- **Cost Savings** - Reduce duplicate API calls

## Setup Steps

### 1. Create AI Gateway in Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **AI** → **AI Gateway**
3. Click **Create Gateway**
4. Enter a name (e.g., `finance-gemini`)
5. Click **Create**

### 2. Get Your Gateway URL

After creating the gateway, you'll see example code with a URL like:
```
https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}
```

Copy this base URL (without the `/compat` suffix or any other path segments).

### 3. Configure Environment Variable

Add to your `.env` file:
```bash
NUXT_AI_GATEWAY_URL="https://gateway.ai.cloudflare.com/v1/your-account-id/finance-gemini"
```

**Note:** Do NOT include a trailing slash.

### 4. Deploy

The app will automatically use AI Gateway when the environment variable is set:
- **With AI Gateway**: Requests route through `gateway.ai.cloudflare.com/.../compat/v1/chat/completions` using OpenAI format
- **Without AI Gateway**: Requests go directly to `generativelanguage.googleapis.com/v1beta/...` using Google's native format

## How It Works

When AI Gateway is configured, the app:
1. Constructs the URL: `{gateway_url}/compat/v1/chat/completions`
2. Uses OpenAI-compatible format with model `google-ai-studio/gemini-3-flash-preview`
3. Sends the Google API key via `Authorization: Bearer` header
4. Routes through Cloudflare's edge network for optimized performance

## Verify It's Working

Check the server logs for:
```
Using Cloudflare AI Gateway
```

Or in the Cloudflare Dashboard:
1. Go to **AI** → **AI Gateway** → **Your Gateway**
2. You should see requests appearing in the analytics

## Benefits for This App

1. **Caching**: If you reprocess the same receipt, it returns instantly
2. **Performance**: Lower latency from Cloudflare's edge network
3. **Visibility**: Track which receipts take longest to process
4. **Cost Control**: Set rate limits to prevent API abuse

## Optional: Configure Caching

In the AI Gateway dashboard, you can:
- Set cache TTL (default: 1 hour)
- Enable/disable caching per endpoint
- Configure rate limits

For receipt processing, a 24-hour cache TTL is recommended since receipts don't change.

## Troubleshooting

### 404 errors through AI Gateway
- Ensure the URL does NOT include `/compat` or any other suffix
- Verify the gateway name matches exactly what's shown in the Cloudflare dashboard

### Authentication errors
- Ensure `NUXT_GEMINI_API_KEY` is set correctly
- The API key is sent via `Authorization: Bearer` header when using AI Gateway

### Requests not appearing in analytics
- Check that `NUXT_AI_GATEWAY_URL` is set in your production environment
- Verify there's no trailing slash in the URL
- The gateway should show requests under the "OpenAI Compatible" provider

### Different response format
- AI Gateway uses OpenAI-compatible format, not Google's native format
- The app automatically handles both formats based on whether gateway is configured
