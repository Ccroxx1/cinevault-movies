# Performance Optimization Plan for CineVault

This plan outlines the steps to improve the loading speed and responsiveness of the CineVault website. The primary bottlenecks identified are redundant API requests on mount, slow API mirror timeouts, and heavy image loading.

## User Review Required

> [!IMPORTANT]
> The optimization will change how data is fetched for the homepage. Instead of loading everything at once, sections will load as the user scrolls. This significantly reduces initial bandwidth and API usage.

## Proposed Changes

### 1. Frontend: Lazy Loading Curated Sections

#### [MODIFY] [App.tsx](file:///C:/Users/Sasuu/Downloads/cinevault-by-sasuu/src/App.tsx)
- Remove the `loadCuratedSections` useEffect that fetches all 10 sections on mount.
- Provide a mechanism for `MovieSectionRow` to request data when it becomes visible.
- Add a state to track which sections have already been loaded to avoid refetching.

#### [MODIFY] [MovieSectionRow.tsx](file:///C:/Users/Sasuu/Downloads/cinevault-by-sasuu/src/components/MovieSectionRow.tsx)
- Implement `IntersectionObserver` to detect when a section enters the viewport.
- Add a `onVisible` callback or internal fetch logic to load movies only when needed.

### 2. API Mirror & Timeout Optimization

#### [MODIFY] [movieApi.ts](file:///C:/Users/Sasuu/Downloads/cinevault-by-sasuu/src/services/movieApi.ts)
- Reduce the default timeout for `fetchFromMirrors` from 4000ms to 2000ms. If a mirror doesn't respond in 2 seconds, it's likely slow or down, and we should move to the next one faster.
- Increase the timeout for the local `/api` proxy to 12000ms (already done in some places, but ensure consistency).

### 3. Image Optimization

#### [MODIFY] [MovieCard.tsx](file:///C:/Users/Sasuu/Downloads/cinevault-by-sasuu/src/components/MovieCard.tsx)
- Ensure all images use `loading="lazy"` and `decoding="async"`.
- Consider using smaller thumbnails (`small_cover_image`) for horizontal rows to reduce data transfer.

### 4. Backend: Meta Tag Cache

#### [MODIFY] [server.ts](file:///C:/Users/Sasuu/Downloads/cinevault-by-sasuu/server.ts)
- Add an in-memory cache for `injectDynamicMetaTags` to prevent redundant API calls when the same movie page is requested multiple times by different users or bots.

---

## Verification Plan

### Automated Tests
- None planned for this refactor, but manual verification of network requests will be done.

### Manual Verification
1. **Network Tab Inspection**: Open Chrome DevTools and verify that `list_movies.json` requests are only triggered as you scroll down the page.
2. **Loading Speed Test**: Measure the time to First Meaningful Paint (FMP) and Time to Interactive (TTI) before and after changes.
3. **Mirror Failover**: Temporarily block the primary mirror in the code to ensure the reduced timeout correctly speeds up the failover to other mirrors.
