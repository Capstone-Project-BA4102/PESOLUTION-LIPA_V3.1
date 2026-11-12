import { usePublicPreferences } from '@/lib/publicPreferences'
import { cn } from '@/lib/utils'

const OPTIONS = [['en', 'EN'], ['fil', 'FIL']] as const

/** EN / FIL segmented pill used in the public header and in both portals. */
export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = usePublicPreferences()
  return (
    <div
      className={cn('flex shrink-0 items-center gap-0.5 rounded-lg border border-white/40 p-0.5', className)}
      role="group"
      aria-label={t('language')}
      title={t('language')}
    >
      {OPTIONS.map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setLocale(value)}
          aria-pressed={locale === value}
          className={cn(
            'h-8 rounded-md px-2.5 text-sm font-bold transition-colors',
            locale === value ? 'bg-white text-brand-700' : 'text-white/80 hover:bg-white/15 hover:text-white',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
