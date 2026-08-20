import {
  fetchFromMovieApi,
  queryParamsFromRequest,
  sendJson,
} from './_lib';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, {
      status: 'error',
      status_message: 'Method not allowed',
    });
  }

  const action = String(req.query?.action || '').toLowerCase();
  const params = queryParamsFromRequest(req);

  try {
    switch (action) {
      case 'list': {
        if (!params.limit) params.limit = '20';
        if (!params.page) params.page = '1';
        params.with_rt_ratings = params.with_rt_ratings || 'true';

        const data = await fetchFromMovieApi('list_movies.json', params);
        return sendJson(res, 200, data);
      }

      case 'details': {
        params.with_images = params.with_images || 'true';
        params.with_cast = params.with_cast || 'true';

        if (!params.movie_id && !params.imdb_id) {
          return sendJson(res, 400, {
            status: 'error',
            status_message: 'movie_id or imdb_id is required',
          });
        }

        const data = await fetchFromMovieApi('movie_details.json', params);
        return sendJson(res, 200, data);
      }

      case 'suggestions': {
        const movieId = params.movie_id;
        if (!movieId) {
          return sendJson(res, 400, {
            status: 'error',
            status_message: 'movie_id is required',
            data: { movies: [] },
          });
        }

        const data = await fetchFromMovieApi('movie_suggestions.json', {
          movie_id: movieId,
        });
        return sendJson(res, 200, data);
      }

      case 'parental_guides': {
        const movieId = params.movie_id;
        if (!movieId) {
          return sendJson(res, 400, {
            status: 'error',
            status_message: 'movie_id is required',
            data: { parent_guides: [] },
          });
        }

        const data = await fetchFromMovieApi('movie_parental_guides.json', {
          movie_id: movieId,
        });
        return sendJson(res, 200, data);
      }

      default:
        return sendJson(res, 404, {
          status: 'error',
          status_message: `Unknown movie API route: ${action || 'missing action'}`,
        });
    }
  } catch (error: any) {
    console.error(`CineVault API error (${action}):`, error?.message || error);

    const fallbackData =
      action === 'list'
        ? { movie_count: 0, movies: [] }
        : action === 'suggestions'
          ? { movies: [] }
          : action === 'parental_guides'
            ? { parent_guides: [] }
            : undefined;

    return sendJson(res, 502, {
      status: 'error',
      status_message: error?.message || 'Movie API unavailable',
      ...(fallbackData ? { data: fallbackData } : {}),
    });
  }
}
