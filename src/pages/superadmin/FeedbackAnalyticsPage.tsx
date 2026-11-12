import { useCallback, useMemo, useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import { BrainCircuit, CheckCircle2, CircleHelp, MessageSquareText, RefreshCw, Star, UsersRound } from 'lucide-react'
import { Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { LoadingBlock, ErrorBlock } from '@/components/shared/QueryState'
import { useQuery } from '@/lib/useQuery'
import { backendRequest } from '@/lib/backend'
import { usePT } from '@/lib/portalCopy'
import { StarRating } from '@/components/ui/StarRating'
import { usePublicPreferences } from '@/lib/publicPreferences'

type Sentiment = 'positive' | 'neutral' | 'negative'
type RecordRow = { id:string; rating:number; feedback_text:string; submitted_at:string; sentiment_status:string; sentiment_label?:Sentiment; sentiment_confidence?:number; applications?: { job_listings?: { title?:string; companies?:{name?:string} }; applicants?:{full_name?:string} } }
type Trend = {month:string;positive:number;neutral:number;negative:number}
type Analytics = { total:number; eligible:number; responseRate:number; averageRating:number|null; pending:number; distribution:Record<Sentiment,number>; trends:Trend[]; records:RecordRow[]; inferenceReady?:boolean }

const sentimentName: Record<Sentiment,string> = { positive:'Positive', neutral:'Neutral', negative:'Needs attention' }

export default function FeedbackAnalyticsPage() {
  const pt = usePT()
  const { locale, theme } = usePublicPreferences()
  const fetcher = useCallback(() => backendRequest<Analytics>('/admin/feedback-analytics'), [])
  const { data, loading, error, reload } = useQuery(fetcher, [])
  const [filter,setFilter] = useState('all')
  const [confirmOpen,setConfirmOpen] = useState(false)
  const [analyzing,setAnalyzing] = useState(false)
  const [refreshedAt] = useState(() => new Date())
  const records = useMemo(() => (data?.records || []).filter(row => filter === 'all' || (filter === 'pending' ? row.sentiment_status === 'pending' : row.sentiment_label === filter)), [data,filter])
  const waiting = useMemo(() => (data?.records || []).filter(row => row.sentiment_status === 'pending'), [data])

  const analyzeWaiting = async () => {
    setAnalyzing(true)
    try {
      const result = await backendRequest<{ checked:number; classified:number; stillPending:number; reason:string|null }>('/admin/feedback/reclassify', { method:'POST' })
      if (!result.checked) toast.success(pt('No feedback is waiting for analysis.'))
      else if (result.classified) toast.success(pt('{classified} of {checked} comments analyzed.', { classified: result.classified, checked: result.checked }))
      else toast.error(result.reason === 'not-configured' ? pt('The sentiment service is not configured on the server, so nothing could be analyzed.') : pt('The sentiment service did not answer. The comments stay Waiting and can be analyzed again in a minute.'))
      setConfirmOpen(false)
      await reload()
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : pt('The sentiment service could not be reached.'))
    } finally {
      setAnalyzing(false)
    }
  }
  if (loading) return <LoadingBlock label={pt('Loading feedback dashboard...')} />
  if (error) return <ErrorBlock message={error} onRetry={reload} />

  const total = data?.total || 0
  const eligible = data?.eligible || 0
  const pending = data?.pending || 0
  const analyzed = Math.max(0,total-pending)
  const response = Math.round((data?.responseRate||0)*100)
  const palette: Record<Sentiment,string> = theme === 'dark'
    ? { positive:'#22c55e', neutral:'#94a3b8', negative:'#f87171' }
    : { positive:'#16803a', neutral:'#64748b', negative:'#c81e1e' }
  const chartText = theme === 'dark' ? '#cbd5e1' : '#475569'
  const chartGrid = theme === 'dark' ? '#475569' : '#cbd5e1'
  const tooltipStyle = { backgroundColor: theme === 'dark' ? '#182536' : '#ffffff', border: `1px solid ${chartGrid}`, borderRadius: 4, color: theme === 'dark' ? '#f8fafc' : '#0f172a' }
  const sentimentData = (['positive','neutral','negative'] as Sentiment[]).map(key=>({key,name:pt(sentimentName[key]),value:data?.distribution[key]||0,color:palette[key]}))
  const dateLocale = locale === 'fil' ? 'fil-PH' : 'en-PH'
  const refreshed = refreshedAt.toLocaleTimeString(dateLocale, {hour:'2-digit',minute:'2-digit'})

  return <div className="space-y-5">
    <PageHeader title={pt('Feedback Analytics')} description={pt('Operational view of hired-applicant participation, service ratings, and written sentiment.')} />

    <div className="flex flex-wrap items-end justify-between gap-4 border-y border-slate-300 bg-white px-4 py-3">
      <div className="flex flex-wrap gap-3"><label className="text-xs font-bold uppercase text-slate-500">{pt('Sentiment')}<select value={filter} onChange={e=>setFilter(e.target.value)} className="mt-1 block min-w-44 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold normal-case text-slate-900"><option value="all">{pt('All feedback')}</option><option value="positive">{pt('Positive')}</option><option value="neutral">{pt('Neutral')}</option><option value="negative">{pt('Needs attention')}</option><option value="pending">{pt('Waiting for analysis')}</option></select></label><div className="text-xs font-bold uppercase text-slate-500">{pt('Scope')}<span className="mt-1 block min-w-44 rounded border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold normal-case text-slate-900">{pt('Hired applicants only')}</span></div></div>
      <div className="flex flex-wrap items-center gap-2">{pending > 0 && (data?.inferenceReady
        ? <Button variant="secondary" size="sm" icon={<BrainCircuit className="h-4 w-4"/>} onClick={() => setConfirmOpen(true)}>{pt('Analyze waiting feedback')}</Button>
        : <span className="flex items-center gap-2 rounded bg-warning-50 px-3 py-2 text-xs font-semibold text-warning-700"><CircleHelp className="h-4 w-4 shrink-0"/>{pt('The sentiment model runs on the office computer. Open the portal there to analyze waiting feedback.')}</span>)}<button type="button" onClick={reload} className="flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"><RefreshCw className="h-4 w-4"/>{pt('Refresh data')}</button></div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi icon={<MessageSquareText/>} label={pt('Feedback received')} value={total} context={pt('{total} of {eligible} hired applicants',{total,eligible})} />
      <Kpi icon={<UsersRound/>} label={pt('Response rate')} value={`${response}%`} context={pt('{total} responses ÷ {eligible} eligible',{total,eligible})} accent="red" />
      <Kpi icon={<Star className="text-warning-600"/>} label={pt('Average rating')} value={data?.averageRating==null?'N/A':data.averageRating.toFixed(2)} context={pt('Out of 5 stars')} accent="gold" />
      <Kpi icon={pending?<BrainCircuit/>:<CheckCircle2/>} label={pt('Analysis status')} value={pending?pt('{pending} waiting',{pending}):pt('Up to date')} context={pt('{analyzed} of {total} comments analyzed',{analyzed,total})} accent={pending?'gold':'green'} />
    </div>

    <div className="grid gap-4 xl:grid-cols-12">
      <Panel title={pt('Response overview')} subtitle={pt('From hired applicants to analyzed comments')} className="xl:col-span-5">
        <div className="space-y-5 pt-2"><ProgressRow label={pt('Eligible to respond')} value={eligible} max={eligible} color="bg-slate-500"/><ProgressRow label={pt('Submitted feedback')} value={total} max={eligible} color="bg-brand-600"/><ProgressRow label={pt('Sentiment analyzed')} value={analyzed} max={eligible} color="bg-success-600"/></div>
        <div className="mt-6 grid grid-cols-3 border-t pt-4 text-center"><Mini value={eligible} label={pt('Hired')}/><Mini value={total} label={pt('Responded')}/><Mini value={analyzed} label={pt('Analyzed')}/></div>
      </Panel>

      <Panel title={pt('Sentiment mix')} subtitle={pt('Based only on written comments')} className="xl:col-span-4">
        <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={sentimentData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>{sentimentData.map(item=><Cell key={item.key} fill={item.color}/>)}</Pie><Tooltip contentStyle={tooltipStyle} labelStyle={{color:chartText}} itemStyle={{color:chartText}}/><Legend verticalAlign="bottom" height={32} formatter={value=><span style={{color:chartText}}>{value}</span>}/><text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-900 text-3xl font-bold">{analyzed}</text><text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-500 text-xs">{pt('analyzed')}</text></PieChart></ResponsiveContainer></div>
      </Panel>

      <Panel title={pt('Service rating')} subtitle={pt(total===1?'{total} submitted rating':'{total} submitted ratings',{total})} className="xl:col-span-3">
        <div className="flex h-64 flex-col items-center justify-center"><p className="text-6xl font-bold text-brand-700">{data?.averageRating==null?'—':data.averageRating.toFixed(1)}</p><div className="mt-5"><StarRating value={data?.averageRating ?? 0} /></div><p className="mt-4 text-sm text-slate-500">{pt('Star rating is separate from sentiment')}</p></div>
      </Panel>

      <Panel title={pt('Sentiment trend')} subtitle={pt('Monthly classified feedback')} className="xl:col-span-12">
        {data?.trends?.length ? <div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.trends} margin={{top:15,right:20,left:-15,bottom:0}}><XAxis dataKey="month" tick={{fill:chartText}} axisLine={{stroke:chartGrid}} tickLine={{stroke:chartGrid}}/><YAxis allowDecimals={false} tick={{fill:chartText}} axisLine={{stroke:chartGrid}} tickLine={{stroke:chartGrid}}/><Tooltip contentStyle={tooltipStyle} labelStyle={{color:chartText}} itemStyle={{color:chartText}}/><Legend formatter={value=><span style={{color:chartText}}>{value}</span>}/><Line type="monotone" dataKey="positive" name={pt('Positive')} stroke={palette.positive} strokeWidth={3}/><Line type="monotone" dataKey="neutral" name={pt('Neutral')} stroke={palette.neutral} strokeWidth={3}/><Line type="monotone" dataKey="negative" name={pt('Needs attention')} stroke={palette.negative} strokeWidth={3}/></LineChart></ResponsiveContainer></div> : <div className="grid h-52 place-items-center text-center text-slate-500"><div><BrainCircuit className="mx-auto h-8 w-8"/><p className="mt-3 font-semibold">{pt('Trend will appear after feedback is collected across multiple months.')}</p></div></div>}
      </Panel>
    </div>

    <Panel title={pt('Feedback details')} subtitle={pt(records.length===1?'{count} record in this view':'{count} records in this view',{count:records.length})}>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead><tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500"><th className="px-4 py-3">{pt('Applicant')}</th><th className="px-4 py-3">{pt('Job placement')}</th><th className="px-4 py-3">{pt('Rating')}</th><th className="px-4 py-3">{pt('Written feedback')}</th><th className="px-4 py-3">{pt('Sentiment')}</th><th className="px-4 py-3">{pt('Submitted')}</th></tr></thead><tbody>{records.map(row=><tr key={row.id} className="border-b align-top last:border-0 hover:bg-slate-50"><td className="px-4 py-4 font-bold">{row.applications?.applicants?.full_name||pt('Applicant')}</td><td className="px-4 py-4"><p className="font-semibold">{row.applications?.job_listings?.title||'—'}</p><p className="text-slate-500">{row.applications?.job_listings?.companies?.name||'—'}</p></td><td className="px-4 py-4"><StarRating value={row.rating} size="sm"/><span className="mt-1 block text-xs text-slate-500">{row.rating}/5</span></td><td className="max-w-xl px-4 py-4 leading-6">{row.feedback_text}</td><td className="px-4 py-4"><SentimentBadge row={row} pt={pt}/>{row.sentiment_confidence!=null&&<p className="mt-1 text-xs text-slate-500">{pt('{confidence}% confidence',{confidence:(row.sentiment_confidence*100).toFixed(1)})}</p>}</td><td className="whitespace-nowrap px-4 py-4 text-slate-500">{new Date(row.submitted_at).toLocaleDateString(dateLocale)}<br/>{new Date(row.submitted_at).toLocaleTimeString(dateLocale,{hour:'2-digit',minute:'2-digit'})}</td></tr>)}</tbody></table>{!records.length&&<p className="p-10 text-center text-slate-500">{pt('No feedback matches the selected filter.')}</p>}</div>
    </Panel>

    <details className="group border-t border-slate-300 py-4"><summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-slate-600"><CircleHelp className="h-4 w-4"/>{pt('Metric definitions and model transparency')}</summary><div className="mt-4 grid gap-4 text-sm leading-6 text-slate-600 md:grid-cols-3"><p><strong className="text-slate-900">{pt('Response rate:')}</strong> {pt('{total} submitted ÷ {eligible} hired = {response}%.',{total,eligible,response})}</p><p><strong className="text-slate-900">{pt('Sentiment:')}</strong> {pt('XLM-R reads only written feedback. Star ratings never determine the label.')}</p><p><strong className="text-slate-900">{pt('Last refreshed:')}</strong> {pt('{time}. Pending comments remain stored but are excluded until analyzed.',{time:refreshed})}</p></div></details>
    <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title={pt('Analyze waiting feedback')}
      footer={<div className="flex justify-end gap-2"><Button variant="neutral" onClick={() => setConfirmOpen(false)} disabled={analyzing}>{pt('Cancel')}</Button><Button variant="primary" onClick={analyzeWaiting} disabled={analyzing}>{analyzing ? pt('Analyzing…') : pt('Yes, analyze {n} comment{s}', { n: pending, s: pending === 1 ? '' : 's' })}</Button></div>}>
      <p className="text-lg text-slate-700">{pt('PESOLUTION reads these Waiting comments again with XLM-R and stores the sentiment label.')}</p>
      <ul className="mt-3 space-y-1 text-base text-slate-600">{waiting.slice(0,3).map(row=><li key={row.id}><b className="text-slate-900">{row.applications?.applicants?.full_name||pt('Applicant')}</b> — {row.applications?.job_listings?.title||'—'}{row.applications?.job_listings?.companies?.name ? <span className="text-slate-500"> · {row.applications.job_listings.companies.name}</span> : null}</li>)}{waiting.length>3&&<li>{pt('and {n} more',{n:waiting.length-3})}</li>}</ul>
      <p className="mt-4 text-base text-slate-600">{pt('Comments written while the sentiment service was offline stay Waiting until this runs. Star ratings are never changed and nothing is sent to the applicants.')}</p>
    </Modal>
  </div>
}

function Kpi({icon,label,value,context,accent='navy'}:{icon:ReactNode;label:string;value:string|number;context:string;accent?:'navy'|'red'|'gold'|'green'}) { const colors={navy:'border-t-slate-700 text-slate-700',red:'border-t-brand-600 text-brand-700',gold:'border-t-warning-500 text-warning-700',green:'border-t-success-600 text-success-700'};return <section className={`border border-t-4 border-slate-300 bg-white p-4 ${colors[accent]}`}><div className="flex items-center justify-between"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><span className="h-5 w-5">{icon}</span></div><p className="mt-3 text-3xl font-bold text-slate-950">{value}</p><p className="mt-1 text-sm text-slate-500">{context}</p></section> }
function Panel({title,subtitle,children,className=''}:{title:string;subtitle:string;children:ReactNode;className?:string}) { return <section className={`border border-slate-300 bg-white ${className}`}><header className="border-b border-slate-200 px-5 py-4"><h2 className="text-lg font-bold">{title}</h2><p className="text-sm text-slate-500">{subtitle}</p></header><div className="p-5">{children}</div></section> }
function ProgressRow({label,value,max,color}:{label:string;value:number;max:number;color:string}) { const percent=max?Math.round(value/max*100):0;return <div><div className="mb-2 flex justify-between text-sm"><span className="font-semibold">{label}</span><span className="font-bold">{value} <span className="font-normal text-slate-500">({percent}%)</span></span></div><div className="h-3 overflow-hidden bg-slate-200"><div className={`h-full ${color}`} style={{width:`${Math.min(100,percent)}%`}}/></div></div> }
function Mini({value,label}:{value:number;label:string}) { return <div><p className="text-2xl font-bold">{value}</p><p className="text-xs uppercase text-slate-500">{label}</p></div> }
function SentimentBadge({row,pt}:{row:RecordRow;pt:(text:string,vars?:Record<string,string|number>)=>string}) { if(!row.sentiment_label)return <span className="inline-flex rounded bg-warning-50 px-2 py-1 font-bold text-warning-700">{pt('Waiting')}</span>;const colors={positive:'bg-success-50 text-success-700',neutral:'bg-slate-100 text-slate-700',negative:'bg-danger-50 text-danger-700'};return <span className={`inline-flex rounded px-2 py-1 font-bold ${colors[row.sentiment_label]}`}>{pt(sentimentName[row.sentiment_label])}</span> }
