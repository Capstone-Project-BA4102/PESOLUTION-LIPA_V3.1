import { supabase } from './supabase'

const origin = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '')

export async function backendRequest<T>(path: string, options: { method?: string; body?: unknown; authenticated?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (options.authenticated !== false) {
    const { data, error } = await supabase.auth.getSession()
    if (error || !data.session) throw new Error('Please sign in to continue.')
    headers.Authorization = `Bearer ${data.session.access_token}`
  }
  let response: Response
  try {
    response = await fetch(`${origin}/api${path}`, { method: options.method || 'GET', headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body), signal: AbortSignal.timeout(180000) })
  } catch (failure) {
    const timedOut = failure instanceof Error && failure.name === 'TimeoutError'
    throw new Error(timedOut
      ? 'The AI service took too long to answer. Please run matching again in a moment.'
      : 'The PESOLUTION service could not be reached. Please retry or contact PESO.')
  }
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401 && options.authenticated !== false) await supabase.auth.signOut({ scope: 'local' })
    // Our API always answers errors as JSON, so a body we cannot read means the dev proxy
    // or a stopped backend replied instead.
    const message = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : 'The PESOLUTION service could not be reached. Please retry or contact PESO.'
    throw new Error(message)
  }
  return data as T
}

export async function backendJsonlUpload<T>(path: string, file: File): Promise<T> {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) throw new Error('Please sign in to continue.')
  let response: Response
  try {
    response = await fetch(`${origin}/api${path}`, { method: 'POST', headers: {
      'Content-Type': 'application/x-ndjson', Authorization: `Bearer ${data.session.access_token}`, 'X-Dataset-Filename': file.name,
    }, body: file, signal: AbortSignal.timeout(180000) })
  } catch (failure) {
    throw new Error(failure instanceof Error && failure.name === 'TimeoutError' ? 'The dataset upload took too long.' : 'The PESOLUTION service could not be reached.')
  }
  const value: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = value && typeof value === 'object' && 'error' in value && typeof value.error === 'string' ? value.error : 'The dataset could not be imported.'
    throw new Error(message)
  }
  return value as T
}

export async function backendCsvUpload<T>(path: string, file: File): Promise<T> {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) throw new Error('Please sign in to continue.')
  const response = await fetch(`${origin}/api${path}`, { method: 'POST', headers: {
    'Content-Type': 'text/csv', Authorization: `Bearer ${data.session.access_token}`, 'X-Dataset-Filename': file.name,
  }, body: file, signal: AbortSignal.timeout(180000) }).catch(() => { throw new Error('The PESOLUTION service could not be reached.') })
  const value: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = value && typeof value === 'object' && 'error' in value && typeof value.error === 'string' ? value.error : 'The CSV dataset could not be imported.'
    throw new Error(message)
  }
  return value as T
}

export function fileToUpload(file: File): Promise<{ mimeType: string; base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({ mimeType: file.type, base64: String(reader.result).split(',')[1] || '' })
    reader.onerror = () => reject(new Error('The selected file could not be read.'))
    reader.readAsDataURL(file)
  })
}
