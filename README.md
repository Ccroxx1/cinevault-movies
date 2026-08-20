# CineVault By Sasuu

Vite + React movie discovery application prepared for Vercel.

## Vercel deployment

The project uses Vercel serverless functions under `api/movies/[action].ts` for the movie API routes:

- `/api/movies/list`
- `/api/movies/details`
- `/api/movies/suggestions`
- `/api/movies/parental_guides`

No environment variables are required for the current movie API implementation.

### Important

Do not add a catch-all Vercel rewrite to `/index.html`. Such a rewrite would also intercept `/api/movies/*` requests and return the HTML page, which causes browser errors such as `Unexpected token '<', "<!doctype"... is not valid JSON`.

Vercel detects the functions in the `api/` directory automatically, so no `vercel.json` file is required for this project.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```
