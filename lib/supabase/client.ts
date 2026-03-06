import { createBrowserClient } from '@supabase/ssr'

function cleanStr(s: string): string {
  return s.replace(/[\r\n\0]/g, '').trim()
}

// new Headers()를 쓰지 않고 plain object로 직접 처리
function safeHeaders(headers: HeadersInit | undefined): Record<string, string> {
  const result: Record<string, string> = {}
  if (!headers) return result

  if (headers instanceof Headers) {
    headers.forEach((v, k) => { result[k] = cleanStr(v) })
  } else if (Array.isArray(headers)) {
    for (const [k, v] of headers) { result[k] = cleanStr(v) }
  } else {
    for (const [k, v] of Object.entries(headers as Record<string, string>)) {
      result[k] = cleanStr(v)
    }
  }
  return result
}

export function createClient() {
  const url = cleanStr(process.env.NEXT_PUBLIC_SUPABASE_URL || '')
  const key = cleanStr(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')

  return createBrowserClient(url, key, {
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        return fetch(input, {
          ...init,
          headers: safeHeaders(init?.headers),
        })
      },
    },
  })
}
