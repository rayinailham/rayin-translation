// Vercel Edge Middleware – serves OG-enriched HTML to social-media crawlers
// so link previews show the novel cover instead of the generic site logo.

const SUPABASE_URL = 'https://ykceernevnnsbncuhygl.supabase.co'
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrY2Vlcm5ldm5uc2JuY3VoeWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjQ1MTIsImV4cCI6MjA4NjE0MDUxMn0.QmZIlyBXWSz0m6Pg61xBFEKyTVE3dQxWCRj3fTVujGw'

const BOT_UA = [
  'facebookexternalhit',
  'facebot',
  'twitterbot',
  'linkedinbot',
  'slackbot',
  'discordbot',
  'whatsapp',
  'telegrambot',
  'googlebot',
  'bingbot',
  'applebot',
  'pinterestbot',
  'redditbot',
  'embedly',
  'showyoubot',
  'outbrain',
  'vkshare',
  'w3c_validator',
  'kakaotalk-scrap',
  'naverbot',
  'yandexbot',
  'rogerbot',
  'seznambot',
]

function isBot(ua) {
  const lower = (ua || '').toLowerCase()
  return BOT_UA.some((bot) => lower.includes(bot))
}

/** Escape characters that could break HTML attribute values */
function esc(str) {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Trim description to ~200 chars on a word boundary */
function trimDesc(str, max = 200) {
  if (!str) return ''
  const clean = str.replace(/\n+/g, ' ').trim()
  if (clean.length <= max) return clean
  return clean.slice(0, max).replace(/\s+\S*$/, '') + '…'
}

export const config = {
  matcher: ['/novel/:slug'],
}

export default async function middleware(request) {
  const ua = request.headers.get('user-agent') || ''

  // Let normal visitors through to the SPA
  if (!isBot(ua)) return undefined // next()

  // Extract the slug from the URL
  const url = new URL(request.url)
  const parts = url.pathname.split('/').filter(Boolean) // ['novel', '<slug>']
  const slug = parts[1]
  if (!slug) return undefined

  // Don't intercept chapter routes like /novel/slug/3
  if (parts.length > 2) return undefined

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/novels?slug=eq.${encodeURIComponent(slug)}&select=title,synopsis,image_url,author_romaji,author`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    )

    const data = await res.json()
    const novel = Array.isArray(data) ? data[0] : null
    if (!novel) return undefined

    const title = esc(novel.title || 'Rayin Translation')
    const author = esc(novel.author_romaji || novel.author || '')
    const description = esc(
      trimDesc(novel.synopsis) ||
        `Read ${novel.title} translated to English at Rayin Translation`
    )
    const image = novel.image_url || `${url.origin}/Logo%20Rayin%20Translation.png`
    const pageUrl = url.href
    const siteName = 'Rayin Translation'

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} — ${siteName}</title>
  <meta name="description" content="${description}">

  <!-- Open Graph -->
  <meta property="og:type" content="book">
  <meta property="og:url" content="${esc(pageUrl)}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${esc(image)}">
  <meta property="og:image:width" content="600">
  <meta property="og:image:height" content="900">
  <meta property="og:site_name" content="${siteName}">
  ${author ? `<meta property="book:author" content="${author}">` : ''}

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${esc(image)}">

  <!-- Redirect real browsers that somehow land here -->
  <meta http-equiv="refresh" content="0;url=${esc(pageUrl)}">
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  <p><a href="${esc(pageUrl)}">Read on ${siteName}</a></p>
</body>
</html>`

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    })
  } catch {
    // On any error, fall through to the SPA
    return undefined
  }
}
