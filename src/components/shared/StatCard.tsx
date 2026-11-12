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
    <Card className="flex items-center gap-3 p-5 transition-shadow hover:shadow-md">
      <IconBox tone={tone} size="md" round>
        {icon}
      </IconBox>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight text-slate-500">{ptNode(label)}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </Card>
  )
}
