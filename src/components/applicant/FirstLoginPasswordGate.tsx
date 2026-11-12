import { useCallback, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { PasswordChangeForm } from '@/components/applicant/PasswordChangeForm'
import { fetchApplicantPasswordChangedAt } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useQuery } from '@/lib/useQuery'
import { usePT } from '@/lib/portalCopy'

/**
 * A walk-in applicant signs in for the first time with the password printed on the
 * account receipt, so the portal makes them replace it before opening the dashboard.
 * Nothing shows while the state is unknown, i.e. before
 * 20261022_applicant_password_changed_at.sql is applied.
 */
export function FirstLoginPasswordGate() {
  const pt = usePT()
  const { user, logout } = useAuth()
  const email = user?.email || ''

  const fetcher = useCallback(() => fetchApplicantPasswordChangedAt(email), [email])
  const { data: changedAt, reload } = useQuery(fetcher, [email])
  const [leaving, setLeaving] = useState(false)

  // '' is the only state that still needs the gate: null means unknown (column not
  // migrated yet) and a timestamp means the applicant already replaced the printed one.
  if (changedAt !== '') return null

  return (
    <Modal
      open
      onClose={() => undefined}
      dismissible={false}
      size="lg"
      title="Set your own password first"
    >
      <div className="space-y-5">
        <p className="text-sm text-slate-600">
          {pt('You are still using the initial password printed on your account receipt. Anyone holding that paper can open your application, so choose a private password now. This page stays locked until you save it.')}
        </p>

        <PasswordChangeForm
          submitLabel={pt('Save my new password')}
          confirmBeforeSubmit={false}
          onChanged={reload}
        />

        <div className="flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-xs text-slate-500">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />
            {pt('PESO staff cannot see your new password. Your login email stays the same.')}
          </p>
          <Button
            variant="neutral"
            size="sm"
            className="shrink-0"
            disabled={leaving}
            onClick={() => { setLeaving(true); logout().finally(() => setLeaving(false)) }}
          >
            {leaving ? pt('Signing out...') : pt('Sign out instead')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
