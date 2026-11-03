# Comprehensive 20-Point SEO Enhancement Plan for CineVault

Comprehensive architectural and technical blueprint to execute all 20 SEO checklist items across CineVault, establishing search visibility, rich Google SERP snippets, optimal Core Web Vitals, social card rendering, and AI crawler indexing.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed and form the foundation for this implementation:
> - **Scope**: Comprehensive execution of all 20 SEO checklist items across the entire codebase.
> - **Social Share Card (`og:image`)**: Dynamic cover preview images for specific movie and TV series pages, combined with a newly generated high-resolution 1200x630 branded cinematic banner (`/og-image.jpg`) for the root and generic pages.
> - **AI Engine Discovery (`llms.txt`)**: Delivery of both a concise `/llms.txt` and an in-depth `/llms-full.txt` documenting catalog structure, APIs, torrent metadata schemas, and search parameters for LLMs and AI search engines.

---

## 1. Overview & Core Concept

- **What It Does**: Upgrades CineVault from a client-side catalog to a search-engine-optimized and AI-discoverable cinema platform with server-side dynamic meta injection, rich JSON-LD structured data, automated sitemaps, semantic heading order, Core Web Vitals performance hardening, and full social card previews.
- **Target Audience / Persona**: Cinema enthusiasts, BitTorrent users searching Google/Bing for verified 1080p/4K releases, and AI agents querying web catalogs.
- **Key Value**: Guarantees maximum organic search discoverability, rich search snippets (ratings, director, cast, sitelinks search box), and fast indexing across Google, Bing, and AI crawlers.

---

## 2. The 20 SEO Checks Implementation Roadmap

| Check # | Item | Current State | Proposed Implementation Plan |
|---|---|---|---|
| **1** | **Build `sitemap.xml`** | Static file in `/public/sitemap.xml` | Implement dynamic server-side sitemap route `/sitemap.xml` (cached 12h) listing core routes, top genres, trending movies, and TV series with `<lastmod>`, `<changefreq>`, and `<priority>`. Keep static fallback in `/public`. |
| **2** | **Add `robots.txt`** | Basic robots file present | Audit and expand `/public/robots.txt` to explicitly grant access to Googlebot, Bingbot, Slurp, DuckDuckBot, Applebot, and AI crawlers (`GPTBot`, `ClaudeBot`, `PerplexityBot`), while disallowing private `/api/admin` or proxy scratch paths. |
| **3** | **Remove `noindex` tags** | Clean in `index.html` | Audit all client views, routes, dynamic SEO injections, and error handlers to ensure no unintended `noindex` headers or robots meta tags appear on valid indexable pages. |
| **4** | **Add canonical tags** | Index canonical present | Implement universal canonical URL resolution both in SSR (`server.ts`) and client SPA (`<link rel="canonical">`), resolving self-referencing canonical URLs for `/`, `/movies/:slug`, `/series/:id`, and `/privacy`. |
| **5** | **Add meta titles** | Static index title with basic SSR rewrite | Enforce strict 30-60 character high-CTR title formulas: `[Movie Title] ([Year]) Torrent & Specs — CineVault` for films, `[Series Title] Seasons & Episodes — CineVault`, and branded homepage titles. |
| **6** | **Meta descriptions** | Generic description on index | Deploy compelling 120-160 character descriptions with explicit CTAs, genres, ratings, and formats across both SSR injection and client-side page transitions. |
| **7** | **One H1 per page** | Multiple or missing H1s depending on component | Refactor DOM hierarchy so every distinct view contains exactly one semantic `<h1>` (e.g. Home brand header, Movie detail title, TV series index header). |
| **8** | **Fix heading order** | Occasional skipping (e.g., `h1` to `h3`) | Standardize descending order: `<h1>` -> `<h2>` (sections: Storyline, Cast, Downloads) -> `<h3>` (sub-items/cards). |
| **9** | **Add alt text** | Some images use generic or empty alt | Enrich all movie posters, backdrops, actor portraits, and logos with descriptive, keyword-rich alt text: `"[Movie Title] ([Year]) official poster — CineVault"`. |
| **10** | **Add Schema Markup (JSON-LD)** | None currently present | Inject Schema.org JSON-LD scripts: `WebSite` with `SearchAction` on home, `Movie` schema (rating, director, cast, trailer, genres) on movie pages, and `BreadcrumbList` for breadcrumbs. |
| **11** | **Add internal links** | Limited cross-linking | Add semantic HTML internal links between genre tags, actor filmography links, related films, and breadcrumb trails to enable search crawler deep traversal. |
| **12** | **Fix broken links** | Some static `#` buttons or unlinked items | Audit all navigation items, footer links, legal policy links, and external documentation shortcuts; convert action triggers to semantic routes. |
| **13** | **Compress images** | Heavy JPGs from external CDNs | Route image rendering through proxy with WebP conversion headers, enforce `loading="lazy"` and `decoding="async"` on all below-the-fold cards, and provide responsive `srcset`. |
| **14** | **Core Web Vitals** | Layout shift on poster loads | Enforce fixed CSS `aspect-ratio: 2/3` on all poster skeletons to eliminate Cumulative Layout Shift (CLS), add `font-display: swap` on Google Fonts, and preconnect to key origins. |
| **15** | **Fix mobile layout** | Good, but needs touch target audit | Ensure touch targets are at least 44x44px, prevent horizontal layout overflow (`overflow-x: hidden`), and maintain readable typography on narrow viewports. |
| **16** | **Enforce HTTPS** | Partial headers | Add `<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">` in `index.html` and verify HTTPS redirection in `server.ts`. |
| **17** | **Clean up URL slugs** | Basic slugifier | Standardize URL slug sanitizer (`sanitizeSlug`) to guarantee lowercase, clean hyphen-separated strings without special characters or redundant tokens. |
| **18** | **Add an `og:image`** | Currently points to small icon | Create a dedicated 1200x630 high-resolution branded card `/og-image.jpg` for the root/general routes, and inject dynamic high-res movie posters into `og:image` for movie pages. |
| **19** | **Verify Search Console** | Google & Bing tags present | Verify and consolidate Google Site Verification (`google-site-verification` tag + HTML file) and Bing Webmaster Tools (`msvalidate.01` + XML file). |
| **20** | **Add `llms.txt`** | Missing | Author standard `/public/llms.txt` and `/public/llms-full.txt` detailing CineVault's site structure, API endpoints, movie search capabilities, and torrent format definitions. |

---

## 3. Technical Architecture & System Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Search Engines & AI Crawlers                    │
│           (Googlebot, Bingbot, GPTBot, ClaudeBot, Perplexity)          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Express Server (`server.ts`)                      │
│                                                                        │
│  ├─► GET /robots.txt           ──► Serves optimized crawler rules      │
│  ├─► GET /sitemap.xml          ──► Dynamic XML with core & top movies  │
│  ├─► GET /llms.txt             ──► Standard AI crawler index           │
│  ├─► GET /llms-full.txt        ──► Complete AI schema & API manual     │
│  ├─► GET /og-image.jpg         ──► Branded 1200x630 high-res card      │
│  └─► GET /movies/:slug         ──► Dynamic SSR SEO Meta & JSON-LD:     │
│                                    • Canonical URL                     │
│                                    • Specific <title> & <meta desc>    │
│                                    • Dynamic og:image (poster)         │
│                                    • Schema.org/Movie JSON-LD script   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      React SPA Client (`src/`)                         │
│                                                                        │
│  ├─► <SEOHead /> Component     ──► Dynamic client-side document.title, │
│                                    canonical, and meta sync on navigate│
│  ├─► Semantic Headings         ──► Exactly one <h1> per page view      │
│  ├─► Media Accessibility       ──► Rich descriptive alt tags on <img>  │
│  ├─► Layout & Core Web Vitals  ──► aspect-ratio: 2/3 (0 CLS)           │
│  └─► Internal Link Graph       ──► Semantic <a href="..."> deep links  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Key Implementation Steps & Milestones

### Milestone 1: Server-Side Dynamic SEO & Static Assets
1. **Dynamic Sitemap (`/sitemap.xml`)**: Add Express route generating XML sitemap with homepage, `/privacy`, `/series`, top trending movies, and genres with appropriate priorities and change frequencies.
2. **Crawler Rules (`/public/robots.txt`)**: Enhance robots.txt with sitemap directive, crawler directives, and explicit support for AI engines.
3. **AI Discovery (`/public/llms.txt` & `/public/llms-full.txt`)**: Create clean Markdown documents structured according to the `llms.txt` standard detailing the platform, features, and content organization.
4. **Branded Social Card (`/public/og-image.jpg`)**: Generate and install a crisp 1200x630 OpenGraph share banner.
5. **Dynamic SSR Meta & Schema Injection (`server.ts`)**: Expand `injectDynamicMetaTags` to output:
   - Specific `<title>` and `<meta name="description">`
   - Canonical `<link rel="canonical">`
   - `og:image`, `og:image:width`, `og:image:height`
   - Inline Schema.org `<script type="application/ld+json">` for `WebSite` and `Movie`.

### Milestone 2: Client-Side React SPA SEO & Accessibility Hardening
1. **Client Meta Synchronization (`src/utils/seo.ts`)**: Ensure client-side navigation updates `document.title`, description, canonical link, and OpenGraph tags dynamically.
2. **Heading Hierarchy Audit**:
   - Refactor `src/App.tsx` and main views to enforce exactly one `<h1>` per view.
   - Adjust section titles (`Storyline`, `Cast`, `Specs`) to semantic `<h2>`, and card items to `<h3>`.
3. **Alt Text & Image Optimization**:
   - Update `MovieCard`, `Hero`, `MovieDetails`, `CastCarousel`, and `TVSeriesView` to generate informative `alt` tags.
   - Ensure `loading="lazy"`, `decoding="async"`, and fixed aspect-ratio containers on all media.
4. **Internal Link Structure**:
   - Ensure genre tags, search keywords, actor profiles, and related movies use accessible `<a href="...">` links.

### Milestone 3: Core Web Vitals, Security & Verification
1. **Performance Hardening**:
   - Ensure zero layout shifts by pairing every poster with a 2/3 aspect ratio wrapper.
   - Verify font loading swap and connection prewarming.
2. **Security & Search Console**:
   - Add CSP upgrade-insecure-requests directive.
   - Maintain Google Site Verification and Bing Site Auth files.
3. **Verification**:
   - Verify all endpoints via curl (`/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/og-image.jpg`).
   - Run `lint_applet` and `compile_applet`.

---

## 5. Live Catalog & Recent Movies Bug Fix (Completed)
- **Problem**: Live production site `https://www.cinevaultmovies.online/` was displaying only 18 fallback movies (*Dune 2*, *Oppenheimer*, etc.) because `vercel.json` rewrote `/api/movies/*` requests to `https://movies-api.accel.li/` which was permanently down with Cloudflare Error 521.
- **Root Cause & Resolution**:
  1. Updated `vercel.json` to route `/api/movies`, `/api/movies/:path*`, and `/api/v2/:path*` directly to `/api/index` (`server.ts`).
  2. Removed dead mirror `https://movies-api.accel.li/api/v2` from `API_BASE_URLS` in `server.ts`, `PUBLIC_MIRRORS` in `src/services/movieApi.ts`, `scripts/generateSitemap.ts`, and `scripts/prerender.ts`.
  3. Reordered `PUBLIC_MIRRORS` in `src/services/movieApi.ts` to query the local proxy `/api/movies` first to prevent browser adblocker or ISP DNS interference.
  4. Added `/api/v2/*` route aliases to `server.ts` for backward compatibility.
  5. Fixed active filter count logic in `src/components/FilterBar.tsx` where default `order_by === 'desc'` erroneously caused `1 active filter` badge on clean loads.
- **Verification**: Verified via curl that `http://localhost:3000/api/movies/list?limit=5` successfully fetches the live 78,214+ catalog with recent additions (*Prorok*, *Model Citizen*, *Your Mother Your Mother Your Mother*, *The History of Concrete*, *Charlie Harper*). Both `lint_applet` and `compile_applet` passed cleanly.

---

## 6. Real-Time Catalog Freshness & Deployment Auto-Update (Completed)
- **Problem**: 
  - Service worker retained 7-day cached movie lists with a 3-second network timeout, which could serve an outdated catalogue on slow connections or re-visits.
  - No background auto-refresh or browser-tab focus detection in `App.tsx`.
  - Stale JavaScript chunks following new deployments required manual Ctrl+F5 refreshes.
- **Root Cause & Resolution**:
  1. **Workbox Caching in `vite.config.ts`**: Replaced 7-day API caching with `NetworkOnly` for catalog lists (`/api/movies/list`) so live releases always bypass the service worker cache. Movie details retain `NetworkFirst` (1 day max) for offline viewing, and posters retain `StaleWhileRevalidate` (30 days).
  2. **Vercel Caching Headers (`vercel.json`)**: Configured `Cache-Control: public, max-age=0, must-revalidate` on HTML, `sw.js`, and `manifest.webmanifest`, while retaining `max-age=31536000, immutable` on hashed `/assets/*` and `s-maxage=120, stale-while-revalidate=300` on API routes.
  3. **Auto-Refresh & Tab Return in `src/App.tsx`**:
     - Added silent background catalog refresh `loadMovies(isSilent = true)` that seamlessly updates movies without showing full-page skeleton loaders.
     - Implemented periodic 5-minute auto-refresh interval when on page 1 of the catalog.
     - Implemented `visibilitychange` and window `focus` event listeners to refresh the catalog automatically whenever a visitor switches back to the CineVault tab.
     - Added a "Live Catalog" status badge and one-click instant refresh button in the results toolbar.
  4. **Deployment Recovery (`vite:preloadError`)**:
     - Added official `vite:preloadError` listener in both `index.html` and `src/main.tsx` to automatically reload and recover from outdated chunk hashes without requiring Ctrl+F5.
     - Added PWA auto-update registration with hourly background checks via `virtual:pwa-register`.
  5. **Server Cache Tuning (`server.ts`)**: Reduced server in-memory list cache TTL to 2 minutes so fresh releases appear immediately.
- **Verification**: `lint_applet` passed (`tsc --noEmit`), `compile_applet` succeeded, and server responded with live catalog and valid headers.


