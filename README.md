<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f9d24072-0b1a-45ed-8361-995f1e0f8ad6

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Production visitor counter

The visitor counter uses Upstash Redis for durable unique-visitor storage on Vercel. Set either `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` or the equivalent `KV_REST_API_URL` + `KV_REST_API_TOKEN` environment variables in the Vercel project. Never commit Redis credentials to the repository.
