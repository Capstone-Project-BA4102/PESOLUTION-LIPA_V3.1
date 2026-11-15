import { Star, Archive, Ban, Briefcase, Building2, CircleX, FileCheck2, FilePenLine, FolderOpen, GitCompareArrows, Info, KeyRound, Layers, RefreshCw, SquarePen, UserCheck, UserPlus, UserRound, UserX, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { classifyActivity, type ActivityKind, type ActivitySummary } from '@/lib/activityPresentation'
import { cn } from '@/lib/utils'

const icons: Record<ActivityKind, LucideIcon> = { 'review-removed': Star, registration: UserPlus, credentials: KeyRound, renewal: RefreshCw, company: Building2, 'company-edit': SquarePen, 'company-closed': Archive, job: Briefcase, 'job-edit': SquarePen, 'job-closed': Archive, 'job-open': FolderOpen, vacancies: Layers, matching: GitCompareArrows, referral: FileCheck2, 'referral-edit': FilePenLine, declined: CircleX, cancelled: Ban, hired: UserCheck, 'not-hired': UserX, applicant: UserRound, other: Info }
const colors = { brand: 'bg-brand-50 text-brand-700', success: 'bg-success-50 text-success-700', warning: 'bg-warning-50 text-warning-700', info: 'bg-info-50 text-info-700', neutral: 'bg-slate-100 text-slate-600' }

/** Icons and labels carry the distinction as well as color. Transaction styling is deterministic. */
export function ActivityIcon({ activity }: { activity: ActivitySummary }) {
  const style = classifyActivity(activity)
  const Icon = icons[style.kind]
  return <span aria-hidden="true" className={cn('flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md', colors[style.tone])}><Icon className="h-[15px] w-[15px]" /></span>
}
export function ActivityBadge({ activity }: { activity: ActivitySummary }) {
  const style = classifyActivity(activity)
  return <Badge tone={style.tone} className="!px-2 !py-0 !text-[11px] !font-medium">{style.label}</Badge>
}
