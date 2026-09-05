# CineVault — Setup & Deployment Guide

A high-performance, cinematic movie discovery platform with subtitle downloads, AI recommendations, and an atomic Upstash Redis visitor counter.

---

## 1. Prerequisites

- **Node.js**: Version `20.x` or later (LTS recommended)
- **npm** or **bun** / **pnpm**
- *(Optional for live visitor metrics)*: An [Upstash Redis](https://upstash.com/) database (free tier works great)
- *(Optional for AI recommendation enhancements)*: A [Google Gemini API Key](https://aistudio.google.com/apikey)

---

## 2. Environment Variables

Create a `.env` file in the root directory (or configure environment variables in your deployment dashboard) based on `.env.example`:

```env
# Optional: Google Gemini API key for movie recommendations & semantic search
GEMINI_API_KEY=

# Required for the live visitor count badge:
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_rest_token

# Optional: HMAC signing secret for the HttpOnly visitor cookie (defaults to UPSTASH_REDIS_REST_TOKEN if omitted)
VISITOR_SIGNING_SECRET=
```

> **Note on Visitor Tracking**: If Redis credentials are not provided in local development, the app uses an in-memory counter. In production (e.g. Vercel), Redis is required so the counter never resets across serverless instances.

---

## 3. Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Open the application**:
   Visit `http://localhost:3000` in your web browser.

4. **Verify Visitor Tracker tests**:
   ```bash
   npm run test:visitors
   ```

---

## 4. Production Build & Local Preview

To test the production build locally:

```bash
# Compile frontend assets with Vite and bundle the Node backend with esbuild
npm run build

# Start the compiled production server
npm start
```

---

## 5. Deploying to Vercel

The project is pre-configured with `vercel.json` for Vercel deployment.

1. Push your repository to **GitHub**, **GitLab**, or **Bitbucket**.
2. Import the project in the [Vercel Dashboard](https://vercel.com/new).
3. Under **Project Settings > Environment Variables**, add:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `GEMINI_API_KEY` (if using AI features)
   - `VISITOR_SIGNING_SECRET` (optional, can be any random 32+ character string)
4. Click **Deploy**. Vercel will automatically run `npm run build` and route API endpoints through `api/index.ts`.

---

## 6. Project Scripts

- `npm run dev`: Starts the combined Vite + Express development server using `tsx`.
- `npm run build`: Builds client static files to `dist/` and bundles `server.ts` to `dist/server.cjs`.
- `npm run start`: Runs the production bundled server from `dist/server.cjs`.
- `npm run lint`: Performs strict TypeScript type checking (`tsc --noEmit`).
- `npm run test:visitors`: Runs the test suite verifying atomic Redis increments, reload deduplication, cookie security, and bot protection.
- `npm run prerender`: Generates static snapshots for SEO crawling.
- `npm run sitemap`: Builds search engine sitemaps.
