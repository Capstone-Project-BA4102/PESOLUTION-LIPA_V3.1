import { Briefcase } from 'lucide-react'
import { usePublicSite } from '@/lib/publicSite'

export default function AboutPage() {
  const { data } = usePublicSite()
  const office = data?.content
  return <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6">
    <div className="flex items-center gap-4"><img src="/logo-lipa.png" alt="City of Lipa official seal" className="h-16 w-16" /><div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">PESO Lipa City</h1>{office?.tagline && <p className="mt-1 text-[13.5px] font-semibold text-brand-700">{office.tagline}</p>}</div></div>
    {office?.description && <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-slate-600">{office.description}</p>}
    <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{office?.services.map(service => <figure key={service.id} className="ui-card-hover overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-[var(--ui-shadow)]">
      {service.imageUrl ? <img src={service.imageUrl} alt={service.title} className="aspect-square w-full object-cover" /> : <div className="grid aspect-square w-full place-items-center bg-slate-50 text-slate-300"><Briefcase className="h-8 w-8" /></div>}
      <figcaption className="p-4"><h2 className="text-[15px] font-semibold text-slate-900">{service.title}</h2>{service.description && <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600">{service.description}</p>}</figcaption>
    </figure>)}</section>
    <div className="mt-8 flex flex-wrap gap-4 border-t border-slate-200 pt-5 text-[12.5px] font-medium text-slate-600"><span>City of Lipa</span><span>Bagong Lipa!</span><span>Public Employment Service Office</span><span>Department of Labor and Employment</span></div>
  </div>
}
