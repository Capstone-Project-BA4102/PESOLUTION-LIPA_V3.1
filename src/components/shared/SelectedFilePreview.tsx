import { useEffect, useState } from 'react'
import { usePT } from '@/lib/portalCopy'

/** Local preview only: selecting a file never uploads it to storage. */
export function SelectedFilePreview({ file, avatar = false }: { file: File | null; avatar?: boolean }) {
  const pt = usePT()
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null)
  useEffect(() => {
    if (!file) return
    if (!(file.type.startsWith('image/') || file.type === 'application/pdf')) return
    const url = URL.createObjectURL(file)
    setPreview({ file, url })
    return () => URL.revokeObjectURL(url)
  }, [file])
  if (!file || preview?.file !== file) return null
  return <figure className="mt-3 overflow-hidden rounded-card border border-slate-200 bg-slate-50 p-3">
    <figcaption className="mb-2 flex flex-wrap items-center justify-between gap-1 text-[12px] text-slate-500"><span className="font-medium">{pt('Selected file preview')}</span><span>{pt('Not saved yet')}</span></figcaption>
    {file.type === 'application/pdf' ? <object data={preview.url} type="application/pdf" aria-label={pt('Resume Preview')} className="h-[300px] w-full rounded-md bg-white"><a href={preview.url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-700 underline">{pt('Open selected PDF preview')}</a></object> : <img src={preview.url} alt={pt(avatar ? 'Selected avatar preview' : 'Selected resume preview')} className={avatar ? 'h-[112px] w-[112px] rounded-md object-cover' : 'max-h-[300px] w-full rounded-md object-contain'} />}
    <p className="mt-2 break-all text-[12px] text-slate-600">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>
  </figure>
}
