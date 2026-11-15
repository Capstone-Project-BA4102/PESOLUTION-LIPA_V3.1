import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { IconBox, type Tone } from '@/components/ui/IconBox'
import { usePTNode } from '@/lib/portalCopy'

interface StatCardProps {
  label: ReactNode
  value: ReactNode
  icon: ReactNode
  tone?: Tone
}

export function StatCard({ label, value, icon, tone = 'brand' }: StatCardProps) {
  const ptNode = usePTNode()
  return (
    <Card className="flex items-start justify-between gap-3 p-3 transition-shadow hover:shadow-[0_2px_8px_rgb(0_0_0_/_0.06)]">
      <div className="min-w-0">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-slate-500">{ptNode(label)}</p>
        <p className="mt-1 text-[22px] font-bold leading-none tracking-tight tabular-nums text-slate-900">{value}</p>
      </div>
      <IconBox tone={tone} size="sm" round>
        {icon}
      </IconBox>
    </Card>
  )
}
