import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type CleanupObject = { bucket: string; path: string }

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const expected = Deno.env.get('CLEANUP_WEBHOOK_SECRET')
  if (!expected || request.headers.get('x-cleanup-secret') !== expected) {
    return new Response('Unauthorized', { status: 401 })
  }

  const payload = await request.json()
  const row = payload.record
  if (!row?.id) return new Response('Missing queue record', { status: 400 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  await supabase.from('user_storage_cleanup_queue').update({
    status: 'processing', attempts: Number(row.attempts || 0) + 1, last_error: null,
  }).eq('id', row.id)

  try {
    const grouped = new Map<string, string[]>()
    for (const item of (row.objects || []) as CleanupObject[]) {
      if (!item?.bucket || !item?.path) continue
      grouped.set(item.bucket, [...(grouped.get(item.bucket) || []), item.path])
    }
    for (const [bucket, paths] of grouped) {
      const { error } = await supabase.storage.from(bucket).remove(paths)
      if (error) throw error
    }
    await supabase.from('user_storage_cleanup_queue').update({
      status: 'completed', completed_at: new Date().toISOString(), last_error: null,
    }).eq('id', row.id)
    return Response.json({ ok: true })
  } catch (error) {
    await supabase.from('user_storage_cleanup_queue').update({
      status: 'failed', last_error: String(error).slice(0, 2000),
    }).eq('id', row.id)
    return Response.json({ ok: false }, { status: 500 })
  }
})
