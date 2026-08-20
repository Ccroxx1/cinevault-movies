# CineVault By Sasuu

A Vite + React movie discovery application by Prosper Sasuu.

## Local development

Requirements: Node.js 18+.

```bash
npm install
npm run dev
```

The local development server is provided by `server.ts`.

## Vercel deployment

The project is configured for Vercel as a Vite frontend with serverless movie API routes under `api/movies/[action].ts`.

Supported API endpoints:

- `/api/movies/list`
- `/api/movies/details`
- `/api/movies/suggestions`
- `/api/movies/parental_guides`

No environment variables are required by the current CineVault implementation.

### Deploy from GitHub

1. Import `Ccroxx1/cinevault-movies` into Vercel.
2. Select **Vite** as the application preset if Vercel asks.
3. Leave Environment Variables empty.
4. Click **Deploy**.

Vercel automatically detects the `api/` serverless functions and the Vite build output.
