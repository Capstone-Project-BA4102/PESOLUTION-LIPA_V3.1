import { ExternalLink, ShieldCheck } from 'lucide-react'
import { usePublicSite } from '@/lib/publicSite'

const privacySections = [
  ['Information we process', 'Applicant registration and employment records may include identification and contact details, demographic and education information, work history, skills, resume documents, a system-captured applicant photograph, account details, job matches, referral records, and system activity needed to operate and secure the service.'],
  ['Why we process it', 'PESO uses this information to register and identify applicants, maintain employment records, assess qualifications, match applicants with vacancies, provide skill-gap recommendations, process referral requests, communicate service updates, produce authorized employment statistics, secure the system, and comply with legal obligations.'],
  ['Automated assistance', 'Job match scores use disclosed rule-based weights. Gemini may assist with semantic skill comparison and skill-gap suggestions, but it does not make hiring decisions. PESO personnel and employers remain responsible for official employment actions.'],
  ['Sharing and access', 'Authorized PESO personnel may access applicant records for official duties. Relevant applicant information may be shared with prospective employers or authorized government offices only when necessary for employment facilitation, required by law, or otherwise supported by a lawful basis.'],
  ['Retention and security', 'Records are retained only for the period required by approved LGU records-retention rules, employment-service purposes, audit requirements, or applicable law. PESO applies role-based access and reasonable organizational, physical, and technical safeguards.'],
  ['Your data-subject rights', 'Subject to applicable law, you may ask to be informed, access or correct your data, object to or request restriction of processing, request erasure when legally available, receive data in a portable format where applicable, and lodge a complaint with the National Privacy Commission.'],
]

const termsSections = [
  ['Purpose of the service', 'PESOLUTION supports PESO applicant records, job matching, skill-gap guidance, application tracking, and referral processing. It does not guarantee employment, interviews, employer acceptance, or a particular hiring outcome.'],
  ['Account responsibilities', 'Use only the account issued or linked to you. Keep login credentials confidential, provide accurate and current information, and promptly report suspected unauthorized access. Do not impersonate another person or submit false or misleading records.'],
  ['Job matches and recommendations', 'Match scores and recommendations are decision-support information. Applicants should review job requirements and verify training availability, fees, and provider terms. Employers and PESO retain responsibility for official screening and referral decisions.'],
  ['Acceptable use', 'Do not disrupt the service, bypass access controls, upload malicious or unlawful content, scrape protected records, or use applicant and employer information for unauthorized purposes. Access may be restricted when needed to protect users, records, or public operations.'],
  ['Availability and external links', 'The service may be updated or temporarily unavailable. Links to external learning providers or official pages are provided for convenience; their content, availability, and separate terms are controlled by those providers.'],
  ['Changes and governing rules', 'PESO may update these terms to reflect service, legal, or policy changes. Use of the system remains subject to applicable Philippine laws, LGU policies, and official PESO procedures.'],
]

export default function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const { data } = usePublicSite()
  const office = data?.content
  const privacy = kind === 'privacy'
  const sections = privacy ? privacySections : termsSections
  return <div className="bg-white"><header className="border-b border-slate-200 bg-slate-50"><div className="mx-auto max-w-4xl px-5 py-14 sm:px-6"><ShieldCheck className="h-8 w-8 text-brand-700" /><p className="mt-5 text-base font-bold uppercase text-brand-700">PESOLUTION public policy</p><h1 className="mt-2 text-4xl font-bold sm:text-5xl">{privacy ? 'Privacy Notice' : 'Terms of Use'}</h1><p className="mt-4 text-lg leading-8 text-slate-600">{privacy ? 'How PESO Lipa City handles personal data in its employment facilitation system.' : 'Rules and responsibilities for using the PESOLUTION website and applicant portal.'}</p></div></header>
    <main className="mx-auto max-w-4xl px-5 py-12 sm:px-6"><div className="mb-10 border-l-4 border-warning-500 bg-warning-50 p-5 text-base leading-7 text-warning-800"><strong>Administrative review required:</strong> Before production use, the City Government’s Data Protection Officer and legal office should confirm the official personal information controller, DPO contact details, retention schedule, lawful bases, and approved data-sharing arrangements.</div>
      <div className="divide-y divide-slate-200 border-y border-slate-200">{sections.map(([title, body]) => <section key={title} className="py-7"><h2 className="text-2xl font-bold">{title}</h2><p className="mt-3 text-lg leading-8 text-slate-600">{body}</p></section>)}</div>
      <section className="py-8"><h2 className="text-2xl font-bold">Contact and official references</h2><p className="mt-3 text-lg leading-8 text-slate-600">For questions or requests, contact PESO Lipa City at {office?.email || 'the official office directory'}. Privacy concerns should also be routed to the City Government’s designated Data Protection Officer once officially confirmed.</p><div className="mt-5 flex flex-wrap gap-5"><a className="inline-flex items-center gap-2 font-bold text-brand-700" href="https://officialgazette.gov.ph/2012/08/15/republic-act-no-10173/" target="_blank" rel="noopener noreferrer">Data Privacy Act of 2012 <ExternalLink className="h-4 w-4" /></a><a className="inline-flex items-center gap-2 font-bold text-brand-700" href="https://privacy.gov.ph/the-data-privacy-act-and-its-irr/" target="_blank" rel="noopener noreferrer">NPC guidance <ExternalLink className="h-4 w-4" /></a></div></section>
      <p className="text-sm text-slate-500">Initial system policy version: October 12, 2026.</p>
    </main>
  </div>
}
