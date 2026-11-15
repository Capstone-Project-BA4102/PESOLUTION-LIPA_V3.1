type Listener = () => void

const listeners = new Set<Listener>()
let hidden = true

/** Tracks whether the app shell is covered by the intro splash. */
export const appReveal = {
  get hidden() { return hidden },
  set(next: boolean) {
    if (hidden === next) return
    hidden = next
    if (!next) for (const listener of [...listeners]) listener()
  },
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  },
}
