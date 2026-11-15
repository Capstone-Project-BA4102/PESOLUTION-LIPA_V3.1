import { useCountUp } from '@/lib/useCountUp'

export function CountUp({ value, duration = 800, format }: {
  value: number
  duration?: number
  format?: (value: number) => string
}) {
  const display = useCountUp(value, duration)
  const rounded = Math.round(display)
  return <>{format ? format(display) : rounded.toLocaleString()}</>
}
