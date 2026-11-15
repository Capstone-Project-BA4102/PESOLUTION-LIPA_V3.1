import { BrainCircuit, ChevronDown, Info } from 'lucide-react'
import type { MatchDetailsJob } from '@/lib/api'
import { usePT } from '@/lib/portalCopy'
import { Badge } from '@/components/ui/Badge'

export function NlpSkillBreakdown({ match, expanded = false }: { match: MatchDetailsJob; expanded?: boolean }) {
  const pt = usePT()
  const evidence = match.nlpAudit
  return <details open={expanded || undefined} className="group overflow-hidden rounded-[10px] border border-slate-200 bg-white">
    <summary className="flex cursor-pointer list-none items-center gap-2.5 border-b border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-slate-700 [&::-webkit-details-marker]:hidden">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><BrainCircuit aria-hidden="true" className="h-4 w-4" /></span>
      <span className="min-w-0">{pt('NLP Skill Matching Breakdown')}</span>
      <ChevronDown aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
    </summary>
    {!evidence ? <p role="status" className="p-4 text-sm text-slate-500">{pt('The skill comparison will load automatically when local matching is available.')}</p> : <>
      {evidence.status === 'exact_only' && <p role="status" className="px-4 pt-3 text-xs text-warning-700">{pt('Local NLP unavailable: exact-match fallback.')}</p>}
      <div role="region" aria-label={pt('Skill comparison table')} tabIndex={0} className="overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600">
        <table className="w-full min-w-[48rem] table-fixed text-left text-sm">
          <caption className="sr-only">{pt('Skill comparison for {job}', { job: match.title })}</caption>
          <colgroup><col className="w-[30%]" /><col className="w-[24%]" /><col className="w-[14%]" /><col className="w-[19%]" /><col className="w-[13%]" /></colgroup>
          <thead className="bg-slate-50 text-xs text-slate-600"><tr>
            {['Applicant Skill', 'Required Skill', 'Similarity Score', 'Matching Method', 'Decision'].map(label => <th key={label} scope="col" className="px-4 py-2.5 font-semibold">{pt(label)}</th>)}
          </tr></thead>
          {(['hard', 'soft'] as const).map(category => {
            const rows = evidence.audit.filter(row => row.job_id === match.jobId && row.category === category)
            return <tbody key={category}>
              <tr className="border-y border-slate-100 bg-slate-50"><th scope="rowgroup" colSpan={5} className="px-4 py-2 text-xs font-semibold text-slate-600">{pt(category === 'hard' ? 'Hard Skills' : 'Soft Skills')}</th></tr>
              {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-3 text-xs text-slate-500">{pt('No recorded skill requirements.')}</td></tr>}
              {rows.map(row => <tr key={row.required_skill} className="border-b border-slate-100 last:border-0">
                <td className="break-words px-4 py-3 align-top"><span className="font-medium text-slate-900">{row.applicant_skill || '—'}</span>
                  {row.matched_competency && row.matched_competency !== row.applicant_skill && <span className="mt-0.5 block text-xs text-slate-500">{pt('Compared competency')}: {row.matched_competency}</span>}
                </td>
                <td className="break-words px-4 py-3 align-top text-slate-700">{row.required_skill}</td>
                <td className="px-4 py-3 align-top font-medium tabular-nums text-slate-900">{row.method === 'exact' ? '1.00' : row.similarity_score === null ? '—' : row.similarity_score.toFixed(2)}</td>
                <td className="px-4 py-3 align-top"><Badge tone={row.method === 'exact' ? 'info' : 'neutral'}>{pt(row.method === 'exact' ? 'Exact Match' : row.method === 'cosine' ? 'Cosine Similarity' : 'Not compared')}</Badge></td>
                <td className="px-4 py-3 align-top"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${row.decision === 'accepted' ? 'bg-success-50 text-success-700' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'}`}>{pt(row.decision === 'accepted' ? 'Accepted' : 'Rejected')}</span></td>
              </tr>)}
            </tbody>
          })}
        </table>
      </div>
      <div className="flex items-start gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
        <p>{pt('Exact matches use 1.00 as a display label; other values are measured cosine similarities.')} <span className="font-medium">{pt('Provisional similarity threshold: {threshold}', { threshold: evidence.threshold.toFixed(2) })}</span></p>
      </div>
    </>}
  </details>
}
