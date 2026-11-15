import { cn } from '@/lib/utils'

/** Gradient pairs kept in the brand-safe range so demo marks never clash with status colors. */
const MARKS = [
  ['#1d4ed8', '#38bdf8'],
  ['#0f766e', '#2dd4bf'],
  ['#7c3aed', '#c084fc'],
  ['#b45309', '#fbbf24'],
  ['#be123c', '#fb7185'],
  ['#0369a1', '#7dd3fc'],
  ['#4338ca', '#818cf8'],
  ['#15803d', '#4ade80'],
]

const SIZES = {
  xs: 'h-8 w-8 rounded-md text-[11px]',
  sm: 'h-10 w-10 rounded-md text-[13px]',
  md: 'h-12 w-12 rounded-lg text-[15px]',
  lg: 'h-14 w-14 rounded-xl text-[17px]',
} as const

function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'JO'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

/** Stable across renders and refreshes: the same company always gets the same mark. */
function markOf(name: string) {
  let hash = 0
  for (const char of name.trim().toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) % 100003
  return MARKS[hash % MARKS.length]
}

/**
 * Company mark for a job card. Uses the uploaded logo when the agency has one,
 * otherwise a generated monogram tile so demo listings still read as branded.
 */
export function JobLogo({ name, src, size = 'md' }: {
  name?: string
  src?: string
  size?: keyof typeof SIZES
}) {
  const label = name?.trim() || 'PESO Lipa'
  const box = SIZES[size]
  if (src) {
    return (
      <img
        src={src}
        alt={`${label} logo`}
        className={cn('shrink-0 border border-slate-200 bg-white object-contain p-1', box)}
      />
    )
  }
  const [from, to] = markOf(label)
  return (
    <span
      className={cn('relative grid shrink-0 place-items-center overflow-hidden font-bold text-white ring-1 ring-black/5', box)}
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <svg aria-hidden="true" viewBox="0 0 48 48" className="absolute inset-0 h-full w-full">
        <circle cx="41" cy="8" r="16" fill="#fff" opacity="0.16" />
        <circle cx="7" cy="43" r="13" fill="#fff" opacity="0.1" />
      </svg>
      <span className="relative tracking-[0.02em]">{initialsOf(label)}</span>
    </span>
  )
}
