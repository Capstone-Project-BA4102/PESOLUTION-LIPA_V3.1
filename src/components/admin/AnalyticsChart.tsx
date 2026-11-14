import { useId } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Card } from '@/components/ui/Card'
import { usePT } from '@/lib/portalCopy'
import type { AnalyticsCount } from '@/lib/employmentAnalytics'
const colors = ['#dc2626', '#3b82f6', '#16a34a', '#d97706', '#9333ea', '#0891b2']
export function AnalyticsChart({ title, rows, kind = 'bars', hint, compact = false }: { title: string; rows: AnalyticsCount[]; kind?: 'bars'|'donut'|'columns'|'line'; hint: string; compact?: boolean }) {
  const pt = usePT(), id = useId()
  const hasData = rows.some(row => row.count > 0)
  const tooltip = <Tooltip contentStyle={{ background: 'var(--color-surface)', color: 'var(--color-slate-900)', border: '1px solid var(--color-slate-200)', borderRadius: 8 }} formatter={(value, _name, item) => [`${value}${item.payload.percentage !== undefined ? ` (${Number(item.payload.percentage).toFixed(1)}%)` : ''}`, pt('Count')]} />
  const ticks = { fontSize: 11, fill: 'var(--color-slate-600)' }
  const short = (value: string) => value.length > 20 ? `${value.slice(0,19)}…` : value
  return <Card className={compact ? 'min-w-0 p-4' : 'min-w-0 p-4 sm:p-5'}>
    <h3 id={id} className="font-bold text-slate-900">{pt(title)}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{pt(hint)}</p>
    {!hasData ? <p role="status" className={`${compact ? 'h-48' : 'h-64'} flex items-center justify-center text-center text-sm text-slate-500`}>{pt('No records for the selected filters.')}</p> : <div className={`mt-3 ${compact ? 'h-48' : 'h-64'} min-w-0`} role="img" aria-label={pt(title)} aria-describedby={`${id}-values`}>
      <ResponsiveContainer width="100%" height="100%">
        {kind === 'donut' && rows.length <= 6 ? <PieChart accessibilityLayer><Pie data={rows} dataKey="count" nameKey="label" innerRadius={55} outerRadius={90} isAnimationActive={false}>{rows.map((row,i) => <Cell key={row.label} fill={colors[i % colors.length]} />)}</Pie>{tooltip}</PieChart>
        : kind === 'line' ? <LineChart accessibilityLayer data={rows} margin={{ top: 8, right: 16, left: -15, bottom: 8 }}><CartesianGrid stroke="var(--color-slate-200)" vertical={false}/><XAxis dataKey="label" tick={ticks}/><YAxis allowDecimals={false} tick={ticks}/>{tooltip}<Line type="linear" dataKey="count" stroke={colors[0]} strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false}/></LineChart>
        : <BarChart accessibilityLayer data={rows.slice(0,10)} layout={kind === 'columns' ? 'horizontal' : 'vertical'} margin={{ top: 5, right: 15, left: 0, bottom: kind === 'columns' ? 40 : 5 }}>
          <CartesianGrid stroke="var(--color-slate-200)" horizontal={kind === 'columns'} vertical={kind !== 'columns'}/>
          <XAxis type={kind === 'columns' ? 'category' : 'number'} dataKey={kind === 'columns' ? 'label' : undefined} tick={ticks} tickFormatter={kind === 'columns' ? short : undefined} allowDecimals={false} angle={kind === 'columns' ? -20 : 0} textAnchor={kind === 'columns' ? 'end' : 'middle'} />
          <YAxis type={kind === 'columns' ? 'number' : 'category'} dataKey={kind === 'columns' ? undefined : 'label'} width={kind === 'columns' ? 35 : 130} tick={ticks} tickFormatter={kind === 'columns' ? undefined : short} allowDecimals={false}/>{tooltip}<Bar dataKey="count" fill={colors[0]} radius={[0,3,3,0]} isAnimationActive={false}/>
        </BarChart>}
      </ResponsiveContainer>
    </div>}
    {kind === 'donut' && rows.length <= 6 && <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">{rows.map((row,i) => <li key={row.label} className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: colors[i % colors.length] }}/>{pt(row.label)}: <strong>{row.count}</strong> ({row.percentage?.toFixed(1)}%)</li>)}</ul>}
    <details id={`${id}-values`} className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-600"><summary className="cursor-pointer font-semibold">{pt('View exact values')}</summary><div className="max-h-64 overflow-auto"><table className="mt-2 w-full text-left"><caption className="sr-only">{pt(title)}</caption><thead><tr><th className="p-1">{pt('Category')}</th><th className="p-1 text-right">{pt('Count')}</th>{rows.some(row => row.percentage !== undefined) && <th className="p-1 text-right">%</th>}</tr></thead><tbody>{rows.map(row => <tr key={row.label} className="border-t border-slate-100"><th scope="row" className="break-words p-1 font-normal">{pt(row.label)}</th><td className="p-1 text-right tabular-nums">{row.count}</td>{row.percentage !== undefined && <td className="p-1 text-right tabular-nums">{row.percentage.toFixed(1)}%</td>}</tr>)}</tbody></table></div></details>
  </Card>
}
