import { useState } from 'react'
import { ImagePlus, Plus, RotateCcw, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Form'
import { usePT } from '@/lib/portalCopy'
import { DEFAULT_HERO_IMAGE, saveSiteContent, uploadSiteImage } from '@/lib/site'
import type { OfficeService, SiteRecord } from '@/types/site'

function ListEditor<T extends { id: string }>({ title, hint, items, fields, create, onChange }: {
  title: string; hint?: string; items: T[]; fields: { key: Exclude<keyof T, 'id'>; label: string; type?: string }[];
  create: () => T; onChange: (items: T[]) => void;
}) {
  const pt = usePT()
  return <section className="space-y-4 border-t border-slate-200 pt-6">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold">{pt(title)}</h2>{hint && <p className="mt-1 text-sm text-slate-600">{pt(hint)}</p>}</div><Button size="sm" variant="neutral" icon={<Plus className="h-4 w-4" />} onClick={() => onChange([...items, create()])}>{pt('Add')}</Button></div>
    {items.map((item, index) => <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex justify-end"><Button size="sm" variant="ghost" title={pt('Remove {section} entry', { section: pt(title).toLowerCase() })} aria-label={pt('Remove {section} entry', { section: pt(title).toLowerCase() })} onClick={() => onChange(items.filter(row => row.id !== item.id))}><Trash2 className="h-4 w-4" /></Button></div>
      <div className="grid gap-4 sm:grid-cols-2">{fields.map(field => <Input key={String(field.key)} label={field.label} type={field.type || 'text'}
        value={String(item[field.key] || '')} required={field.key === 'title'} onChange={event => onChange(items.map((row, i) => i === index ? { ...row, [field.key]: event.target.value } : row))} />)}</div>
    </div>)}
  </section>
}

function PhotoUpload({ uploading, label, onPick }: { uploading: boolean; label: string; onPick: (file?: File) => void }) {
  return <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold hover:bg-slate-50">
    <ImagePlus className="h-4 w-4" />{uploading ? '...' : label}
    <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} className="sr-only" onChange={event => { onPick(event.target.files?.[0]); event.currentTarget.value = '' }} />
  </label>
}

function ServicesEditor({ items, onChange }: { items: OfficeService[]; onChange: (items: OfficeService[]) => void }) {
  const pt = usePT()
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const update = (id: string, patch: Partial<OfficeService>) => onChange(items.map(item => item.id === id ? { ...item, ...patch } : item))
  const addPhoto = async (id: string, file?: File) => {
    if (!file) return
    setUploadingId(id)
    try { update(id, { imageUrl: await uploadSiteImage(file) }); toast.success(pt('Photo uploaded.')) }
    catch (error) { toast.error(error instanceof Error ? error.message : pt('Photo upload failed.')) }
    finally { setUploadingId(null) }
  }
  return <section className="space-y-4 border-t border-slate-200 pt-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">{pt('Services')}</h2><p className="mt-1 text-sm text-slate-600">{pt('List the programs and assistance PESO Lipa offers. A service with a photo also appears in the homepage gallery.')}</p></div>
      <Button size="sm" variant="neutral" icon={<Plus className="h-4 w-4" />} onClick={() => onChange([...items, { id: crypto.randomUUID(), title: '', description: '', imageUrl: '' }])}>{pt('Add')}</Button></div>
    {items.map(item => <article key={item.id} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 lg:grid-cols-[12rem_1fr]">
      <div className="space-y-3">
        {item.imageUrl
          ? <img src={item.imageUrl} alt="" className="aspect-square w-full rounded-md border border-slate-200 object-cover" />
          : <div className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-500">{pt('No photo yet')}</div>}
        <div className="flex flex-wrap gap-2">
          <PhotoUpload uploading={uploadingId === item.id} label={item.imageUrl ? pt('Replace Photo') : pt('Upload Photo')} onPick={file => void addPhoto(item.id, file)} />
          {item.imageUrl && <Button size="sm" variant="ghost" onClick={() => update(item.id, { imageUrl: '' })} icon={<Trash2 className="h-4 w-4" />}>{pt('Remove Photo')}</Button>}
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex justify-end"><Button size="sm" variant="ghost" title={pt('Remove service')} aria-label={pt('Remove service')} onClick={() => onChange(items.filter(row => row.id !== item.id))}><Trash2 className="h-4 w-4" /></Button></div>
        <Input label="Service Name" value={item.title} required onChange={event => update(item.id, { title: event.target.value })} />
        <Textarea label="Description" rows={3} value={item.description} onChange={event => update(item.id, { description: event.target.value })} />
      </div>
    </article>)}
  </section>
}

export const SITE_CONTENT_FORM_ID = 'peso-site-content-form'

export function OfficeContentEditor({ record, onSavingChange }: { record: SiteRecord; onSavingChange?: (saving: boolean) => void }) {
  const pt = usePT()
  const [content, setContent] = useState(record.content)
  const [uploadingHero, setUploadingHero] = useState(false)
  const update = (key: keyof typeof content, value: string) => setContent(current => ({ ...current, [key]: value }))
  const changeHero = async (file?: File) => {
    if (!file) return
    setUploadingHero(true)
    try { update('heroImage', await uploadSiteImage(file)); toast.success(pt('Homepage background updated. Press Save Changes to publish it.')) }
    catch (error) { toast.error(error instanceof Error ? error.message : pt('Photo upload failed.')) }
    finally { setUploadingHero(false) }
  }
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); onSavingChange?.(true)
    try { await saveSiteContent(content); toast.success(pt('Public website updated.')) }
    catch (error) { toast.error(error instanceof Error ? error.message : pt('Content could not be saved.')) }
    finally { onSavingChange?.(false) }
  }
  return <form id={SITE_CONTENT_FORM_ID} onSubmit={save} className="space-y-6">
    <section className="space-y-4"><h2 className="text-lg font-bold">{pt('Office Information')}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Office Name" value={content.title} onChange={e => update('title', e.target.value)} required />
        <Input label="Tagline" value={content.tagline} onChange={e => update('tagline', e.target.value)} required />
        <Input label="Address" value={content.address} onChange={e => update('address', e.target.value)} />
        <Input label="Telephone" value={content.telephone} onChange={e => update('telephone', e.target.value)} />
        <Input label="Email" type="email" value={content.email} onChange={e => update('email', e.target.value)} />
        <Input label="Office Hours" value={content.officeHours} onChange={e => update('officeHours', e.target.value)} />
        <Input label="Facebook Page Name" value={content.facebookLabel} onChange={e => update('facebookLabel', e.target.value)} />
        <Input label="Facebook URL" type="url" value={content.facebookUrl} onChange={e => update('facebookUrl', e.target.value)} />
      </div>
      <Textarea label="Introduction" rows={3} value={content.description} onChange={e => update('description', e.target.value)} />
      <div>
        <p className="mb-2 text-sm font-bold text-slate-800">{pt('Homepage Cover Photo')}</p>
        <div className="relative isolate overflow-hidden rounded-lg border border-slate-200">
          <label className="group relative flex min-h-[220px] w-full cursor-pointer items-end md:min-h-[290px]">
            <img src={content.heroImage || DEFAULT_HERO_IMAGE} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-[center_28%]" />
            <span className="absolute inset-0 -z-10 bg-ink/70" />
            <span className="p-6 text-white">
              <span className="block text-sm font-bold uppercase">{content.title || 'Lipa City Public Employment Service Office'}</span>
              <span className="mt-2 block text-2xl font-bold leading-tight md:text-3xl">{content.tagline || 'Oportunidad para sa bawat Lipeño'}</span>
            </span>
            <span className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-lg bg-white/95 px-4 py-2 text-sm font-semibold text-slate-800 shadow transition group-hover:bg-white">
              <ImagePlus className="h-4 w-4" />{uploadingHero ? pt('Uploading...') : pt('Change Cover Photo')}
            </span>
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingHero} className="sr-only"
              onChange={event => { void changeHero(event.target.files?.[0]); event.currentTarget.value = '' }} />
          </label>
          {content.heroImage && <Button size="sm" variant="neutral" className="absolute bottom-4 right-4 shadow"
            onClick={() => update('heroImage', '')} icon={<RotateCcw className="h-4 w-4" />}>{pt('Use Default Photo')}</Button>}
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{pt('This photo is the background at the top of the public homepage. Click it to upload a new one. Without a photo here, the official Lipa City Hall image is used.')}</p>
      </div>
    </section>
    <ServicesEditor items={content.services} onChange={services => setContent(current => ({ ...current, services }))} />
    <ListEditor title="Announcements" hint="Posted on the homepage. Only announcements dated today or earlier are shown." items={content.announcements} fields={[{ key: 'title', label: 'Title' }, { key: 'body', label: 'Announcement' }, { key: 'publishedAt', label: 'Publication Date', type: 'date' }, { key: 'url', label: 'Official Link', type: 'url' }]}
      create={() => ({ id: crypto.randomUUID(), title: '', body: '', publishedAt: new Date().toISOString().slice(0, 10), url: '' })} onChange={announcements => setContent(current => ({ ...current, announcements }))} />
  </form>
}
