import { createPortal } from 'react-dom'
import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth'
import { Button, Modal } from '@/components/ui'
import { usePT } from '@/lib/portalCopy'
import { IDLE_WARNING } from '@/lib/sessionActivity'
export function SessionStatus() {
  const { user, idleSeconds, stayLoggedIn } = useAuth()
  const pt = usePT()
  const warning = !!user && idleSeconds > 0 && idleSeconds <= IDLE_WARNING / 1000
  const action = useRef<HTMLDivElement>(null)
  useEffect(() => { if (warning) action.current?.querySelector('button')?.focus() }, [warning])
  if (!user) return null
  const countdown = `${Math.floor(idleSeconds / 60)}:${String(idleSeconds % 60).padStart(2, '0')}`
  return <>
    <p className="mt-2 text-xs tabular-nums text-slate-500" title={pt('Time remaining before inactivity logout')}>
      {pt('Session')}: {countdown}
    </p>
    {createPortal(<Modal open={warning} dismissible={false} onClose={() => {}} title={pt('Your session is about to expire')}
      footer={<div ref={action} onKeyDown={event => { if (event.key === 'Tab') { event.preventDefault(); action.current?.querySelector('button')?.focus() } }}><Button onClick={stayLoggedIn}>{pt('Stay Logged In')}</Button></div>}>
      <p role="status">{pt('You will be signed out due to inactivity in')} <strong className="tabular-nums">{countdown}</strong>.</p>
    </Modal>, document.body)}
  </>
}
