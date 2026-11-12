import { Briefcase } from 'lucide-react'
import { usePublicSite } from '@/lib/publicSite'

export default function AboutPage() {
  const { data } = usePublicSite()
  const office = data?.content
  return <div className="mx-auto max-w-7xl px-6 py-10">
    <div className="flex items-center gap-4"><img src="/logo-lipa.png" alt="City of Lipa official seal" className="h-20 w-20" /><div><h1 className="text-3xl font-bold">PESO Lipa City</h1>{office?.tagline && <p className="mt-2 font-semibold text-brand-700">{office.tagline}</p>}</div></div>
    {office?.description && <p className="mt-8 max-w-3xl text-lg text-slate-600">{office.description}</p>}
    <section className="mt-10 grid gap-8 md:grid-cols-3">{office?.services.map(service => <div key={service.id} className="border-t border-slate-200 pt-5">{service.imageUrl && <img src={service.imageUrl} alt={service.title} className="mb-4 aspect-[4/3] w-full rounded-lg border border-slate-200 object-cover" />}<Briefcase className="mb-3 h-5 w-5 text-brand-700" /><h2 className="text-lg font-bold">{service.title}</h2><p className="mt-2 text-slate-600">{service.description}</p></div>)}</section>
    <div className="mt-10 flex flex-wrap gap-5 border-t border-slate-200 pt-6 text-sm font-semibold text-slate-600"><span>City of Lipa</span><span>Bagong Lipa!</span><span>Public Employment Service Office</span><span>Department of Labor and Employment</span></div>
  </div>
}
