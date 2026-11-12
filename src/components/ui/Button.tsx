import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { usePTNode } from '@/lib/portalCopy'

export type ButtonVariant = 'primary' | 'secondary' | 'neutral' | 'ghost' | 'success'
export type ButtonSize = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors ' +
  'disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200'

const variants: Record<ButtonVariant, string> = {
  /** Main action on a page — PESO red filled */
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700',
  /** Secondary action — red outline */
  secondary: 'border-2 border-brand-600 bg-white text-brand-700 hover:bg-brand-50',
  /** Neutral / cancel / clear — gray outline */
  neutral: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100',
  /** Text-only action */
  ghost: 'text-brand-700 hover:bg-brand-50',
  success: 'bg-success-600 text-white shadow-sm hover:bg-success-700',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-10 px-4 py-1 text-[0.95rem]',
  md: 'min-h-12 px-5 py-1 text-base',
  lg: 'min-h-14 px-7 py-1 text-lg',
}

interface CommonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  iconRight?: ReactNode
  fullWidth?: boolean
}

export function buttonClass({ variant = 'primary', size = 'md', fullWidth }: CommonProps = {}) {
  return cn(base, variants[variant], sizes[size], fullWidth && 'w-full')
}

export function Button({
  variant,
  size,
  icon,
  iconRight,
  fullWidth,
  className,
  children,
  type = 'button',
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  const ptNode = usePTNode()
  return (
    <button type={type} className={cn(buttonClass({ variant, size, fullWidth }), className)} {...rest}>
      {icon}
      {ptNode(children)}
      {iconRight}
    </button>
  )
}

export function ButtonLink({
  variant,
  size,
  icon,
  iconRight,
  fullWidth,
  className,
  children,
  ...rest
}: CommonProps & LinkProps) {
  const ptNode = usePTNode()
  return (
    <Link className={cn(buttonClass({ variant, size, fullWidth }), className)} {...rest}>
      {icon}
      {ptNode(children)}
      {iconRight}
    </Link>
  )
}
