let cachedBase: string | null = null
let cachedAt = 0

const MAX_AGE_MS = 1000 * 60 * 30 // 30 minutes

export function getEnvBase(): string {
  const base = process.env.GAS_BASE_URL
  if (!base) throw new Error('GAS_BASE_URL not configured')
  return base.replace(/\/$/, '')
}

export function joinPath(base: string, path: string): string {
  if (path.startsWith('?')) {
    const joiner = base.includes('?') ? '&' : '?'
    return `${base}${joiner}${path.slice(1)}`
  }
  return `${base}${path}`
}

export function getGasBase(): string {
  if (cachedBase && Date.now() - cachedAt < MAX_AGE_MS) return cachedBase
  return getEnvBase()
}

export function setGasBase(newBase: string) {
  cachedBase = newBase.replace(/\/$/, '')
  cachedAt = Date.now()
}

// Observe a response and learn the googleusercontent echo base, if present
export function learnFromResponse(res: Response) {
  try {
    const finalUrl = res.url
    if (!finalUrl) return
    if (finalUrl.includes('script.googleusercontent.com/macros/echo')) {
      const u = new URL(finalUrl)
      // Remove the dynamic operation params we add per request
      u.searchParams.delete('op')
      u.searchParams.delete('refKey')
      u.searchParams.delete('apiKey')
      const base = `${u.origin}${u.pathname}?${u.searchParams.toString()}`
      setGasBase(base)
    }
  } catch {}
}

