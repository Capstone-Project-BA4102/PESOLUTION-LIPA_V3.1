import { createContext, useContext, type ReactNode } from 'react'
import { useLocale } from '../publicPreferences'

const filCopy = new Map<string, string>()

/**
 * Register English -> Filipino pairs for one feature area. Runs at import time,
 * so every dictionary module under src/lib/portalCopy is loaded through the barrel.
 */
export function registerFil(entries: Record<string, string>) {
  for (const [english, filipino] of Object.entries(entries)) filCopy.set(english, filipino)
}

function fill(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match))
}

/** Official documents (referral slip, report PDF, resume) must stay English. */
const EnglishContext = createContext(false)
export function EnglishOnly({ children }: { children: ReactNode }) {
  return <EnglishContext.Provider value>{children}</EnglishContext.Provider>
}

/**
 * Portal translation helper. The English text doubles as the key, so a string
 * that has no Filipino entry still renders as correct English instead of a raw key.
 * Use `{name}` placeholders for values that must sit inside a sentence.
 */
export function usePT() {
  const locale = useLocale()
  const keepEnglish = useContext(EnglishContext)
  return (text: string, vars?: Record<string, string | number>) => {
    if (keepEnglish || locale !== 'fil' || !text) return fill(text, vars)
    return fill(filCopy.get(text) ?? text, vars)
  }
}

/** Translate a ReactNode only when it is a plain string (JSX children stay untouched). */
export function usePTNode() {
  const pt = usePT()
  return (node: ReactNode): ReactNode => (typeof node === 'string' ? pt(node) : node)
}
