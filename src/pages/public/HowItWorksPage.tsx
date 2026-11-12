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
    <div className="bg-white min-h-[calc(100vh-64px)] py-12 md:py-20">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center mb-16">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4">How It Works</h1>
          <p className="text-lg text-slate-500">A simple guide to PESO Lipa's employment services.</p>
        </div>

        <div className="space-y-12 relative">
          {/* Vertical connector line */}
          <div className="absolute top-8 bottom-8 left-[31px] w-0.5 bg-brand-100 hidden sm:block" />

          {steps.map((step, i) => (
            <div key={i} className="flex flex-col sm:flex-row gap-6 sm:gap-8 relative">
              <div className="shrink-0 flex items-center justify-center h-16 w-16 rounded-full bg-brand-50 border-4 border-white shadow-sm relative z-10 mx-auto sm:mx-0">
                <step.icon className="h-7 w-7 text-brand-600" />
              </div>
              <div className="pt-2 text-center sm:text-left">
                <div className="flex items-center gap-3 justify-center sm:justify-start mb-2">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-brand-600 text-white text-xs font-bold">
                    {i + 1}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">{step.title}</h2>
                </div>
                <p className="text-slate-600 leading-relaxed max-w-lg mx-auto sm:mx-0">
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
