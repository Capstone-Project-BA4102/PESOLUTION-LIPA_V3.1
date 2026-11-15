import { FileText, ClipboardList, GitCompareArrows, Mail, MonitorSmartphone } from 'lucide-react'

export default function HowItWorksPage() {
  const steps = [
    {
      icon: FileText,
      title: 'Visit PESO Lipa',
      desc: 'Go to PESO Lipa and bring your updated resume and a valid government-issued ID.'
    },
    {
      icon: ClipboardList,
      title: 'Registration & Assessment',
      desc: 'PESO staff will encode your information, capture your applicant photo through the system, and assess your qualifications.'
    },
    {
      icon: GitCompareArrows,
      title: 'Job Matching',
      desc: 'Your skills and qualifications will be matched with available job opportunities.'
    },
    {
      icon: Mail,
      title: 'Receive Your Portal Account',
      desc: 'PESO staff will provide your portal credentials after your walk-in registration is completed.'
    },
    {
      icon: MonitorSmartphone,
      title: 'Check Your Status Online',
      desc: 'Log in to the applicant portal to view your status, recommendations, and referral information.'
    }
  ]

  return (
    <div className="min-h-[calc(100vh-64px)] bg-white py-10 md:py-14">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-10 text-center">
          <h1 className="mb-2 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">How It Works</h1>
          <p className="text-[15px] text-slate-500">A simple guide to PESO Lipa's employment services.</p>
        </div>

        <div className="relative space-y-8">
          {/* Vertical connector line */}
          <div className="absolute top-7 bottom-7 left-[27px] hidden w-px bg-brand-100 sm:block" />

          {steps.map((step, i) => (
            <div key={i} className="relative flex flex-col gap-4 sm:flex-row sm:gap-6">
              <div className="relative z-10 mx-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-white bg-brand-100 shadow-sm sm:mx-0">
                <step.icon className="h-6 w-6 text-brand-600" />
              </div>
              <div className="pt-1 text-center sm:text-left">
                <div className="mb-1.5 flex items-center justify-center gap-2 sm:justify-start">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <h2 className="text-lg font-semibold text-slate-900">{step.title}</h2>
                </div>
                <p className="mx-auto max-w-lg text-[13.5px] leading-relaxed text-slate-600 sm:mx-0">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
