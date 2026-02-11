
/**
 * Optimizes Supabase storage image URLs by using the transform API.
 * 
 * @param {string} url - The original image URL
 * @param {Object} options - Optimization options
 * @param {number} [options.width] - Width in pixels
 * @param {number} [options.height] - Height in pixels
 * @param {number} [options.quality] - Quality (0-100)
 * @param {string} [options.format] - Format ('webp', 'jpg', 'png', 'avif', 'origin')
 * @param {string} [options.resize] - Resize mode ('cover', 'contain', 'fill')
 * @returns {string} The optimized URL
 */
export function getOptimizedImageUrl(url, options = {}) {
  if (!url) return '';
  if (typeof url !== 'string') return '';
  
  // Check if it's a Supabase Storage URL
  // We look for the pattern /storage/v1/object/public/ and replace it with /storage/v1/render/image/public/
  if (!url.match(/\/storage\/v1\/object\/public\//)) return url;

  // Transform /object/public/ -> /render/image/public/
  let newUrl = url.replace(/\/storage\/v1\/object\/public\//, '/storage/v1/render/image/public/');

  const params = [];
  
  if (options.width) params.push(`width=${options.width}`);
  if (options.height) params.push(`height=${options.height}`);
  if (options.quality) params.push(`quality=${options.quality}`);
  if (options.format) params.push(`format=${options.format}`);
  if (options.resize) params.push(`resize=${options.resize}`);

  if (params.length > 0) {
    // Check if URL already has query params
    const separator = newUrl.includes('?') ? '&' : '?';
    newUrl += `${separator}${params.join('&')}`;
  }

  return newUrl;
}
