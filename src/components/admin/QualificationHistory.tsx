import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { fetchQualificationVersions } from '@/lib/renewals'
import { useQuery } from '@/lib/useQuery'
import { usePT } from '@/lib/portalCopy'
import { QualificationComparison } from './QualificationComparison'
import { ErrorBlock, LoadingBlock } from '@/components/shared'
import { Button, Modal } from '@/components/ui'
import { supabase } from '@/lib/supabase'

export function QualificationHistory({ applicantId }: { applicantId: string }) {
  const pt = usePT()
  const load = useCallback(() => fetchQualificationVersions(applicantId), [applicantId])
  const { data, loading, error, reload } = useQuery(load, [applicantId])
  const [preview, setPreview] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)
  const viewResume = async (path?: string) => {
    if (!path || opening) return
    setOpening(true)
    try {
      const result = await supabase.storage.from('resumes').createSignedUrl(path.replace(/^resumes\//, ''), 600)
      if (result.error) throw result.error
      setPreview(result.data.signedUrl)
    } catch { toast.error(pt('This resume could not be opened. Please retry.')) }
    finally { setOpening(false) }
  }
  if (loading && !data) return <LoadingBlock label={pt('Loading qualification history...')} />
  if (error) return <ErrorBlock message={error} onRetry={reload} />
  return <section className="mb-5 space-y-3 border-b border-slate-200 pb-4">
    <h3 className="text-sm font-bold text-slate-900">{pt('Qualification versions')}</h3>
    {!data?.length && <p className="text-xs text-slate-500">{pt('No confirmed re-registration versions yet. Earlier resumes have not been reconstructed as historical qualifications.')}</p>}
    {data?.map(version => <details key={version.id} className="rounded-md border border-slate-200">
      <summary className="cursor-pointer px-3 py-2 text-[13px] font-semibold text-slate-800">
        {pt('Renewal version {version}', { version: version.version_no })}
        <span className="mt-1 block text-xs font-normal text-slate-500">{new Date(version.created_at).toLocaleString()} · {version.staff_name}</span>
      </summary>
      <div className="space-y-3 border-t border-slate-200 p-3">
        <QualificationComparison before={version.before_snapshot} after={version.after_snapshot} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="neutral" disabled={opening || !version.before_snapshot.resume?.file_path} onClick={() => void viewResume(version.before_snapshot.resume?.file_path)}>{pt('View Previous Resume')}</Button>
          <Button size="sm" variant="neutral" disabled={opening || !version.after_snapshot.resume?.file_path} onClick={() => void viewResume(version.after_snapshot.resume?.file_path)}>{pt('View Updated Resume')}</Button>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-xs">{Object.entries(version.changes.fields).filter(([key]) => !['education','course','school'].includes(key)).map(([key, change]) => <div key={key} className="min-w-0"><dt className="font-semibold text-slate-600">{pt(key.replace(/_/g, ' '))}</dt><dd className="break-words text-slate-500">{change.before || '—'} → {change.after || '—'}</dd></div>)}</dl>
        <p className="text-xs leading-relaxed text-slate-500">{pt('Prior applications, referrals and saved matching evidence are retained as observed before this renewal. Missing historical similarity values are not recreated.')}</p>
        <p className="text-xs text-slate-500">{pt('Retained records')}: {version.prior_records.applications?.length || 0} {pt('applications')} · {version.prior_records.referrals?.length || 0} {pt('referrals')} · {version.prior_records.matches?.length || 0} {pt('saved matches')}</p>
      </div>
    </details>)}
    <Modal open={!!preview} onClose={() => setPreview(null)} size="lg" title={pt('Resume Preview')}>
      {preview && <iframe title={pt('Resume Preview')} src={preview} className="h-[65vh] w-full rounded-md border border-slate-200" />}
    </Modal>
  </section>
}
