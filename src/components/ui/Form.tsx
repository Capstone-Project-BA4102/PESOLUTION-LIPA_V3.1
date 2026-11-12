import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePT, usePTNode } from '@/lib/portalCopy'

const control =
  'block w-full rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 ' +
  'transition-colors focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100 ' +
  'disabled:bg-slate-100 disabled:text-slate-500'

interface FieldProps {
  label?: ReactNode
  required?: boolean
  hint?: ReactNode
  error?: ReactNode
  className?: string
  children: (id: string) => ReactNode
}

/** Wraps any control with a consistent label, hint and error message. */
export function Field({ label, required, hint, error, className, children }: FieldProps) {
  const id = useId()
  const ptNode = usePTNode()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="font-semibold text-slate-800">
          {ptNode(label)}
          {required && <span className="ml-1 text-brand-600">*</span>}
        </label>
      )}
      {children(id)}
      {hint && !error && <p className="text-[0.95rem] text-slate-500">{ptNode(hint)}</p>}
      {error && <p className="text-[0.95rem] font-medium text-brand-700">{ptNode(error)}</p>}
    </div>
  )
}

type LabeledProps = { label?: ReactNode; required?: boolean; hint?: ReactNode; error?: ReactNode; wrapperClassName?: string }

export function Input({
  label,
  required,
  hint,
  error,
  wrapperClassName,
  className,
  leftIcon,
  rightSlot,
  ...rest
}: LabeledProps & InputHTMLAttributes<HTMLInputElement> & { leftIcon?: ReactNode; rightSlot?: ReactNode }) {
  const pt = usePT()
  return (
    <Field label={label} required={required} hint={hint} error={error} className={wrapperClassName}>
      {(id) => (
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400 [&>svg]:h-5 [&>svg]:w-5">
              {leftIcon}
            </span>
          )}
          <input
            id={id}
            required={required}
            className={cn(control, 'h-12', leftIcon ? 'pl-11' : '', rightSlot ? 'pr-12' : '', error ? 'border-brand-500' : '', className)}
            placeholder={typeof rest.placeholder === 'string' ? pt(rest.placeholder) : rest.placeholder}
            {...rest}
          />
          {rightSlot && <span className="absolute inset-y-0 right-2 flex items-center">{rightSlot}</span>}
        </div>
      )}
    </Field>
  )
}

export function Select({
  label,
  required,
  hint,
  error,
  wrapperClassName,
  className,
  options,
  placeholder,
  ...rest
}: LabeledProps &
  SelectHTMLAttributes<HTMLSelectElement> & { options: Array<string | { value: string; label: string }>; placeholder?: string }) {
  const pt = usePT()
  return (
    <Field label={label} required={required} hint={hint} error={error} className={wrapperClassName}>
      {(id) => (
        <div className="relative">
          <select id={id} required={required} className={cn(control, 'h-12 appearance-none pr-11', className)} {...rest}>
            {placeholder && <option value="">{pt(placeholder)}</option>}
            {options.map((o) => {
              const opt = typeof o === 'string' ? { value: o, label: o } : o
              return (
                <option key={opt.value} value={opt.value}>
                  {pt(opt.label)}
                </option>
              )
            })}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 h-5 w-5 -translate-y-1/2 text-slate-500" />
        </div>
      )}
    </Field>
  )
}

export function Textarea({
  label,
  required,
  hint,
  error,
  wrapperClassName,
  className,
  ...rest
}: LabeledProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const pt = usePT()
  return (
    <Field label={label} required={required} hint={hint} error={error} className={wrapperClassName}>
      {(id) => (
        <textarea
          id={id}
          required={required}
          className={cn(control, 'min-h-32 py-3', className)}
          placeholder={typeof rest.placeholder === 'string' ? pt(rest.placeholder) : rest.placeholder}
          {...rest}
        />
      )}
    </Field>
  )
}

export function Checkbox({
  label,
  description,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }) {
  const id = useId()
  const ptNode = usePTNode()
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-start gap-3', className)}>
      <input id={id} type="checkbox" className="mt-1 h-5 w-5 shrink-0 cursor-pointer rounded accent-brand-600" {...rest} />
      <span>
        <span className="font-medium text-slate-800">{ptNode(label)}</span>
        {description && <span className="block text-[0.95rem] text-slate-500">{ptNode(description)}</span>}
      </span>
    </label>
  )
}

/** Search box with magnifier icon (used in filter bars). */
export function SearchInput({ className, placeholder, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  const pt = usePT()
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-slate-400" />
      <input type="search" placeholder={typeof placeholder === 'string' ? pt(placeholder) : placeholder} className={cn(control, 'h-12 pl-11')} {...rest} />
    </div>
  )
}
