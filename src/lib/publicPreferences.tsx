import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Locale = 'en' | 'fil'
export type Theme = 'light' | 'dark'

const COPY = {
  en: {
    home: 'Home', about: 'About', jobs: 'Job Opportunities', guide: 'How It Works', contact: 'Contact', login: 'Login',
    quickLinks: 'Quick Links', assistance: 'Need employment assistance?', assistanceText: 'View the official office directory, operating hours, and requirements before your visit.', contactPeso: 'Contact PESO Lipa', privacy: 'Privacy Notice', terms: 'Terms of Use',
    applicantInstructions: 'Applicant instructions', start: 'Start at the PESO Trabaho Center', startText: 'Registration is assisted onsite. Present a valid ID to verify your Lipa City residency and bring your resume in the accepted format. Your applicant photo will be taken onsite using the PESOLUTION system.',
    documents: 'Bring your documents', documentsText: 'Present a valid ID to verify that you are a Lipa City resident, together with your resume in the accepted format.', register: 'Register onsite', registerText: 'PESO personnel encode your record and take your applicant photo onsite using the PESOLUTION system.', matches: 'Receive job matches', matchesText: 'Your qualifications are compared with active job requirements and suitable jobs appear in your portal.', referral: 'Request a referral', referralText: 'Review match details, improve identified skill gaps, and request a PESO referral online.',
    browse: 'Browse Jobs', applicantGuide: 'Applicant Guide', activeJobs: 'Active jobs', vacancies: 'Open vacancies', officeHours: 'Office hours', acceptedResume: 'Accepted resume format', resumeTitle: 'Make your resume easy to review', resumeText: 'Use clear section headings and include the fields PESOLUTION reads for applicant registration. Submit one readable file in PDF, JPG, or PNG, up to 10 MB.', createResume: 'Create My Resume', sample: 'Printable sample', portalTitle: 'What the applicant portal is for', portalText: 'After onsite registration, use your PESOLUTION account to continue your employment journey online.', completeGuide: 'View complete guide', updates: 'PESO updates', announcements: 'Announcements', noAnnouncements: 'There are no current public announcements.', experiences: 'Applicant experiences', stories: 'Stories from people served by PESO', sampleContent: 'Sample content', language: 'Language', appearance: 'Appearance', light: 'Light', dark: 'Dark',
  },
  fil: {
    home: 'Tahanan', about: 'Tungkol', jobs: 'Mga Trabaho', guide: 'Paano Ito Gumagana', contact: 'Makipag-ugnayan', login: 'Mag-login',
    quickLinks: 'Mabilis na Links', assistance: 'Kailangan ng tulong sa trabaho?', assistanceText: 'Tingnan ang opisyal na address, oras ng opisina, at mga kailangang dalhin bago bumisita.', contactPeso: 'Makipag-ugnayan sa PESO Lipa', privacy: 'Abiso sa Privacy', terms: 'Mga Tuntunin',
    applicantInstructions: 'Gabay sa aplikante', start: 'Magsimula sa PESO Trabaho Center', startText: 'Ang registration ay ginagawa sa opisina. Magpakita ng valid ID bilang patunay na residente ng Lipa City at dalhin ang resume sa tinatanggap na format. Kukunan kayo ng litrato sa mismong opisina gamit ang PESOLUTION system.',
    documents: 'Dalhin ang mga dokumento', documentsText: 'Magpakita ng valid ID bilang patunay na residente ng Lipa City at dalhin ang resume sa tinatanggap na format.', register: 'Magparehistro sa opisina', registerText: 'Ilalagay ng PESO personnel ang inyong record at kukunan kayo ng applicant photo gamit ang PESOLUTION system.', matches: 'Tanggapin ang job matches', matchesText: 'Ihahambing ang inyong kwalipikasyon sa requirements ng mga aktibong trabaho at lalabas ang angkop na trabaho sa portal.', referral: 'Humiling ng referral', referralText: 'Suriin ang match details at skill gaps bago humiling ng PESO referral online.',
    browse: 'Tingnan ang Mga Trabaho', applicantGuide: 'Gabay sa Aplikante', activeJobs: 'Aktibong trabaho', vacancies: 'Bakanteng posisyon', officeHours: 'Oras ng opisina', acceptedResume: 'Tinatanggap na resume format', resumeTitle: 'Gawing madaling suriin ang iyong resume', resumeText: 'Gumamit ng malinaw na headings at isama ang mga impormasyong binabasa ng PESOLUTION. Magsumite ng isang malinaw na PDF, JPG, o PNG file na hanggang 10 MB.', createResume: 'Gumawa ng Resume', sample: 'Sample na napi-print', portalTitle: 'Para saan ang applicant portal', portalText: 'Pagkatapos ng onsite registration, gamitin ang PESOLUTION account upang ipagpatuloy online ang inyong employment journey.', completeGuide: 'Tingnan ang buong gabay', updates: 'Mga update ng PESO', announcements: 'Mga Anunsyo', noAnnouncements: 'Walang kasalukuyang pampublikong anunsyo.', experiences: 'Karanasan ng aplikante', stories: 'Mga kuwento ng mga natulungan ng PESO', sampleContent: 'Halimbawang nilalaman', language: 'Wika', appearance: 'Itsura', light: 'Maliwanag', dark: 'Madilim',
  },
} as const

type CopyKey = keyof typeof COPY.en
type Preferences = { locale: Locale; setLocale: (value: Locale) => void; theme: Theme; setTheme: (value: Theme) => void; t: (key: CopyKey) => string }
const Context = createContext<Preferences | null>(null)

export function PublicPreferencesProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => localStorage.getItem('pesolution-locale') === 'fil' ? 'fil' : 'en')
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('pesolution-theme') === 'dark' ? 'dark' : 'light'))
  useEffect(() => { localStorage.setItem('pesolution-locale', locale); document.documentElement.lang = locale === 'fil' ? 'fil' : 'en' }, [locale])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('pesolution-theme', theme)
  }, [theme])
  const value = useMemo(() => ({ locale, setLocale, theme, setTheme, t: (key: CopyKey) => COPY[locale][key] }), [locale, theme])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function usePublicPreferences() {
  const value = useContext(Context)
  if (!value) throw new Error('usePublicPreferences must be used inside PublicPreferencesProvider')
  return value
}

/** Locale only, safe outside the provider (defaults to English). */
export function useLocale(): Locale {
  return useContext(Context)?.locale ?? 'en'
}
