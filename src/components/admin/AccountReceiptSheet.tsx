// @ts-nocheck
import { EnglishOnly } from '@/lib/portalCopy'

const shortDate = (value: Date) => value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

/**
 * The printable hand-over sheet for an applicant's portal login. Documents stay
 * English even in the Filipino UI, and the initial password is only ever present
 * while a freshly generated one is being handed over; later reprints show the
 * hand-over record with no password.
 */
export function AccountReceiptSheet({ receipt }) {
  // A printed receipt must outlive the machine that printed it, so it carries the public
  // portal address rather than the dev server origin.
  const portalUrl = (import.meta.env.VITE_APP_PUBLIC_URL
    || (typeof window === 'undefined' ? '' : window.location.origin)).replace(/\/$/, '')
  const issuedDate = receipt.issuedAt ? new Date(receipt.issuedAt) : null
  return (
    <EnglishOnly>
      <article
        id="account-receipt-content"
        className="paper mx-auto w-full max-w-[680px] rounded-xl border border-slate-300 p-8 shadow-sm"
      >
        <header className="flex items-start justify-between gap-4 border-b-2 border-brand-600 pb-4">
          <div>
            <p className="text-xl font-black tracking-tight text-brand-700">PESOLUTION</p>
            <p className="mt-1 text-xs font-bold uppercase text-slate-500">Public Employment Service Office — City of Lipa</p>
          </div>
          <p className="text-right text-xs text-slate-500">
            <span className="block font-bold uppercase text-slate-700">Account Receipt</span>
            {receipt.serial && <span className="block font-mono text-[0.8rem] font-bold tracking-wider text-slate-900">{receipt.serial}</span>}
            Issued {issuedDate ? shortDate(issuedDate) : 'Not recorded'}
          </p>
        </header>

        <h2 className="mt-5 text-lg font-black text-slate-900">Applicant Portal Login Credentials</h2>
        <p className="mt-1 text-xs text-slate-600">
          {receipt.password
            ? 'Keep this receipt private. This initial password was generated for this printout and is not stored anywhere else.'
            : 'This record confirms that PESO Lipa City handed over portal access. The initial password itself is never stored.'}
        </p>

        <dl className="mt-5 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
          <div className="border-b border-slate-200 pb-2">
            <dt className="text-xs font-bold uppercase text-slate-500">Applicant</dt>
            <dd className="mt-1 font-bold text-slate-900">{receipt.fullName || '—'}</dd>
          </div>
          <div className="border-b border-slate-200 pb-2">
            <dt className="text-xs font-bold uppercase text-slate-500">Applicant Code</dt>
            <dd className="mt-1 font-bold text-slate-900">{receipt.code || '—'}</dd>
          </div>
          <div className="border-b border-slate-200 pb-2">
            <dt className="text-xs font-bold uppercase text-slate-500">Login Email</dt>
            <dd className="mt-1 break-all font-bold text-slate-900">{receipt.email || '—'}</dd>
          </div>
          <div className="border-b border-slate-200 pb-2">
            <dt className="text-xs font-bold uppercase text-slate-500">Initial Password</dt>
            <dd className="mt-1 font-mono text-base font-bold tracking-widest text-slate-900">{receipt.password || '—'}</dd>
          </div>
        </dl>

        {receipt.password ? (
          <section className="mt-6 rounded-lg border-2 border-brand-200 bg-brand-50 p-4">
            <p className="text-sm font-black text-brand-800">Important: change this password on the first sign-in</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
              <li>Open the Applicant Portal at {portalUrl}.</li>
              <li>Sign in with the login email and initial password above.</li>
              <li>On your first sign-in the portal asks you to set your own private password before it opens your dashboard. You can also change it later under <strong>Profile &gt; Change Password</strong>.</li>
            </ol>
            <p className="mt-3 text-xs text-slate-600">
              If this receipt is lost, PESO staff issue a new initial password and print a new receipt from the applicant profile. The password printed here cannot be recovered, because PESOLUTION never stores it.
            </p>
          </section>
        ) : (
          <section className="mt-6 rounded-lg border-2 border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-800">
              {receipt.passwordSet ? 'This applicant already set their own password' : 'This password was never stored'}
            </p>
            <p className="mt-2 text-sm text-slate-700">
              {receipt.passwordSet
                ? `Sign in at ${portalUrl} with the password the applicant chose. PESO staff cannot read it, and if it is forgotten the applicant can be given a new initial password and a fresh receipt from their profile.`
                : `Initial passwords are generated for printing and then discarded, so this receipt cannot show a password again. Sign in at ${portalUrl} with the account email, or use Issue new initial password on this page to print a fresh receipt.`}
            </p>
          </section>
        )}

        <footer className="mt-8 grid gap-6 text-xs text-slate-600 sm:grid-cols-2">
          <div>
            <p className="border-b border-slate-400 pb-1 font-mono">
              {issuedDate ? issuedDate.toLocaleDateString('en-CA') : '—'}
            </p>
            <p className="mt-1 font-bold uppercase">Date issued</p>
          </div>
          <div>
            <p className="border-b border-slate-400 pb-1">&nbsp;</p>
            <p className="mt-1 font-bold uppercase">Applicant signature</p>
          </div>
        </footer>
      </article>
    </EnglishOnly>
  )
}
