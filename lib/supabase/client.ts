import { createBrowserClient } from '@supabase/ssr'

// 헤더 값에서 제어 문자(줄바꿈 등) 제거
function sanitizeHeaders(headers: HeadersInit | undefined): Headers {
  const result = new Headers()
  if (!headers) return result

  const raw = new Headers(headers as HeadersInit)
  raw.forEach((value, key) => {
    result.set(key, value.replace(/[\r\n\0\t]/g, '').trim())
  })
  return result
}

export function createClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/[\r\n\s]/g, '')
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/[\r\n\s]/g, '')

  return createBrowserClient(url, key, {
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const safeInit: RequestInit = {
          ...init,
          headers: sanitizeHeaders(init?.headers),
        }
        return fetch(input, safeInit)
      },
    },
  })
}
