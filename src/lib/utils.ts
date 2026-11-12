/** Joins class names, skipping falsy values. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

/** Formats a number as Philippine Peso, e.g. ₱18,000 */
export function peso(value: number): string {
  return `₱${value.toLocaleString('en-PH')}`
}

/** Returns initials from a full name, e.g. "Maria Santos" -> "MS" */
export function initials(name: string): string {
  return name
    .split(' ')
    .filter((p) => p.length > 0 && p[0] === p[0].toUpperCase())
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
}
