import { usePT } from '@/lib/portalCopy'
import { skillChanges, type QualificationSnapshot } from '@/lib/renewals'

export function QualificationComparison({ before, after }: { before: QualificationSnapshot; after: QualificationSnapshot }) {
  const pt = usePT()
  const rows = [
    { label: 'Hard Skills', before: before.resume?.hard_skills || [], after: after.resume?.hard_skills || [], skills: true },
    { label: 'Soft Skills', before: before.resume?.soft_skills || [], after: after.resume?.soft_skills || [], skills: true },
    ...['education', 'course', 'school'].map(field => ({ label: { education: 'Highest Education', course: 'Course', school: 'School' }[field]!,
      before: before.applicant[field] ? [before.applicant[field]!] : [], after: after.applicant[field] ? [after.applicant[field]!] : [], skills: false })),
  ]
  return <div className="overflow-x-auto rounded-md border border-slate-200">
    <table className="w-full min-w-[520px] text-left text-[12.5px]">
      <caption className="sr-only">{pt('Qualification changes')}</caption>
      <thead className="bg-slate-50 text-slate-600"><tr>{['Qualifications', 'Before', 'After'].map(label => <th key={label} className="px-3 py-2 font-semibold">{pt(label)}</th>)}</tr></thead>
      <tbody>{rows.map(row => {
        const diff = skillChanges(row.before, row.after)
        return <tr key={row.label} className="border-t border-slate-200 align-top">
          <th scope="row" className="px-3 py-2 font-semibold text-slate-700">{pt(row.label)}</th>
          <td className="max-w-64 whitespace-pre-wrap break-words px-3 py-2 text-slate-500">{row.before.join('\n') || '—'}</td>
          <td className="max-w-64 px-3 py-2">
            <p className="whitespace-pre-wrap break-words text-slate-800">{row.after.join('\n') || '—'}</p>
            {!!diff.added.length && <p className="mt-1 break-words text-success-700">{pt(row.skills ? 'Added' : 'Updated')}: {diff.added.join(', ')}</p>}
            {!!diff.removed.length && <p className="mt-1 break-words text-red-700 dark:text-red-300">{pt('Removed')}: {diff.removed.join(', ')}</p>}
            {!diff.added.length && !diff.removed.length && <p className="mt-1 text-xs text-slate-400">{pt('Unchanged')}</p>}
          </td>
        </tr>
      })}</tbody>
    </table>
  </div>
}
