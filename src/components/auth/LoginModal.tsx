// @ts-nocheck
import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Info, LogIn, Mail, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useAuth, roleHome } from '@/lib/auth'
import { usePT } from '@/lib/portalCopy'
import { Button, Card, Input } from '@/components/ui'

export function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pt = usePT()
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  useEffect(() => {
    if (user && open) {
      onClose()
      navigate(roleHome(user.role))
    }
  }, [user, navigate, onClose, open])

  if (!open) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
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
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/70 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="relative w-full max-w-5xl" onClick={e => e.stopPropagation()}>
        {/* Close button on top right of the modal */}
        <button 
          onClick={onClose} 
          className="absolute -top-12 right-0 md:-right-12 md:top-0 p-2 text-white hover:text-brand-300 transition-colors"
          aria-label={pt('Close modal')}
        >
          <X className="h-8 w-8" />
        </button>
        
        <Card className="grid w-full overflow-hidden md:grid-cols-2 animate-in zoom-in-95 duration-200">
          {/* Brand panel */}
          <div className="force-light flex flex-col items-center justify-center gap-4 bg-brand-600 px-8 py-12 text-center text-white">
            <span className="flex h-32 w-32 items-center justify-center rounded-full bg-white shadow-lg">
              <img src="/logo-lipa.png" alt={pt('City of Lipa official seal')} className="h-28 w-28" />
            </span>
            <div>
              <p className="text-lg font-bold tracking-wider text-white/90">PESO LIPA CITY</p>
              <p className="text-4xl font-bold">PESOLUTION</p>
              <p className="mt-1 font-semibold tracking-widest text-white/95">{pt('PORTAL LOGIN')}</p>
            </div>
            <p className="max-w-sm text-lg text-white/95">{pt('Your access to job opportunities, referral tracking, and employment management.')}</p>
          </div>

          {/* Form panel */}
          <div className="px-6 py-10 sm:px-10 bg-white">
            <h1 className="text-3xl font-bold">Login</h1>
            <p className="mt-1 text-lg text-slate-600">{pt('Please enter your credentials to continue.')}</p>

            <form onSubmit={submit} className="mt-6 flex flex-col gap-5">
              <Input
                label="Email / User ID"
                leftIcon={<Mail />}
                placeholder="Enter your email or User ID"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
              <Input
                label="Password"
                type={show ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                rightSlot={
                  <button type="button" onClick={() => setShow((s) => !s)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label={show ? pt('Hide password') : pt('Show password')}>
                    {show ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                  </button>
                }
              />

              <Button type="submit" size="lg" fullWidth icon={<LogIn className="h-5 w-5" />}>
                Login
              </Button>

              <div className="flex items-start gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-brand-800">
                <Info className="mt-0.5 h-6 w-6 shrink-0 text-brand-600" />
                <p className="font-semibold">
                  {pt("Don't have an account yet? Please visit the PESO Lipa City office to have one created for you.")}
                </p>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
  )
}
