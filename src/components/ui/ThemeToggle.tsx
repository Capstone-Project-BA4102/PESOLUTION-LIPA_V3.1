import { Moon, Sun } from 'lucide-react'
import { usePublicPreferences } from '@/lib/publicPreferences'
import { cn } from '@/lib/utils'

/**
 * Light / Dark switch used in every header (public site and both portals).
 * Sits on the red brand bar, so it is styled with white-on-red states.
 */
export function ThemeToggle({ className }: { className?: string }) {
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
      className={cn('flex shrink-0 items-center gap-0.5 rounded-lg border border-white/40 p-0.5', className)}
    >
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-pressed={theme === value}
          title={label}
          className={cn(
            'flex h-8 w-9 items-center justify-center rounded-md transition-colors [&>svg]:h-5 [&>svg]:w-5',
            theme === value ? 'bg-white font-bold text-brand-700' : 'text-white/80 hover:bg-white/15 hover:text-white',
          )}
        >
          <Icon />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  )
}
