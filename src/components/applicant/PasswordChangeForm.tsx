import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Form'
import { Modal } from '@/components/ui/Modal'
import { changeApplicantPassword, fetchPasswordChangeAllowance } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { usePT } from '@/lib/portalCopy'

/**
 * Current -> new -> confirm password form, shared by the Profile card and the
 * first-sign-in prompt. The backend checks the current password with Supabase
 * Authentication before it applies the new one, so it is asked for.
 */
export function PasswordChangeForm({
  onChanged,
  submitLabel,
  confirmBeforeSubmit = true,
}: {
  onChanged: (iso: string) => void
  submitLabel?: string
  confirmBeforeSubmit?: boolean
}) {
  const pt = usePT()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [ask, setAsk] = useState(false)
  const { data: allowance, reload: reloadAllowance } = useQuery(fetchPasswordChangeAllowance)
  const exhausted = allowance ? allowance.remaining <= 0 : false

  const mismatch = confirm.length > 0 && confirm !== next
  const tooShort = next.length > 0 && next.length < 8
  const ready = Boolean(current) && next.length >= 8 && confirm === next && current !== next

  const submit = async () => {
    setAsk(false)
    setSaving(true)
    const stamp = toast.loading(pt('Updating your password...'))
    try {
      const { changedAt } = await changeApplicantPassword(current, next)
      onChanged(changedAt)
      setCurrent(''); setNext(''); setConfirm('')
      reloadAllowance()
      toast.success(pt('Password changed. Use it the next time you sign in.'), { id: stamp })
    } catch (e) {
      toast.error(e instanceof Error ? pt(e.message) : pt('Your password could not be changed.'), { id: stamp })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Current Password"
          type="password"
          autoComplete="current-password"
          required
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          hint={pt('The password you sign in with now.')}
        />
        <Input
          label="New Password"
          type="password"
          autoComplete="new-password"
          required
          value={next}
          onChange={(e) => setNext(e.target.value)}
          error={tooShort ? pt('Use at least 8 characters.') : undefined}
          hint={pt('At least 8 characters.')}
        />
        <Input
          label="Confirm New Password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={mismatch ? pt('The two new passwords do not match.') : undefined}
          wrapperClassName="sm:col-span-2"
        />
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-xs ${exhausted ? 'font-semibold text-warning-700' : 'text-slate-500'}`}>
          {exhausted
            ? pt('You have used all 3 password changes for this week. Please try again in a few days.')
            : allowance
              ? pt('You can change your password up to {limit} times per week. Used this week: {used} of {limit}.', { limit: String(allowance.limit), used: String(allowance.used) })
              : pt('You can change your password up to 3 times per week.')}
        </p>
        <Button
          variant="primary"
          className="shrink-0"
          disabled={saving || !ready || exhausted}
          onClick={() => (confirmBeforeSubmit ? setAsk(true) : submit())}
        >
          {saving ? pt('Updating...') : submitLabel || pt('Change Password')}
        </Button>
      </div>

      <Modal
        open={ask}
        onClose={() => setAsk(false)}
        title="Change your password?"
        footer={
          <>
            <Button variant="neutral" onClick={() => setAsk(false)}>Cancel</Button>
            <Button onClick={submit}>Yes, change it</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          {pt('Your initial password will stop working right away. Sign in next time with the new password you just chose.')}
        </p>
      </Modal>
    </>
  )
}
