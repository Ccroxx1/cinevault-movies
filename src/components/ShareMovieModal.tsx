import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Download,
  ExternalLink,
  FileText,
  Smartphone,
  Star,
  Film,
  Sparkles,
  Mail,
  ImageIcon,
  RefreshCw
} from 'lucide-react';
import { Movie } from '../types';
import { getMovieCanonicalUrl, SITE_BASE_URL } from '../utils/seo';
import { getPosterCandidates, CINEVAULT_POSTER_FALLBACK } from '../utils/imageFallback';

interface ShareMovieModalProps {
  isOpen: boolean;
  onClose: () => void;
  movie?: Movie | null;
  // Optional custom overrides for series or generic media
  customTitle?: string;
  customYear?: number | string;
  customRating?: number | string;
  customGenres?: string[];
  customSynopsis?: string;
  customPosterUrl?: string;
  customShareUrl?: string;
}

export const ShareMovieModal: React.FC<ShareMovieModalProps> = ({
  isOpen,
  onClose,
  movie,
  customTitle,
  customYear,
  customRating,
  customGenres,
  customSynopsis,
  customPosterUrl,
  customShareUrl
}) => {
  // Active view: 'story' (9:16 vertical layout) or 'feed' (horizontal feed & direct social links)
  const [activeTab, setActiveTab] = useState<'story' | 'feed'>('story');
  const [copiedType, setCopiedType] = useState<'link' | 'card' | 'poster' | 'storyImage' | 'storyCaption' | null>(null);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [storyGeneratedBlob, setStoryGeneratedBlob] = useState<Blob | null>(null);
  const [deviceShareStatus, setDeviceShareStatus] = useState<string | null>(null);

  // Hidden canvas for 1080x1920 9:16 export
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Derived movie attributes
  const title = movie?.title || customTitle || 'Movie';
  const year = movie?.year || customYear || '';
  const rating = movie?.rating ? movie.rating.toFixed(1) : customRating ? String(customRating) : null;
  const genres = movie?.genres || customGenres || [];
  const rawSynopsis =
    movie?.description_full ||
    movie?.description_intro ||
    movie?.summary ||
    movie?.synopsis ||
    customSynopsis ||
    'Download and stream in high-definition 720p, 1080p, and 4K Ultra HD on CineVault.';
  
  // Clean short synopsis (concise description for 9:16 story display)
  const cleanSynopsis = rawSynopsis.replace(/\s+/g, ' ').trim();
  const shortSynopsis =
    cleanSynopsis.length > 175
      ? cleanSynopsis.slice(0, 172).replace(/\s+\S*$/, '') + '...'
      : cleanSynopsis;

  // Posters
  const posterCandidates = movie
    ? getPosterCandidates(movie)
    : customPosterUrl
    ? [customPosterUrl, CINEVAULT_POSTER_FALLBACK]
    : [CINEVAULT_POSTER_FALLBACK];

  const currentPoster = posterCandidates[candidateIndex] || CINEVAULT_POSTER_FALLBACK;

  // Absolute poster URL for social platforms
  const absolutePosterUrl = currentPoster.startsWith('http')
    ? currentPoster
    : currentPoster.startsWith('/')
    ? `${typeof window !== 'undefined' ? window.location.origin : SITE_BASE_URL}${currentPoster}`
    : currentPoster;

  // Share URL
  const shareUrl = movie
    ? getMovieCanonicalUrl(movie)
    : customShareUrl || (typeof window !== 'undefined' ? window.location.href : SITE_BASE_URL);

  // Clean filename slug for story download
  const fileSlug = (title || 'cinevault-movie')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // Reset state on open/movie change
  useEffect(() => {
    if (isOpen) {
      setCandidateIndex(0);
      setCopiedType(null);
      setDeviceShareStatus(null);
      setStoryGeneratedBlob(null);
    }
  }, [isOpen, movie?.id, customTitle]);

  // Keyboard shortcut to close (ESC)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Helper: Wrap text on Canvas
  const drawWrappedText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number = 3,
    align: CanvasTextAlign = 'center'
  ): number => {
    ctx.textAlign = align;
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    let linesDrawn = 0;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        if (linesDrawn >= maxLines - 1) {
          ctx.fillText(line.trim() + '...', x, currentY);
          return currentY + lineHeight;
        }
        ctx.fillText(line.trim(), x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
        linesDrawn++;
      } else {
        line = testLine;
      }
    }
    if (line.trim().length > 0) {
      ctx.fillText(line.trim(), x, currentY);
      currentY += lineHeight;
    }
    return currentY;
  };

  // Helper: Draw rounded rectangle on Canvas
  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(x, y, width, height, radius);
    } else {
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
    }
    ctx.closePath();
  };

  /**
   * Generates a 1080x1920 (9:16) high-resolution vertical story card on Canvas
   * Includes: Movie Poster, Title, Concise Description, and "CineVault By Sasuu" branding
   */
  const generate9x16StoryBlob = async (): Promise<Blob | null> => {
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 1. Draw Cinematic Background Gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, 1920);
    bgGradient.addColorStop(0, '#0a0d16');
    bgGradient.addColorStop(0.3, '#101426');
    bgGradient.addColorStop(0.65, '#0c0e18');
    bgGradient.addColorStop(1, '#05060a');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 1080, 1920);

    // 2. Ambient Color Glows
    const topGlow = ctx.createRadialGradient(540, 560, 50, 540, 560, 750);
    topGlow.addColorStop(0, 'rgba(225, 29, 72, 0.28)'); // Rose glow
    topGlow.addColorStop(0.6, 'rgba(245, 158, 11, 0.12)'); // Amber glow
    topGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, 1080, 1920);

    const bottomGlow = ctx.createRadialGradient(540, 1750, 50, 540, 1750, 600);
    bottomGlow.addColorStop(0, 'rgba(225, 29, 72, 0.22)');
    bottomGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bottomGlow;
    ctx.fillRect(0, 1200, 1080, 720);

    // 3. Load Poster Image (with robust fallback and proxy routing to prevent canvas tainting)
    let posterImgLoaded = false;
    let blobUrlToRevoke: string | null = null;
    const posterImg = new Image();

    // Assemble prioritized candidates to resolve the highest quality available cover
    const candidatesToTry: string[] = [];
    if (currentPoster && !candidatesToTry.includes(currentPoster)) {
      candidatesToTry.push(currentPoster);
    }
    for (const cand of posterCandidates) {
      if (cand && !candidatesToTry.includes(cand)) {
        candidatesToTry.push(cand);
      }
    }
    if (movie?.large_cover_image && !candidatesToTry.includes(movie.large_cover_image)) {
      candidatesToTry.push(movie.large_cover_image);
    }
    if (movie?.medium_cover_image && !candidatesToTry.includes(movie.medium_cover_image)) {
      candidatesToTry.push(movie.medium_cover_image);
    }
    if (movie?.imdb_code) {
      const apiImdb = `/api/poster?imdb=${encodeURIComponent(movie.imdb_code)}&size=large`;
      if (!candidatesToTry.includes(apiImdb)) candidatesToTry.push(apiImdb);
    }
    if (title) {
      const apiTitle = `/api/poster?title=${encodeURIComponent(title)}&size=large`;
      if (!candidatesToTry.includes(apiTitle)) candidatesToTry.push(apiTitle);
    }

    for (const candidate of candidatesToTry) {
      try {
        // External images (yts, amazon, etc.) lack Access-Control-Allow-Origin: * on raw CDNs.
        // Route through /api/image-proxy which fetches server-side and serves with CORS headers.
        const targetSrc = /^https?:\/\//i.test(candidate)
          ? `/api/image-proxy?url=${encodeURIComponent(candidate)}`
          : candidate;

        const res = await fetch(targetSrc, { signal: AbortSignal.timeout(4500) });
        if (res.ok) {
          const blob = await res.blob();
          if (blob && blob.size > 800) {
            const objectUrl = URL.createObjectURL(blob);
            const success = await new Promise<boolean>((resolve) => {
              posterImg.onload = () => resolve(true);
              posterImg.onerror = () => resolve(false);
              posterImg.src = objectUrl;
            });

            if (success) {
              posterImgLoaded = true;
              blobUrlToRevoke = objectUrl;
              break;
            } else {
              URL.revokeObjectURL(objectUrl);
            }
          }
        }
      } catch {
        // Try next candidate
      }
    }

    // Direct Image() attempt if network proxy attempts were skipped or blocked
    if (!posterImgLoaded && currentPoster) {
      try {
        posterImg.crossOrigin = 'anonymous';
        posterImgLoaded = await new Promise<boolean>((resolve) => {
          posterImg.onload = () => resolve(true);
          posterImg.onerror = () => resolve(false);
          posterImg.src = currentPoster;
          setTimeout(() => resolve(false), 2000);
        });
      } catch {
        posterImgLoaded = false;
      }
    }

    // 4. Background Backdrop Blur (if image loaded)
    if (posterImgLoaded) {
      try {
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.filter = 'blur(45px)';
        ctx.drawImage(posterImg, -100, -100, 1280, 2120);
        ctx.restore();
      } catch (err) {
        console.warn('Canvas backdrop draw restricted:', err);
      }
    }

    // 5. Stories Safe Zone Top Header (y: 110 - 240)
    // 5. Stories Safe Zone Top Header (y: 110 - 240)
    // Story Badge Pill
    const pillY = 110;
    const pillH = 58;
    const pillW = 480;
    const pillX = (1080 - pillW) / 2;

    ctx.save();
    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 29);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.stroke();

    // Calculate exact header content layout so dot never overlaps text
    const headerText = 'CINEVAULT • STORIES & STATUS';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const headerTextWidth = ctx.measureText(headerText).width;
    const dotRadius = 6;
    const dotSpacing = 16;
    const totalPillContentW = dotRadius * 2 + dotSpacing + headerTextWidth;
    const pillContentStartX = (1080 - totalPillContentW) / 2;

    // Red pulsating dot in header (positioned safely before text)
    ctx.beginPath();
    ctx.arc(pillContentStartX + dotRadius, pillY + pillH / 2, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#E11D48';
    ctx.fill();

    // Header Pill Text
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(headerText, pillContentStartX + dotRadius * 2 + dotSpacing, pillY + 37);
    ctx.restore();

    // Badges Row (Year, Rating, Quality) - Perfectly centered as a group
    const badgeY = 195;
    ctx.save();
    
    interface StoryBadgeItem {
      text: string;
      bg: string;
      border: string;
      color: string;
      w: number;
    }

    const badgeList: StoryBadgeItem[] = [];
    if (rating) {
      badgeList.push({
        text: `★ ${rating} IMDb`,
        bg: 'rgba(245, 158, 11, 0.22)',
        border: 'rgba(245, 158, 11, 0.55)',
        color: '#FBBF24',
        w: 164
      });
    }
    if (year) {
      badgeList.push({
        text: String(year),
        bg: 'rgba(225, 29, 72, 0.22)',
        border: 'rgba(225, 29, 72, 0.55)',
        color: '#FB7185',
        w: 106
      });
    }
    badgeList.push({
      text: '4K UHD',
      bg: 'rgba(255, 255, 255, 0.1)',
      border: 'rgba(255, 255, 255, 0.25)',
      color: '#F3F4F6',
      w: 116
    });

    const bGap = 14;
    const totalBadgesWidth = badgeList.reduce((sum, b) => sum + b.w, 0) + (badgeList.length - 1) * bGap;
    let badgeCurrentX = (1080 - totalBadgesWidth) / 2;

    badgeList.forEach((badge) => {
      drawRoundedRect(ctx, badgeCurrentX, badgeY, badge.w, 48, 12);
      ctx.fillStyle = badge.bg;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = badge.border;
      ctx.stroke();

      ctx.font = 'bold 23px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = badge.color;
      ctx.textAlign = 'center';
      ctx.fillText(badge.text, badgeCurrentX + badge.w / 2, badgeY + 33);

      badgeCurrentX += badge.w + bGap;
    });
    ctx.restore();

    // 6. Central Movie Poster Frame (2:3 ratio inside 9:16 layout)
    const posterW = 590;
    const posterH = 885;
    const posterX = (1080 - posterW) / 2;
    const posterY = 270;

    ctx.save();
    // Shadow under poster
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 15;

    // Card background & clipping
    drawRoundedRect(ctx, posterX, posterY, posterW, posterH, 32);
    ctx.fillStyle = '#0f111a';
    ctx.fill();
    ctx.restore();

    ctx.save();
    drawRoundedRect(ctx, posterX, posterY, posterW, posterH, 32);
    ctx.clip();

    if (posterImgLoaded) {
      try {
        ctx.drawImage(posterImg, posterX, posterY, posterW, posterH);
      } catch {
        // Fallback plate if tainted
        ctx.fillStyle = '#1e2337';
        ctx.fillRect(posterX, posterY, posterW, posterH);
      }
    } else {
      // Artistic Fallback Card
      ctx.fillStyle = '#141829';
      ctx.fillRect(posterX, posterY, posterW, posterH);
      ctx.font = 'bold 44px sans-serif';
      ctx.fillStyle = '#E11D48';
      ctx.textAlign = 'center';
      ctx.fillText('🎬', 540, posterY + posterH / 2 - 40);
      ctx.font = 'bold 36px sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(title, 540, posterY + posterH / 2 + 30);
    }
    ctx.restore();

    // Poster Outer Border
    ctx.save();
    drawRoundedRect(ctx, posterX, posterY, posterW, posterH, 32);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.stroke();
    ctx.restore();

    // 7. Genres Row
    if (genres.length > 0) {
      ctx.save();
      ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#FB7185'; // Rose-400
      ctx.textAlign = 'center';
      const genreString = genres.slice(0, 4).join('   •   ').toUpperCase();
      ctx.fillText(genreString, 540, 1205);
      ctx.restore();
    }

    // 8. Movie Title (Bold, High-Visibility)
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 3;
    const titleFontSize = title.length > 30 ? 46 : 56;
    ctx.font = `bold ${titleFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const nextY = drawWrappedText(ctx, title, 540, 1270, 940, titleFontSize + 12, 2, 'center');
    ctx.restore();

    // 9. Concise Description / Synopsis (Curated 2-3 lines)
    ctx.save();
    ctx.font = 'italic 29px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#E2E8F0'; // Slate-200 for clean high-contrast reading
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 8;
    const synopsisStartY = Math.max(nextY + 15, 1370);
    drawWrappedText(ctx, `"${shortSynopsis}"`, 540, synopsisStartY, 920, 44, 3, 'center');
    ctx.restore();

    // 10. The Requested "CineVault By Sasuu" Branding at the Bottom
    const brandingDividerY = 1630;
    // Gradient Divider Line
    ctx.save();
    const lineGrad = ctx.createLinearGradient(140, 0, 940, 0);
    lineGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    lineGrad.addColorStop(0.2, 'rgba(225, 29, 72, 0.7)');
    lineGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.9)');
    lineGrad.addColorStop(0.8, 'rgba(225, 29, 72, 0.7)');
    lineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(140, brandingDividerY);
    ctx.lineTo(940, brandingDividerY);
    ctx.stroke();
    ctx.restore();

    // Branding Container Box - Generously sized (750px) so text never collides or overflows
    const brandBoxW = 750;
    const brandBoxH = 130;
    const brandBoxX = (1080 - brandBoxW) / 2; // 165
    const brandBoxY = 1665;
    ctx.save();
    drawRoundedRect(ctx, brandBoxX, brandBoxY, brandBoxW, brandBoxH, 24);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.stroke();

    // CineVault Logo Emblem Badge
    const emblemSize = 74;
    const emblemX = brandBoxX + 28;
    const emblemY = brandBoxY + (brandBoxH - emblemSize) / 2;
    drawRoundedRect(ctx, emblemX, emblemY, emblemSize, emblemSize, 18);
    const emblemGrad = ctx.createLinearGradient(emblemX, emblemY, emblemX + emblemSize, emblemY + emblemSize);
    emblemGrad.addColorStop(0, '#E11D48');
    emblemGrad.addColorStop(1, '#9F1239');
    ctx.fillStyle = emblemGrad;
    ctx.fill();
    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText('CV', emblemX + emblemSize / 2, emblemY + 49);

    // Primary Brand Text: "CineVault By Sasuu" with measured kerning gap
    const textStartX = emblemX + emblemSize + 22;
    ctx.textAlign = 'left';
    ctx.font = '900 40px -apple-system, BlinkMacSystemFont, "Montserrat", sans-serif';

    const cineVaultWord = 'CineVault';
    const cineVaultW = ctx.measureText(cineVaultWord).width;
    const spaceW = ctx.measureText(' ').width + 8; // Proper distinct spacing

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(cineVaultWord, textStartX, brandBoxY + 56);

    ctx.fillStyle = '#FB7185';
    ctx.fillText('By Sasuu', textStartX + cineVaultW + spaceW, brandBoxY + 56);

    // Subtitle & Canonical Website (fits comfortably inside the 750px box)
    ctx.font = '600 20.5px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#9CA3AF';
    ctx.fillText('Watch Trailer & Stream HD • moviesandseries.xyz', textStartX, brandBoxY + 97);
    ctx.restore();

    // Story Safe Zone Bottom Tip
    ctx.save();
    ctx.font = '500 20px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = 'rgba(156, 163, 175, 0.85)';
    ctx.textAlign = 'center';
    ctx.fillText('Optimized 9:16 Vertical Story • Tap to Stream in HD', 540, 1845);
    ctx.restore();

    // Convert Canvas to Blob (with try-catch if cross-origin tainted)
    return new Promise<Blob | null>((resolve) => {
      const cleanup = () => {
        if (blobUrlToRevoke) {
          try {
            URL.revokeObjectURL(blobUrlToRevoke);
          } catch {}
          blobUrlToRevoke = null;
        }
      };

      try {
        canvas.toBlob(
          (blob) => {
            cleanup();
            if (blob) {
              setStoryGeneratedBlob(blob);
              resolve(blob);
            } else {
              resolve(null);
            }
          },
          'image/png',
          0.95
        );
      } catch (err) {
        cleanup();
        console.error('Failed to export canvas toBlob (tainted by cross-origin):', err);
        resolve(null);
      }
    });
  };

  /**
   * Action 1: Download 9:16 Story Image (.PNG)
   */
  const handleDownloadStoryImage = async () => {
    setIsGeneratingStory(true);
    setDeviceShareStatus(null);
    try {
      let blob = storyGeneratedBlob;
      if (!blob) {
        blob = await generate9x16StoryBlob();
      }

      if (blob) {
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${fileSlug}-story-9x16.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 4000);

        setCopiedType('storyImage');
        setTimeout(() => setCopiedType(null), 3000);
      } else {
        // Fallback: download direct poster
        const link = document.createElement('a');
        link.href = absolutePosterUrl;
        link.download = `${fileSlug}-poster.jpg`;
        link.target = '_blank';
        link.click();
      }
    } catch (err) {
      console.error('Error downloading story image:', err);
    } finally {
      setIsGeneratingStory(false);
    }
  };

  /**
   * Action 2: Share to Stories (Web Share API with 9:16 Image file)
   */
  const handleShareToStories = async () => {
    setIsGeneratingStory(true);
    setDeviceShareStatus(null);
    try {
      let blob = storyGeneratedBlob;
      if (!blob) {
        blob = await generate9x16StoryBlob();
      }

      const metaLine = rating
        ? `★ ${rating}/10 IMDb${genres.length > 0 ? ` | ${genres.slice(0, 3).join(', ')}` : ''}`
        : (genres.length > 0 ? genres.slice(0, 3).join(', ') : '');

      const headerBlock = [
        `🎬 ${title} (${year || 'Film'})`,
        metaLine,
        `"${shortSynopsis}"`
      ].filter(Boolean).join('\n');

      const linkBlock = [
        `🍿 Explore movies and TV series:`,
        shareUrl
      ].join('\n');

      const captionText = [
        headerBlock,
        linkBlock,
        `— CineVault By Sasuu`,
        `#CineVault #CineVaultBySasuu #FacebookStories #TVShows #Movies`
      ].join('\n\n');

      if (blob && typeof navigator !== 'undefined' && navigator.canShare) {
        const file = new File([blob], `${fileSlug}-story-9x16.png`, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${title} — CineVault By Sasuu`,
            text: captionText,
            url: shareUrl
          });
          setDeviceShareStatus('Shared successfully!');
          return;
        }
      }

      // If file share is not supported, fallback to native text/url share
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: `${title} — CineVault By Sasuu`,
          text: captionText,
          url: shareUrl
        });
        setDeviceShareStatus('Shared successfully!');
        return;
      }

      // If browser doesn't support Web Share API, download the image and copy caption
      await handleDownloadStoryImage();
      await handleCopyStoryCaption();
      setDeviceShareStatus('Saved to gallery & caption copied! Open Instagram or Facebook Stories to post.');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Share to stories failed:', err);
        setDeviceShareStatus('Share cancelled or not supported on this browser.');
      }
    } finally {
      setIsGeneratingStory(false);
    }
  };

  /**
   * Action 3: Copy Story Image to Clipboard (for pasting into FB/WhatsApp/Discord)
   */
  const handleCopyStoryImage = async () => {
    setIsGeneratingStory(true);
    try {
      let blob = storyGeneratedBlob;
      if (!blob) {
        blob = await generate9x16StoryBlob();
      }

      if (blob && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setCopiedType('storyImage');
        setTimeout(() => setCopiedType(null), 3000);
      } else {
        // Fallback: copy link
        navigator.clipboard.writeText(shareUrl);
        setCopiedType('link');
        setTimeout(() => setCopiedType(null), 2500);
      }
    } catch (err) {
      console.warn('Clipboard image write failed, downloading instead:', err);
      handleDownloadStoryImage();
    } finally {
      setIsGeneratingStory(false);
    }
  };

  /**
   * Action 4: Copy Formatted Story Caption
   */
  const handleCopyStoryCaption = () => {
    const metaLine = rating
      ? `★ ${rating}/10 IMDb${genres.length > 0 ? ` | ${genres.slice(0, 3).join(', ')}` : ''}`
      : (genres.length > 0 ? genres.slice(0, 3).join(', ') : '');

    const headerBlock = [
      `🎬 ${title} (${year || 'Film'})`,
      metaLine,
      `"${shortSynopsis}"`
    ].filter(Boolean).join('\n');

    const linkBlock = [
      `🍿 Explore movies and TV series:`,
      shareUrl
    ].join('\n');

    const caption = [
      headerBlock,
      linkBlock,
      `— CineVault By Sasuu`,
      `#CineVault #CineVaultBySasuu #FacebookStories #TVShows #Movies`
    ].join('\n\n');

    navigator.clipboard.writeText(caption);
    setCopiedType('storyCaption');
    setTimeout(() => setCopiedType(null), 2500);
  };

  /**
   * Feed Sharing Actions
   */
  const handleFacebookShare = () => {
    const quote = `🎬 ${title} (${year || 'Film'})${rating ? ` — ★ ${rating}/10 IMDb` : ''}\n\n"${shortSynopsis}"\n\nWatch trailer, view poster & download on CineVault By Sasuu:`;
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(quote)}`;
    window.open(fbUrl, '_blank', 'noopener,noreferrer,width=650,height=550');
  };

  const handleTwitterShare = () => {
    const text = `🎬 ${title} (${year || 'Film'})${rating ? ` [★ ${rating}/10]` : ''}\n\n"${shortSynopsis.slice(0, 130)}..."\n\n#CineVaultBySasuu #Movies`;
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer,width=650,height=550');
  };

  const handleWhatsAppShare = () => {
    const text = `🎬 *${title}* (${year || 'Film'})\n⭐ Rating: ${rating ? `${rating}/10 IMDb` : 'N/A'}${genres.length > 0 ? `\n🎭 Genres: ${genres.slice(0, 3).join(', ')}` : ''}\n\n📝 _"${shortSynopsis}"_\n\n🖼 Poster: ${absolutePosterUrl}\n🔗 Stream & Download: ${shareUrl}\n\n— *CineVault By Sasuu*`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleTelegramShare = () => {
    const text = `🎬 ${title} (${year || 'Film'})${rating ? ` [★ ${rating}/10 IMDb]` : ''}\n\n"${shortSynopsis}"\n\nCineVault By Sasuu:`;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
  };

  const handleRedditShare = () => {
    const redditTitle = `${title} (${year || 'Film'})${rating ? ` [★ ${rating}/10 IMDb]` : ''} — CineVault By Sasuu`;
    const redditUrl = `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(redditTitle)}`;
    window.open(redditUrl, '_blank', 'noopener,noreferrer');
  };

  const handlePinterestShare = () => {
    const desc = `${title} (${year || 'Film'})${rating ? ` — ★ ${rating}/10 IMDb` : ''}. ${shortSynopsis} | CineVault By Sasuu`;
    const pinUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(absolutePosterUrl)}&description=${encodeURIComponent(desc)}`;
    window.open(pinUrl, '_blank', 'noopener,noreferrer,width=750,height=600');
  };

  const handleLinkedInShare = () => {
    const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(liUrl, '_blank', 'noopener,noreferrer,width=650,height=550');
  };

  const handleEmailShare = () => {
    const subject = `Check out "${title}" (${year || 'Film'}) on CineVault By Sasuu`;
    const body = `Hi,\n\nI thought you might enjoy this film:\n\n${title} (${year || 'Film'})\nIMDb Rating: ${rating ? `${rating}/10` : 'N/A'}\nGenres: ${genres.join(', ') || 'N/A'}\n\nSynopsis:\n"${cleanSynopsis}"\n\nPoster: ${absolutePosterUrl}\n\nWatch trailer and download high-speed torrents:\n${shareUrl}\n\nShared via CineVault By Sasuu`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedType('link');
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleCopyCard = () => {
    const cardText = [
      `🎬 ${title} (${year || 'Film'})`,
      rating ? `★ ${rating}/10 IMDb${genres.length > 0 ? ` | ${genres.slice(0, 3).join(', ')}` : ''}` : '',
      '',
      `"${cleanSynopsis}"`,
      '',
      `🖼 Poster: ${absolutePosterUrl}`,
      `🔗 Watch & Download: ${shareUrl}`,
      `— CineVault By Sasuu`
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(cardText);
    setCopiedType('card');
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleCopyPosterUrl = () => {
    navigator.clipboard.writeText(absolutePosterUrl);
    setCopiedType('poster');
    setTimeout(() => setCopiedType(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-movie-title"
      style={{ backgroundColor: 'var(--cv-modal-backdrop)' }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 backdrop-blur-md overflow-y-auto overscroll-contain animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Hidden high-res canvas used for 1080x1920 export */}
      <canvas ref={canvasRef} className="hidden" />

      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-dialog-surface relative w-full max-w-2xl rounded-3xl overflow-hidden border cv-surface-elevated my-auto"
      >
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 flex items-center justify-between border-b cv-border cv-surface-muted">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full cv-nav-soft-active flex items-center justify-center">
              <Share2 size={16} />
            </div>
            <div>
              <h2
                id="share-movie-title"
                className="text-sm sm:text-base font-bold tracking-tight cv-text"
              >
                Share Poster &amp; Movie Details
              </h2>
              <p className="text-[11px] cv-text-muted">
                Optimized 9:16 layout for Stories, Status updates &amp; Social feeds
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full cv-btn-secondary transition-colors cursor-pointer"
            aria-label="Close share dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher: 9:16 Story vs Feed Links */}
        <div className="p-2.5 px-5 border-b cv-border cv-surface-muted flex gap-2" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'story'}
            onClick={() => setActiveTab('story')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'story' ? 'cv-nav-pill-active shadow-md' : 'cv-nav-pill'
            }`}
          >
            <Smartphone size={16} />
            <span>9:16 Story &amp; Status</span>
            <span
              className={`hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === 'story'
                  ? 'bg-white/20 text-white'
                  : 'cv-badge-neutral border'
              }`}
            >
              Facebook / Instagram / WhatsApp
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'feed'}
            onClick={() => setActiveTab('feed')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'feed' ? 'cv-nav-pill-active shadow-md' : 'cv-nav-pill'
            }`}
          >
            <ExternalLink size={16} />
            <span>Feed Post &amp; Links</span>
            <span
              className={`hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === 'feed'
                  ? 'bg-white/20 text-white'
                  : 'cv-badge-neutral border'
              }`}
            >
              Direct Social Share
            </span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-4 sm:p-6 max-h-[calc(86vh-120px)] overflow-y-auto space-y-5">
          {activeTab === 'story' ? (
            /* TAB 1: 9:16 VERTICAL STORY & STATUS CARD GENERATOR */
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-5 items-center md:items-start">
                {/* Visual 9:16 Story Card Preview */}
                <div className="shrink-0 w-64 sm:w-72">
                  <div className="story-9x16-surface relative aspect-[9/16] w-full rounded-3xl overflow-hidden border border-white/20 shadow-2xl shadow-black/80 flex flex-col justify-between p-3.5 sm:p-4 bg-[#0a0d18] text-white select-none ring-1 ring-white/10">
                    {/* Soft Backdrop Image without heavy 48px Gaussian blur repaints */}
                    <img
                      src={currentPoster}
                      alt=""
                      aria-hidden="true"
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover scale-110 opacity-20"
                    />
                    {/* Dark gradient overlay for extreme legibility */}
                    <div className="absolute inset-0 bg-gradient-to-b from-[#060810]/90 via-black/65 to-[#040508]/95 pointer-events-none" />

                    {/* TOP SAFE HEADER */}
                    <div className="relative z-10 flex flex-col items-center gap-1.5 pt-1">
                      {/* Story Pill */}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-white/20 text-[10px] font-bold tracking-wider uppercase text-white shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        <span className="story-header-text text-white">Stories &amp; Status • 9:16</span>
                      </div>

                      {/* Metadata Badges */}
                      <div className="flex items-center gap-1 text-[10px] font-bold">
                        {rating && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/25 border border-amber-500/40 text-amber-300 flex items-center gap-0.5">
                            <Star size={9} className="fill-amber-400" />
                            {rating} IMDb
                          </span>
                        )}
                        {year && (
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300">
                            {year}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded-md bg-white/10 border border-white/20 text-white font-medium">
                          4K UHD
                        </span>
                      </div>
                    </div>

                    {/* CENTER POSTER SHOWCASE (Framed cleanly in 2:3 ratio) */}
                    <div className="relative z-10 my-auto py-1">
                      <div className="relative aspect-[2/3] w-36 sm:w-40 mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-black border-2 border-white/20 ring-4 ring-rose-600/20 group">
                        <img
                          src={currentPoster}
                          alt={`${title} poster`}
                          referrerPolicy="no-referrer"
                          onError={() => {
                            if (candidateIndex + 1 < posterCandidates.length) {
                              setCandidateIndex((prev) => prev + 1);
                            }
                          }}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    </div>

                    {/* LOWER CONTENT SECTION (Title, Concise Description, and Branding) */}
                    <div className="relative z-10 space-y-2 pb-1">
                      {genres.length > 0 && (
                        <div className="text-[9px] font-bold tracking-wider text-rose-400 uppercase text-center line-clamp-1">
                          {genres.slice(0, 3).join(' • ')}
                        </div>
                      )}

                      {/* Movie Title */}
                      <h3 className="story-title font-display font-black text-sm sm:text-base leading-snug text-center text-white line-clamp-2 drop-shadow-md">
                        {title}
                      </h3>

                      {/* Concise Description / Synopsis */}
                      <p className="story-synopsis text-[10px] sm:text-[11px] text-neutral-200 text-center leading-relaxed italic line-clamp-3 px-1 drop-shadow">
                        "{shortSynopsis}"
                      </p>

                      {/* THE REQUESTED BRANDING AT THE BOTTOM: "CineVault By Sasuu" */}
                      <div className="pt-2 border-t border-rose-500/30">
                        <div className="p-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/20 flex items-center justify-between gap-2 shadow-lg">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center font-black text-[10px] text-white shrink-0 shadow-sm">
                              CV
                            </div>
                            <div className="min-w-0 leading-none">
                              <div className="flex items-center gap-1.5 font-black text-[11px] tracking-tight">
                                <span className="story-branding-title text-white">CineVault</span>
                                <span className="text-rose-400 font-bold ml-0.5">By Sasuu</span>
                              </div>
                              <div className="text-[8px] text-neutral-300 font-mono truncate mt-0.5">
                                moviesandseries.xyz
                              </div>
                            </div>
                          </div>
                          <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-600/40 text-rose-300 border border-rose-500/40">
                            Stream HD
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-center mt-2 text-[11px] font-medium cv-text-muted">
                    9:16 Vertical Story Layout Preview
                  </div>
                </div>

                {/* Story Actions & Platform Guides */}
                <div className="flex-1 space-y-4 w-full">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold cv-text-accent uppercase tracking-wider">
                      <Sparkles size={14} />
                      <span>Optimized Vertical Sharing</span>
                    </div>
                    <h4 className="text-base sm:text-lg font-extrabold cv-text">
                      Post to Facebook, Instagram &amp; WhatsApp Status
                    </h4>
                    <p className="text-xs leading-relaxed cv-text-muted">
                      Download this high-resolution 9:16 card or share it straight to your device's story editor with the movie title, description, and CineVault By Sasuu branding.
                    </p>
                  </div>

                  {/* Primary Story Actions */}
                  <div className="space-y-2.5 pt-1">
                    {/* 1. Download 9:16 Story Image */}
                    <button
                      type="button"
                      disabled={isGeneratingStory}
                      onClick={handleDownloadStoryImage}
                      className="w-full py-3 px-4 cv-btn-primary font-bold text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50"
                    >
                      {isGeneratingStory ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Rendering 9:16 Story Card (1080x1920)...</span>
                        </>
                      ) : copiedType === 'storyImage' ? (
                        <>
                          <Check size={16} />
                          <span>Story Image Downloaded (.PNG)!</span>
                        </>
                      ) : (
                        <>
                          <Download size={16} />
                          <span>Download 9:16 Story Image (HD .PNG)</span>
                        </>
                      )}
                    </button>

                    {/* 2. Share to Stories / Device */}
                    <button
                      type="button"
                      disabled={isGeneratingStory}
                      onClick={handleShareToStories}
                      className="w-full py-2.5 px-4 cv-btn-secondary font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
                    >
                      <Smartphone size={16} className="cv-text-accent" />
                      <span>Share to Stories (Device Sheet)</span>
                    </button>

                    {/* 3. Copy Tools: Copy Image & Copy Caption */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleCopyStoryImage}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          copiedType === 'storyImage' ? 'cv-badge-success font-bold' : 'cv-btn-secondary'
                        }`}
                        title="Copy image blob to clipboard to paste directly in Facebook or WhatsApp Web"
                      >
                        {copiedType === 'storyImage' ? (
                          <>
                            <Check size={13} />
                            <span>Image Copied!</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon size={13} />
                            <span>Copy Image</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyStoryCaption}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          copiedType === 'storyCaption' ? 'cv-badge-success font-bold' : 'cv-btn-secondary'
                        }`}
                        title="Copy formatted text caption with title, rating and site link"
                      >
                        {copiedType === 'storyCaption' ? (
                          <>
                            <Check size={13} />
                            <span>Caption Copied!</span>
                          </>
                        ) : (
                          <>
                            <FileText size={13} />
                            <span>Copy Caption</span>
                          </>
                        )}
                      </button>
                    </div>

                    {deviceShareStatus && (
                      <div className="p-2.5 rounded-xl cv-nav-soft-active text-[11px] font-medium leading-normal flex items-start gap-2">
                        <Sparkles size={14} className="shrink-0 mt-0.5" />
                        <span>{deviceShareStatus}</span>
                      </div>
                    )}
                  </div>

                  {/* Direct Launch Buttons for Facebook Stories & WhatsApp */}
                  <div className="pt-2 border-t cv-border space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider cv-text-muted">
                      Quick Launch Platforms
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleFacebookShare}
                        className="p-2.5 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white transition-all text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        <span>Facebook</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleWhatsAppShare}
                        className="p-2.5 rounded-xl bg-[#047857] hover:bg-[#059669] text-white transition-all text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                        </svg>
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>

                  {/* 3-Step Guide for Posting to Stories */}
                  <div className="p-3 rounded-2xl border cv-surface-muted cv-border cv-text-secondary text-[11px] space-y-1">
                    <div className="font-bold cv-text">
                      How to post to Story / Status:
                    </div>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>
                        Tap{' '}
                        <b className="cv-text font-extrabold">
                          Download 9:16 Story Image
                        </b>{' '}
                        to save the high-res card.
                      </li>
                      <li>
                        Open Facebook, Instagram, or WhatsApp and tap{' '}
                        <b className="cv-text font-extrabold">
                          Add to Story / Status
                        </b>
                        .
                      </li>
                      <li>Select the 9:16 card from your photos &amp; post!</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: FEED POST & SOCIAL SHARING LINKS */
            <div className="space-y-5">
              {/* Facebook/Feed Preview Card */}
              <div className="p-3.5 sm:p-4 rounded-2xl border cv-card transition-all">
                <div className="flex gap-3.5 sm:gap-4 items-start">
                  {/* Poster Thumbnail */}
                  <div className="relative w-20 sm:w-24 shrink-0 aspect-[2/3] rounded-xl overflow-hidden cv-surface-muted border cv-border shadow-md">
                    <img
                      src={currentPoster}
                      alt={`${title} poster`}
                      referrerPolicy="no-referrer"
                      onError={() => {
                        if (candidateIndex + 1 < posterCandidates.length) {
                          setCandidateIndex((prev) => prev + 1);
                        }
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Title, Badges, and Synopsis */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {year && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded cv-nav-soft-active">
                          {year}
                        </span>
                      )}
                      {rating && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded cv-rating-badge flex items-center gap-0.5">
                          <Star size={10} className="fill-current" />
                          {rating}
                        </span>
                      )}
                      {genres.slice(0, 2).map((g) => (
                        <span
                          key={g}
                          className="px-1.5 py-0.5 text-[10px] font-medium rounded border cv-badge-neutral"
                        >
                          {g}
                        </span>
                      ))}
                    </div>

                    <h3 className="font-display font-bold text-base sm:text-lg leading-tight line-clamp-1 cv-text">
                      {title}
                    </h3>

                    <p className="text-xs line-clamp-3 leading-relaxed italic cv-text-muted">
                      "{shortSynopsis}"
                    </p>

                    <div className="pt-1 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold cv-badge-success border px-2 py-0.5 rounded-full">
                        <Sparkles size={10} />
                        CineVault By Sasuu Official Link
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Platforms Grid */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider mb-2.5 flex items-center justify-between cv-text-muted">
                  <span>Select Social Network</span>
                  <span className="text-[10px] font-normal cv-text-subtle">
                    Opens official dialog
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Facebook */}
                  <button
                    type="button"
                    onClick={handleFacebookShare}
                    className="group flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all duration-150 cursor-pointer bg-[#1877F2]/10 hover:bg-[#1877F2] text-[#1877F2] hover:text-white border-[#1877F2]/30 hover:border-[#1877F2]"
                    title="Share to Facebook with poster, title & synopsis"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    <span className="text-xs font-bold">Facebook</span>
                  </button>

                  {/* X / Twitter */}
                  <button
                    type="button"
                    onClick={handleTwitterShare}
                    className="group flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border cv-btn-secondary transition-all duration-150 cursor-pointer"
                    title="Share to X (Twitter) with title & synopsis"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <span className="text-xs font-bold">X (Twitter)</span>
                  </button>

                  {/* WhatsApp */}
                  <button
                    type="button"
                    onClick={handleWhatsAppShare}
                    className="group flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all duration-150 cursor-pointer cv-badge-success hover:bg-[#047857] hover:text-white"
                    title="Share to WhatsApp with poster & synopsis"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                    </svg>
                    <span className="text-xs font-bold">WhatsApp</span>
                  </button>

                  {/* Telegram */}
                  <button
                    type="button"
                    onClick={handleTelegramShare}
                    className="group flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all duration-150 cursor-pointer cv-badge-info hover:bg-[#0284c7] hover:text-white"
                    title="Share to Telegram"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z" />
                    </svg>
                    <span className="text-xs font-bold">Telegram</span>
                  </button>

                  {/* Pinterest (Poster Showcase) */}
                  <button
                    type="button"
                    onClick={handlePinterestShare}
                    className="group flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all duration-150 cursor-pointer cv-badge-error hover:bg-[#BD081C] hover:text-white"
                    title="Pin movie poster to Pinterest"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 0a12 12 0 0 0-4.37 23.18c-.06-.98-.12-2.48.02-3.55l.89-3.79s-.23-.46-.23-1.14c0-1.07.62-1.87 1.39-1.87.66 0 .97.49.97 1.08 0 .66-.42 1.65-.64 2.57-.18.77.38 1.39 1.13 1.39 1.36 0 2.4-1.44 2.4-3.51 0-1.83-1.32-3.11-3.2-3.11-2.34 0-3.71 1.76-3.71 3.57 0 .71.27 1.47.61 1.88.07.08.08.15.06.24l-.23.94c-.04.15-.13.18-.29.11-1.08-.5-1.75-2.07-1.75-3.33 0-2.71 1.97-5.2 5.68-5.2 2.98 0 5.3 2.12 5.3 4.96 0 2.96-1.86 5.34-4.45 5.34-.87 0-1.69-.45-1.97-.98l-.54 2.05c-.19.75-.72 1.68-1.07 2.25A12 12 0 1 0 12 0z" />
                    </svg>
                    <span className="text-xs font-bold">Pinterest</span>
                  </button>

                  {/* Reddit */}
                  <button
                    type="button"
                    onClick={handleRedditShare}
                    className="group flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all duration-150 cursor-pointer cv-badge-warning hover:bg-[#c2410c] hover:text-white"
                    title="Submit to Reddit"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.702zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                    </svg>
                    <span className="text-xs font-bold">Reddit</span>
                  </button>

                  {/* LinkedIn */}
                  <button
                    type="button"
                    onClick={handleLinkedInShare}
                    className="group flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all duration-150 cursor-pointer cv-badge-info hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2]"
                    title="Share to LinkedIn"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                    <span className="text-xs font-bold">LinkedIn</span>
                  </button>

                  {/* Email */}
                  <button
                    type="button"
                    onClick={handleEmailShare}
                    className="group flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border cv-btn-secondary transition-all duration-150 cursor-pointer"
                    title="Send via Email"
                  >
                    <Mail size={20} />
                    <span className="text-xs font-bold">Email</span>
                  </button>
                </div>
              </div>

              {/* Quick Copy & Clipboard Tools */}
              <div className="space-y-2 pt-2 border-t cv-border-subtle">
                <div className="text-[11px] font-bold uppercase tracking-wider mb-2 cv-text-muted">
                  Copy &amp; Attach Assets
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Copy Full Formatted Synopsis Card */}
                  <button
                    type="button"
                    onClick={handleCopyCard}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      copiedType === 'card' ? 'cv-badge-success font-bold' : 'cv-btn-secondary'
                    }`}
                    title="Copy Title, Rating, Synopsis & Links formatted for Facebook/Discord/Forums"
                  >
                    {copiedType === 'card' ? (
                      <>
                        <Check size={14} />
                        <span>Synopsis Card Copied!</span>
                      </>
                    ) : (
                      <>
                        <FileText size={14} />
                        <span>Copy Formatted Synopsis</span>
                      </>
                    )}
                  </button>

                  {/* Copy Poster Image Link */}
                  <button
                    type="button"
                    onClick={handleCopyPosterUrl}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      copiedType === 'poster' ? 'cv-badge-success font-bold' : 'cv-btn-secondary'
                    }`}
                    title="Copy direct link to high-res poster image"
                  >
                    {copiedType === 'poster' ? (
                      <>
                        <Check size={14} />
                        <span>Poster URL Copied!</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon size={14} />
                        <span>Copy Poster URL</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Direct Link Input Box */}
                <div className="flex items-center gap-2 p-1.5 pl-3 rounded-xl border cv-surface-muted cv-border">
                  <span className="text-xs truncate flex-1 font-mono cv-text-secondary">
                    {shareUrl}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="shrink-0 flex items-center gap-1.5 py-1.5 px-3 cv-btn-primary rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-md"
                  >
                    {copiedType === 'link' ? (
                      <>
                        <Check size={13} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t cv-border cv-surface-muted cv-text-muted flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--cv-nav-active-bg)' }} />
            <span className="cv-text-secondary font-semibold">
              CineVault By Sasuu • 9:16 Stories &amp; Social Engine
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-bold cv-text-secondary hover:text-[var(--cv-text)] underline transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
