import { usePublicPreferences } from '@/lib/publicPreferences'
import { cn } from '@/lib/utils'

const OPTIONS = [['en', 'EN'], ['fil', 'FIL']] as const

/**
 * EN / FIL segmented pill used in the public header and in both portals. The
 * white pill slides to the selected language instead of swapping backgrounds.
 */
export function LanguageToggle({ className, tone = 'brand' }: { className?: string; tone?: 'brand' | 'neutral' }) {
  const { locale, setLocale, t } = usePublicPreferences()
  return (
    <div
      className={cn('relative flex shrink-0 items-center rounded-lg border p-0.5', tone === 'brand' ? 'border-white/40' : 'border-slate-200 bg-slate-50', className)}
      role="group"
      aria-label={t('language')}
      title={t('language')}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-md transition-transform duration-300 ease-out',
          locale === 'fil' ? 'translate-x-full' : 'translate-x-0',
          tone === 'brand' ? 'bg-white' : 'bg-white shadow-sm',
        )}
      />
      {OPTIONS.map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setLocale(value)}
          aria-pressed={locale === value}
          className={cn(
            'ui-segment relative z-10 h-8 w-11 flex-1 rounded-md px-2.5 text-sm font-bold transition-colors',
            tone === 'brand'
              ? (locale === value ? 'text-brand-700' : 'text-white/80 hover:text-white')
              : (locale === value ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'),
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
