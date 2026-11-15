import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import { BrainCircuit, CheckCircle2, CircleHelp, MessageSquare, RefreshCw, Star, Trash2, UsersRound } from 'lucide-react'
import { Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Avatar, Button, Card, DataTable, PageHeader, Select, type DataTableColumn } from '@/components/ui'
import { CountUp } from '@/components/ui/CountUp'
import { removeFeedbackReview } from '@/lib/feedbackModeration'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { RefreshNotice } from '@/components/shared/RefreshNotice'
import { Modal } from '@/components/ui/Modal'
import { ErrorBlock } from '@/components/shared/QueryState'
import { FeedbackAnalyticsSkeleton } from '@/components/shared/Skeletons'
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

export default function FeedbackAnalyticsPage({ embedded = false }: { embedded?: boolean }) {
  const pt = usePT()
  const { locale, theme } = usePublicPreferences()
  const fetcher = useCallback(() => backendRequest<Analytics>('/admin/feedback-analytics'), [])
  const { data, loading, refreshing, error, reload } = useQuery(fetcher, [])
  useLiveRefresh(reload, ['hired_application_feedback', 'applications'])
  const [removeTarget, setRemoveTarget] = useState<RecordRow | null>(null)
  const [removing, setRemoving] = useState(false)
  const removingRequest = useRef(false)
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const [filter,setFilter] = useState('all')
  const [confirmOpen,setConfirmOpen] = useState(false)
  const [analyzing,setAnalyzing] = useState(false)
  const [refreshedAt] = useState(() => new Date())
  const records = useMemo(() => (data?.records || []).filter(row => !removedIds.includes(row.id) && (filter === 'all' || (filter === 'pending' ? row.sentiment_status === 'pending' : row.sentiment_label === filter))), [data,filter,removedIds])
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
  const confirmRemoval = async () => {
    if (!removeTarget || removingRequest.current) return
    removingRequest.current = true
    setRemoving(true)
    try {
      const result = await removeFeedbackReview(removeTarget.id)
      setRemovedIds(ids => [...ids, removeTarget.id])
      setRemoveTarget(null)
      toast.success(pt('The selected review was removed.'))
      if (!result.auditRecorded) toast.error(pt('The review was removed, but its activity log could not be saved.'))
      reload()
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : pt('Could not remove this review. Please retry.'))
    } finally {
      removingRequest.current = false
      setRemoving(false)
    }
  }
  if (loading && !data) return <FeedbackAnalyticsSkeleton label={pt('Loading feedback dashboard...')} embedded={embedded} />
  if (!data) return <ErrorBlock message={error || pt('Loading feedback dashboard...')} onRetry={reload} />

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
  const tooltipStyle = { backgroundColor: theme === 'dark' ? '#182536' : '#ffffff', border: `1px solid ${chartGrid}`, borderRadius: 8, color: theme === 'dark' ? '#f8fafc' : '#0f172a' }
  const sentimentData = (['positive','neutral','negative'] as Sentiment[]).map(key=>({key,name:pt(sentimentName[key]),value:data?.distribution[key]||0,color:palette[key]}))
  const dateLocale = locale === 'fil' ? 'fil-PH' : 'en-PH'
  const refreshed = refreshedAt.toLocaleTimeString(dateLocale, {hour:'2-digit',minute:'2-digit'})

  const columns: DataTableColumn<RecordRow>[] = [
    {
      key: 'applicant',
      header: pt('Applicant'),
      width: '24%',
      render: (row) => {
        const name = row.applications?.applicants?.full_name || pt('Applicant')
        return <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={name} size="sm" className="shrink-0" />
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold leading-snug break-words text-slate-900">{name}</p>
            <p className="text-[12px] leading-snug break-words text-slate-500">{row.applications?.job_listings?.title || '—'}</p>
            <p className="text-[12px] leading-snug break-words text-slate-500">{row.applications?.job_listings?.companies?.name || '—'}</p>
          </div>
        </div>
      },
    },
    {
      key: 'rating',
      header: pt('Rating'),
      width: 130,
      render: (row) => <div><StarRating value={row.rating} size="sm" /><span className="mt-1 block text-[11.5px] text-slate-500">{row.rating}/5</span></div>,
    },
    {
      key: 'feedback',
      header: pt('Written feedback'),
      width: '30%',
      render: (row) => <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-700">{row.feedback_text}</p>,
    },
    {
      key: 'sentiment',
      header: pt('Sentiment'),
      width: 150,
      render: (row) => <div><SentimentBadge row={row} pt={pt} />{row.sentiment_confidence!=null&&<p className="mt-1 text-[11px] text-slate-500">{pt('{confidence}% confidence',{confidence:(row.sentiment_confidence*100).toFixed(1)})}</p>}</div>,
    },
    {
      key: 'submitted',
      header: pt('Submitted'),
      width: 130,
      render: (row) => <span className="whitespace-nowrap text-[12px] text-slate-500">{new Date(row.submitted_at).toLocaleDateString(dateLocale)}<br/>{new Date(row.submitted_at).toLocaleTimeString(dateLocale,{hour:'2-digit',minute:'2-digit'})}</span>,
    },
  ]

  return <div className="space-y-4">
    <RefreshNotice error={error} refreshing={refreshing} retry={reload} />
    {!embedded && <PageHeader title={<span className="inline-flex items-center gap-2"><Star aria-hidden="true" className="h-5 w-5 text-brand-600"/>{pt('Feedback Analytics')}</span>} description={pt('Operational view of hired-applicant participation, service ratings, and written sentiment.')} />}

    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 className="text-base font-bold text-slate-900">{pt('Feedback overview')}</h2>
        <p className="text-xs text-slate-500">
          {pt('Hired applicants only')} · {pt('{total} of {eligible} hired applicants',{total,eligible})} · {pt('Last refreshed:')} {refreshed}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {pending > 0 && (data?.inferenceReady
          ? <Button size="sm" variant="neutral" icon={<BrainCircuit className="h-4 w-4"/>} onClick={() => setConfirmOpen(true)}>{pt('Analyze waiting feedback')}</Button>
          : <span className="flex max-w-xl items-center gap-2 rounded-md bg-warning-50 px-2.5 py-1.5 text-[11.5px] font-semibold leading-snug text-warning-700"><CircleHelp className="h-4 w-4 shrink-0"/>{pt('The sentiment service is not answering right now. Waiting comments are kept and can be analyzed again once it is back.')}</span>)}
        <Button size="sm" variant="neutral" disabled={refreshing} onClick={reload} icon={<RefreshCw aria-hidden="true" className="h-4 w-4"/>}>{pt('Refresh data')}</Button>
      </div>
    </div>

    <details className="studio-card">
      <summary className="cursor-pointer px-3 py-2 text-[12.5px] font-semibold text-slate-700">{pt('Filters')}</summary>
      <div className="grid gap-3 border-t border-slate-200 p-3 sm:grid-cols-2">
        <Select
          label={pt('Sentiment')}
          value={filter}
          onChange={event => setFilter(event.target.value)}
          options={[
            { value: 'all', label: 'All feedback' },
            { value: 'positive', label: 'Positive' },
            { value: 'neutral', label: 'Neutral' },
            { value: 'negative', label: 'Needs attention' },
            { value: 'pending', label: 'Waiting for analysis' },
          ]}
        />
        <div>
          <span className="text-[13.5px] font-semibold text-slate-700">{pt('Scope')}</span>
          <div className="mt-1.5 flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3.5 text-[14px] font-medium text-slate-700">
            {pt('Hired applicants only')}
          </div>
        </div>
      </div>
    </details>

    <div className="ui-stagger studio-kpis">
      <Kpi icon={<MessageSquare/>} label={pt('Feedback received')} value={<CountUp value={total} />} foot={pt('{total} of {eligible} hired applicants',{total,eligible})} />
      <Kpi icon={<UsersRound/>} label={pt('Response rate')} value={`${response}%`} foot={pt('{total} responses ÷ {eligible} eligible',{total,eligible})} />
      <Kpi icon={<Star/>} label={pt('Average rating')} value={data?.averageRating==null?'N/A':data.averageRating.toFixed(2)} foot={pt('Out of 5 stars')} />
      <Kpi icon={pending?<BrainCircuit/>:<CheckCircle2/>} label={pt('Analysis status')} value={pending?<><CountUp value={pending}/><span className="ml-1 text-[13px] font-semibold text-slate-500">{pt('waiting')}</span></>:'Up to date'} foot={pt('{analyzed} of {total} comments analyzed',{analyzed,total})} />
    </div>

    <div className="grid min-w-0 gap-3 lg:grid-cols-3">
      <Panel title={pt('Response overview')} subtitle={pt('From hired applicants to analyzed comments')}>
        <div className="space-y-3"><ProgressRow label={pt('Eligible to respond')} value={eligible} max={eligible} color="bg-slate-500"/><ProgressRow label={pt('Submitted feedback')} value={total} max={eligible} color="bg-brand-600"/><ProgressRow label={pt('Sentiment analyzed')} value={analyzed} max={eligible} color="bg-success-600"/></div>
        <div className="mt-4 grid grid-cols-3 border-t border-slate-100 pt-4 text-center"><Mini value={eligible} label={pt('Hired')}/><Mini value={total} label={pt('Responded')}/><Mini value={analyzed} label={pt('Analyzed')}/></div>
      </Panel>

      <Panel title={pt('Sentiment mix')} subtitle={pt('Based only on written comments')}>
        {analyzed ? <div className="h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={sentimentData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={3}>{sentimentData.map(item=><Cell key={item.key} fill={item.color}/>)}</Pie><Tooltip contentStyle={tooltipStyle} labelStyle={{color:chartText}} itemStyle={{color:chartText}}/><Legend verticalAlign="bottom" height={28} formatter={value=><span style={{color:chartText}}>{value}</span>}/><text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-900 text-2xl font-bold">{analyzed}</text><text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-500 text-xs">{pt('analyzed')}</text></PieChart></ResponsiveContainer></div> : <div className="grid h-56 place-items-center text-center text-slate-500"><div><BrainCircuit className="mx-auto h-8 w-8"/><p className="mt-3 text-[13px] font-semibold">{pt('No analyzed comments yet.')}</p></div></div>}
      </Panel>

      <Panel title={pt('Service rating')} subtitle={pt(total===1?'{total} submitted rating':'{total} submitted ratings',{total})}>
        <div className="flex h-56 flex-col items-center justify-center"><p className="text-4xl font-bold tabular-nums text-slate-900">{data?.averageRating==null?'—':data.averageRating.toFixed(1)}</p><div className="mt-4"><StarRating value={data?.averageRating ?? 0} /></div><p className="mt-4 text-center text-[12px] text-slate-500">{pt('Star rating is separate from sentiment')}</p></div>
      </Panel>
    </div>

    <Panel title={pt('Sentiment trend')} subtitle={pt('Monthly classified feedback')}>
      {data?.trends?.length ? <div className="h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.trends} margin={{top:15,right:20,left:-15,bottom:0}}><XAxis dataKey="month" tick={{fill:chartText}} axisLine={{stroke:chartGrid}} tickLine={{stroke:chartGrid}}/><YAxis allowDecimals={false} tick={{fill:chartText}} axisLine={{stroke:chartGrid}} tickLine={{stroke:chartGrid}}/><Tooltip contentStyle={tooltipStyle} labelStyle={{color:chartText}} itemStyle={{color:chartText}}/><Legend formatter={value=><span style={{color:chartText}}>{value}</span>}/><Line type="monotone" dataKey="positive" name={pt('Positive')} stroke={palette.positive} strokeWidth={3} isAnimationActive={false}/><Line type="monotone" dataKey="neutral" name={pt('Neutral')} stroke={palette.neutral} strokeWidth={3} isAnimationActive={false}/><Line type="monotone" dataKey="negative" name={pt('Needs attention')} stroke={palette.negative} strokeWidth={3} isAnimationActive={false}/></LineChart></ResponsiveContainer></div> : <div className="grid h-52 place-items-center text-center text-slate-500"><div><BrainCircuit className="mx-auto h-8 w-8"/><p className="mt-3 text-[13px] font-semibold">{pt('Trend will appear after feedback is collected across multiple months.')}</p></div></div>}
    </Panel>

    <div className="studio-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5">
        <h2 className="text-[13.5px] font-bold text-slate-900">{pt('Feedback details')}</h2>
        <p className="text-[11.5px] font-medium text-slate-500">{pt(records.length===1?'{count} record in this view':'{count} records in this view',{count:records.length})}</p>
      </div>
      <DataTable
        rows={records}
        columns={columns}
        selectable={false}
        minWidth={980}
        empty={pt('No feedback matches the selected filter.')}
        rowActions={[
          { label: pt('Remove review'), icon: <Trash2 className="h-3.5 w-3.5" />, danger: true, run: (row) => setRemoveTarget(row) },
        ]}
      />
    </div>

    <details className="studio-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-[13px] font-semibold text-slate-700"><CircleHelp className="h-4 w-4 text-brand-600"/>{pt('Metric definitions and model transparency')}</summary>
      <div className="grid gap-4 border-t border-slate-200 p-3 text-[13px] leading-6 text-slate-600 md:grid-cols-3"><p><strong className="text-slate-900">{pt('Response rate:')}</strong> {pt('{total} submitted ÷ {eligible} hired = {response}%.',{total,eligible,response})}</p><p><strong className="text-slate-900">{pt('Sentiment:')}</strong> {pt('XLM-R reads only written feedback. Star ratings never determine the label.')}</p><p><strong className="text-slate-900">{pt('Last refreshed:')}</strong> {pt('{time}. Pending comments remain stored but are excluded until analyzed.',{time:refreshed})}</p></div>
    </details>
    <Modal open={!!removeTarget} onClose={() => { if (!removing) setRemoveTarget(null) }} dismissible={!removing} size="sm" title={pt('Remove selected review?')}
      footer={<><Button variant="neutral" disabled={removing} onClick={() => setRemoveTarget(null)}>{pt('Cancel')}</Button><Button disabled={removing} onClick={confirmRemoval} icon={<Trash2 className="h-4 w-4" />}>{removing ? pt('Removing…') : pt('Remove review')}</Button></>}>
      <p className="text-[14px] text-slate-600">{pt('This permanently removes the selected rating, comment, sentiment result, and any public testimonial. Employment and referral history are kept. This cannot be undone.')}</p>
      {removeTarget && <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-[13px]"><p className="font-semibold">{removeTarget.applications?.applicants?.full_name || pt('Applicant')}</p><p className="mt-1 text-slate-500">{removeTarget.applications?.job_listings?.title || '—'}</p><p className="mt-2 max-h-24 overflow-y-auto whitespace-pre-wrap text-slate-600">{removeTarget.feedback_text}</p></div>}
    </Modal>
    <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title={pt('Analyze waiting feedback')}
      footer={<div className="flex justify-end gap-2"><Button variant="neutral" onClick={() => setConfirmOpen(false)} disabled={analyzing}>{pt('Cancel')}</Button><Button variant="primary" onClick={analyzeWaiting} disabled={analyzing}>{analyzing ? pt('Analyzing…') : pt('Yes, analyze {n} comment{s}', { n: pending, s: pending === 1 ? '' : 's' })}</Button></div>}>
      <p className="text-[14px] leading-relaxed text-slate-700">{pt('PESOLUTION reads these Waiting comments again with XLM-R and stores the sentiment label.')}</p>
      <ul className="mt-2.5 space-y-1 text-[13px] text-slate-600">{waiting.slice(0,3).map(row=><li key={row.id}><b className="font-semibold text-slate-900">{row.applications?.applicants?.full_name||pt('Applicant')}</b> — {row.applications?.job_listings?.title||'—'}{row.applications?.job_listings?.companies?.name ? <span className="text-slate-500"> · {row.applications.job_listings.companies.name}</span> : null}</li>)}{waiting.length>3&&<li>{pt('and {n} more',{n:waiting.length-3})}</li>}</ul>
      <p className="mt-3 text-[13px] leading-relaxed text-slate-600">{pt('Comments written while the sentiment service was offline stay Waiting until this runs. Star ratings are never changed and nothing is sent to the applicants.')}</p>
    </Modal>
  </div>
}

function Kpi({icon,label,value,foot}:{icon:ReactNode;label:string;value:ReactNode;foot:string}) { return <div className="studio-kpi is-static"><span className="k-label"><span>{label}</span>{icon}</span><span className="k-value">{value}</span><span className="k-foot">{foot}</span></div> }
function Panel({title,subtitle,children}:{title:string;subtitle:string;children:ReactNode}) { return <Card className="flex min-w-0 flex-col"><header className="px-3 py-2.5"><h2 className="text-[13.5px] font-bold text-slate-900">{title}</h2><p className="mt-0.5 text-[12px] leading-snug text-slate-500">{subtitle}</p></header><div className="flex-1 border-t border-slate-200 p-3">{children}</div></Card> }
function ProgressRow({label,value,max,color}:{label:string;value:number;max:number;color:string}) { const percent=max?Math.round(value/max*100):0;return <div><div className="mb-1.5 flex justify-between text-[12.5px]"><span className="font-semibold">{label}</span><span className="font-semibold tabular-nums">{value} <span className="font-normal text-slate-500">({percent}%)</span></span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${color}`} style={{width:`${Math.min(100,percent)}%`}}/></div></div> }
function Mini({value,label}:{value:number;label:string}) { return <div><p className="text-xl font-bold tabular-nums">{value}</p><p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</p></div> }
function SentimentBadge({row,pt}:{row:RecordRow;pt:(text:string,vars?:Record<string,string|number>)=>string}) { if(!row.sentiment_label)return <span className="inline-flex rounded-md bg-warning-50 px-1.5 py-[1px] text-[11.5px] font-semibold text-warning-700 ring-1 ring-inset ring-warning-100">{pt('Waiting')}</span>;const colors={positive:'bg-success-50 text-success-700 ring-success-100',neutral:'bg-slate-100 text-slate-700 ring-slate-200',negative:'bg-danger-50 text-danger-700 ring-danger-100'};return <span className={`inline-flex rounded-md px-1.5 py-[1px] text-[11.5px] font-semibold ring-1 ring-inset ${colors[row.sentiment_label]}`}>{pt(sentimentName[row.sentiment_label])}</span> }
