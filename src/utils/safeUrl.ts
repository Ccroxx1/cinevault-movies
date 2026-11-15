/**
 * Client-side URL and identifier sanitization helpers to prevent
 * unsafe URI schemes (e.g. javascript:, data:) and malformed embed codes.
 */

export function getSafeExternalUrl(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function getSafeMagnetUrl(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Allow valid magnet URIs without whitespace/control characters
  if (/^magnet:\?xt=urn:btih:[a-zA-Z0-9]{32,64}/i.test(trimmed) && !/[\r\n\0]/.test(trimmed)) {
    return trimmed;
  }

  return getSafeExternalUrl(trimmed);
}

export function getSafeYoutubeId(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (/^[a-zA-Z0-9_-]{6,20}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}
