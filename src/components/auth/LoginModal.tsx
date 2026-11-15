// @ts-nocheck
import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, Mail } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAuth, roleHome } from '@/lib/auth'
import { usePT } from '@/lib/portalCopy'
import { Button, Input, Modal, IconButton } from '@/components/ui'

export function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pt = usePT()
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)

  useEffect(() => {
    if (user && open) {
      onClose()
      navigate(roleHome(user.role))
    }
  }, [user, navigate, onClose, open])

  if (!open) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting.current) return
    submitting.current = true
    setBusy(true)
    try {
      const role = await login(username, password)
      if (!role) {
        toast.error(pt('Incorrect email/User ID or password. Please try again.'))
        return
      }
      toast.success(pt('Logged in successfully'))
      // Navigation is handled by the useEffect watching `user` state
    } catch (err: any) {
      toast.error(err.message || pt('Login failed. Please check your credentials.'))
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} dismissible={!busy} title={pt('Login')} size="sm">
      <div className="mb-5 flex items-center gap-3">
        <img src="/logo-lipa.png" alt={pt('City of Lipa official seal')} className="h-[40px] w-[40px] object-contain" />
        <div><p className="text-[15px] font-semibold text-brand-600">PESOLUTION</p><p className="text-[12px] text-slate-500">PESO LIPA CITY</p></div>
      </div>
      <p className="mb-4 text-[14px] text-slate-600">{pt('Please enter your credentials to continue.')}</p>
      <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
        <Input label="Email / User ID" leftIcon={<Mail />} placeholder="Enter your email or User ID"
          value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" required disabled={busy} />
        <Input label="Password" type={show ? 'text' : 'password'} placeholder="Enter your password"
          value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required disabled={busy}
          rightSlot={<IconButton label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow(value => !value)}>{show ? <Eye /> : <EyeOff />}</IconButton>} />
        <Button type="submit" fullWidth disabled={busy} icon={<LogIn className="h-[16px] w-[16px]" />}>{busy ? pt('Logging in...') : pt('Login')}</Button>
        <p className="border-t border-slate-200 pt-4 text-[13px] leading-relaxed text-slate-500">{pt("Don't have an account yet? Please visit the PESO Lipa City office to have one created for you.")}</p>
      </form>
    </Modal>
  )
}
