import { Moon, Sun } from 'lucide-react'
import { usePublicPreferences } from '@/lib/publicPreferences'
import { cn } from '@/lib/utils'

/**
 * Light / Dark switch used in every header (public site and both portals).
 * Sits on the red brand bar, so it is styled with white-on-red states. The
 * white pill slides under the selected icon so the switch reads as a toggle.
 */
export function ThemeToggle({ className, tone = 'brand' }: { className?: string; tone?: 'brand' | 'neutral' }) {
  const { theme, setTheme, t } = usePublicPreferences()
  const options = [
    { value: 'light', label: t('light'), Icon: Sun },
    { value: 'dark', label: t('dark'), Icon: Moon },
  ] as const

  return (
    <div
      role="group"
      aria-label={`${t('appearance')}: ${t(theme)}`}
      title={`${t('appearance')}: ${t(theme)}`}
      className={cn('relative flex shrink-0 items-center rounded-lg border p-0.5', tone === 'brand' ? 'border-white/40' : 'border-slate-200 bg-slate-50', className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-md transition-transform duration-300 ease-out',
          theme === 'dark' ? 'translate-x-full' : 'translate-x-0',
          tone === 'brand' ? 'bg-white' : 'bg-white shadow-sm',
        )}
      />
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-pressed={theme === value}
          title={label}
          className={cn(
            'ui-segment relative z-10 flex h-8 w-9 flex-1 items-center justify-center rounded-md transition-colors [&>svg]:h-5 [&>svg]:w-5',
            tone === 'brand'
              ? (theme === value ? 'text-brand-700' : 'text-white/80 hover:text-white')
              : (theme === value ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'),
          )}
        >
          <Icon />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  )
}
