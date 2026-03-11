import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 })

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkPreview/1.0)' },
      signal: AbortSignal.timeout(5000),
    })
    const html = await res.text()

    const getOg = (property: string) => {
      const m =
        html.match(new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']+)["']`, 'i')) ||
        html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:${property}["']`, 'i'))
      return m?.[1]?.trim() || null
    }

    const titleMatch =
      getOg('title') ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
      null

    const faviconMatch =
      html.match(/<link[^>]*rel=["']icon["'][^>]*href=["']([^"']+)["']/i)?.[1] ||
      html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']icon["']/i)?.[1] ||
      null

    let favicon = faviconMatch
    if (favicon && !favicon.startsWith('http')) {
      try {
        const origin = new URL(url).origin
        favicon = favicon.startsWith('/') ? origin + favicon : origin + '/' + favicon
      } catch {}
    }

    return NextResponse.json({
      title: titleMatch,
      description: getOg('description'),
      image: getOg('image'),
      favicon,
      url,
    }, {
      headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
