import { BrainCircuit, ChevronDown } from 'lucide-react'
import type { MatchDetailsJob } from '@/lib/api'
import { usePT } from '@/lib/portalCopy'

export function NlpSkillBreakdown({ match, expanded = false }: { match: MatchDetailsJob; expanded?: boolean }) {
  const pt = usePT()
  const evidence = match.nlpAudit
  const rowsForJob = evidence?.audit.filter(row => row.job_id === match.jobId) || []
  return <details open={expanded || undefined} className="group overflow-hidden rounded-[10px] border border-slate-200 bg-white">
    <summary className="flex cursor-pointer list-none items-center gap-2.5 px-3.5 py-3 text-[13px] font-semibold text-slate-700 [&::-webkit-details-marker]:hidden">
      <BrainCircuit aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-600" />
      <span>{pt('Skill comparison')}</span>
      <ChevronDown aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
    </summary>
    {!evidence ? <p role="status" className="px-4 pb-4 text-sm text-slate-500">{pt('Skill comparison details are not available yet.')}</p> : <>
      {evidence.status === 'exact_only' && <p role="status" className="px-4 pb-3 text-xs text-warning-700">{pt('These results use exact skill matches. Comparison by meaning is temporarily unavailable.')}</p>}
      <table className="w-full table-fixed text-left text-[13px]">
        <caption className="sr-only">{pt('Skill comparison for {job}', { job: match.title })}</caption>
        <colgroup><col className="w-[39%]" /><col className="w-[39%]" /><col className="w-[22%]" /></colgroup>
        <thead className="border-y border-slate-200 bg-slate-50 text-xs text-slate-500"><tr>{['Applicant skill','Job requirement','Result'].map(label => <th key={label} scope="col" className="px-3 py-2 font-semibold">{pt(label)}</th>)}</tr></thead>
        {(['hard','soft'] as const).map(category => {
          const rows = rowsForJob.filter(row => row.category === category)
          return <tbody key={category}>
            <tr className="border-b border-slate-100"><th colSpan={3} scope="rowgroup" className="px-3 py-2 text-xs font-semibold text-slate-500">{pt(category === 'hard' ? 'Hard Skills' : 'Soft Skills')}</th></tr>
            {!rows.length && <tr><td colSpan={3} className="px-3 py-3 text-xs text-slate-500">{pt('No recorded skill requirements.')}</td></tr>}
            {rows.map(row => <tr key={row.required_skill} className="border-b border-slate-100 last:border-0">
              <td className="break-words px-3 py-3 align-top"><span className="font-medium text-slate-900">{row.applicant_skill || '—'}</span>
                {row.matched_competency && row.matched_competency !== row.applicant_skill && <span className="mt-1 block text-xs text-slate-500">{pt('Compared skill')}: {row.matched_competency}</span>}
              </td>
              <td className="break-words px-3 py-3 align-top text-slate-700">{row.required_skill}<span className="mt-1 block text-xs text-slate-500">{pt(row.method === 'exact' ? 'Same skill' : row.method === 'cosine' ? 'Compared by meaning' : 'Not compared')}</span></td>
              <td className={`break-words px-3 py-3 align-top font-semibold ${row.decision === 'accepted' ? 'text-success-700' : 'text-warning-700'}`}>{pt(row.decision === 'accepted' ? 'Match' : 'Skill gap')}</td>
            </tr>)}
          </tbody>
        })}
      </table>
      <details className="border-t border-slate-100 px-3 py-3 text-xs text-slate-500">
        <summary className="cursor-pointer font-medium">{pt('Comparison details')}</summary>
        <p className="mt-2">{pt('Required comparison score')}: {evidence.threshold.toFixed(2)}. {pt('These scores compare skills; they are not hiring probabilities.')}</p>
        <ul className="mt-2 space-y-1">{rowsForJob.map(row => <li key={`${row.category}-${row.required_skill}`}>{row.required_skill}: {row.method === 'exact' ? pt('Same skill (no comparison score needed)') : row.similarity_score == null ? pt('Not compared') : row.similarity_score.toFixed(2)}</li>)}</ul>
      </details>
    </>}
  </details>
}
