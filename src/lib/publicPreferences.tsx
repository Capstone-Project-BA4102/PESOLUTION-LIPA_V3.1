import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Locale = 'en' | 'fil'
export type Theme = 'light' | 'dark'

const COPY = {
  en: {
    home: 'Home', about: 'About', jobs: 'Job Opportunities', guide: 'How It Works', contact: 'Contact', login: 'Login',
    quickLinks: 'Quick Links', assistance: 'Need employment assistance?', assistanceText: 'View the official office directory, operating hours, and requirements before your visit.', contactPeso: 'Contact PESO Lipa', privacy: 'Privacy Notice', terms: 'Terms of Use',
    applicantInstructions: 'Applicant instructions', start: 'Start at the PESO Trabaho Center', startText: 'Registration is assisted onsite. Present a valid ID to verify your Lipa City residency and bring your resume in the accepted format. Your applicant photo will be taken onsite using the PESOLUTION system.',
    documents: 'Bring your documents', documentsText: 'Present a valid ID to verify that you are a Lipa City resident, together with your resume in the accepted format.', register: 'Register onsite', registerText: 'PESO personnel encode your record and take your applicant photo onsite using the PESOLUTION system.', matches: 'Receive job matches', matchesText: 'Your qualifications are compared with active job requirements and suitable jobs appear in your portal.', referral: 'Request a referral', referralText: 'Review match details, improve identified skill gaps, and request a PESO referral online.',
    browse: 'Browse Jobs', applicantGuide: 'Applicant Guide', activeJobs: 'Active jobs', vacancies: 'Open vacancies', officeHours: 'Office hours', acceptedResume: 'Accepted resume format', resumeTitle: 'Make your resume easy to review', resumeText: 'Use clear section headings and include the fields PESOLUTION reads for applicant registration. Submit one readable file in PDF, JPG, or PNG, up to 10 MB.', createResume: 'Create My Resume', sample: 'Printable sample', portalTitle: 'What the applicant portal is for', portalText: 'After onsite registration, use your PESOLUTION account to continue your employment journey online.', completeGuide: 'View complete guide', updates: 'PESO updates', announcements: 'Announcements', noAnnouncements: 'There are no current public announcements.', experiences: 'Applicant experiences', stories: 'Stories from people served by PESO',
    officeName: 'Lipa City Public Employment Service Office', heroTitle: 'Find work in Lipa City, with PESO beside you', heroLead: 'Employment assistance, job matching, and referral services for Lipa City jobseekers.', heroCaption: 'PESO Trabaho Center, Lipa City Hall',
    searchJobsPlaceholder: 'Search job title, company, or skill', searchAction: 'Search jobs', allLocations: 'All locations', industriesLabel: 'Industries',
    noOnlineRegistration: 'Registration is onsite at the PESO Trabaho Center. Bring a valid ID and your resume — staff will capture your photo and encode your record.',
    trustLabel: 'In partnership with the public employment service network', liveFromSystem: 'Live from PESOLUTION', openPositions: 'Open positions right now', openPositionsLabel: 'open positions', openPositionOne: 'open position',
    viewAllJobs: 'View all jobs', slotsLabel: 'slots', lastSlotLabel: '1 slot left', hardSkillsLabel: 'Hard skills', softSkillsLabel: 'Soft skills', viewJob: 'View job', postedLabel: 'Posted', noJobsMatch: 'No open positions match your search yet. Try a different keyword or browse all jobs.', loadingJobs: 'Loading open positions…',
    whatToBring: 'What to bring', bringResume: 'Resume in PDF, JPG, or PNG, up to 10 MB', bringId: 'Valid ID showing Lipa City residency', bringPhoto: 'Your applicant photo is taken onsite by PESO staff',
    requirementsNote: 'Walk-in registration and photo capture are done in person. The portal is for viewing matches, tracking status, and requesting referrals.',
    visitOffice: 'Visit the Trabaho Center', visitOfficeText: 'Registration and photo capture are done in person. Check the office location and schedule before your visit.', location: 'Location', telephone: 'Telephone', scheduleFallback: 'Contact PESO for the schedule.',
    resumePrivacy: 'The Resume Maker works in your browser and does not save personal data.', announcementsHint: 'Official notices and schedules from the PESO office.',
    ctaEyebrow: 'PESO Lipa City', ctaTitle: 'Start with a visit, continue online', ctaText: 'Register at the PESO Trabaho Center, then use your PESOLUTION account to review job matches and request referrals.', contactOffice: 'Contact the office',
    portalUse1: 'Review rule-based job match scores and skill requirements', portalUse2: 'See matched skills, skill gaps, and improvement suggestions', portalUse3: 'Request and monitor PESO employment referrals', portalUse4: 'Track current and previous application status', sampleContent: 'Sample content', language: 'Language', appearance: 'Appearance', light: 'Light', dark: 'Dark',
    storiesConsent: 'Each story is published only with the applicant’s written consent from PESO feedback gathering.',
    simulatorEyebrow: 'Job matching simulator', simulatorTitle: 'See how a job match is scored', simulatorLead: 'Pick a quick sample resume and compare it with four dummy job orders. The demo uses the same weights as the portal: 50% hard skills, 30% soft skills, and 20% education.',
    simulatorSampleResume: 'Your sample resume', simulatorEducation: 'Highest education', simulatorHardLabel: 'Hard skills · 50%', simulatorSoftLabel: 'Soft skills · 30%', simulatorEducationLabel: 'Education · 20%',
    simulatorCutoff: 'cutoff 60%', simulatorMet: 'Met', simulatorNotMet: 'Not met', simulatorGapLabel: 'Skill to build',
    simulatorReset: 'Reset sample', simulatorShuffle: 'Shuffle sample jobs', simulatorJobs: 'Sample job orders', simulatorMatch: 'match',
    simulatorMatched: 'Matched requirements', simulatorGaps: 'Skill gaps', simulatorThresholdMet: 'At or above the 60% matching threshold', simulatorThresholdMissed: 'Below the 60% matching threshold',
    simulatorEducationMet: 'Education requirement met', simulatorEducationMissed: 'Education requirement not met', simulatorRequires: 'Requires',
    simulatorSelected: 'selected', simulatorTapHint: 'Tap a skill to add or remove it from the sample resume.', simulatorRanked: 'Ranked by match score', simulatorBestMatch: 'Best match',
    simulatorFormulaTitle: 'How the score is computed', simulatorFormula: 'Final score = (hard skills × 50%) + (soft skills × 30%) + (education × 20%). A job passes when the final score reaches 60%.',
    simulatorPrivacy: 'This simulator runs only in your browser and saves nothing. After onsite registration, your real match results use your encoded resume and active job orders.',
  },
  fil: {
    home: 'Tahanan', about: 'Tungkol', jobs: 'Mga Trabaho', guide: 'Paano Ito Gumagana', contact: 'Makipag-ugnayan', login: 'Mag-login',
    quickLinks: 'Mabilis na Links', assistance: 'Kailangan ng tulong sa trabaho?', assistanceText: 'Tingnan ang opisyal na address, oras ng opisina, at mga kailangang dalhin bago bumisita.', contactPeso: 'Makipag-ugnayan sa PESO Lipa', privacy: 'Abiso sa Privacy', terms: 'Mga Tuntunin',
    applicantInstructions: 'Gabay sa aplikante', start: 'Magsimula sa PESO Trabaho Center', startText: 'Ang registration ay ginagawa sa opisina. Magpakita ng valid ID bilang patunay na residente ng Lipa City at dalhin ang resume sa tinatanggap na format. Kukunan kayo ng litrato sa mismong opisina gamit ang PESOLUTION system.',
    documents: 'Dalhin ang mga dokumento', documentsText: 'Magpakita ng valid ID bilang patunay na residente ng Lipa City at dalhin ang resume sa tinatanggap na format.', register: 'Magparehistro sa opisina', registerText: 'Ilalagay ng PESO personnel ang inyong record at kukunan kayo ng applicant photo gamit ang PESOLUTION system.', matches: 'Tanggapin ang job matches', matchesText: 'Ihahambing ang inyong kwalipikasyon sa requirements ng mga aktibong trabaho at lalabas ang angkop na trabaho sa portal.', referral: 'Humiling ng referral', referralText: 'Suriin ang match details at skill gaps bago humiling ng PESO referral online.',
    browse: 'Tingnan ang Mga Trabaho', applicantGuide: 'Gabay sa Aplikante', activeJobs: 'Aktibong trabaho', vacancies: 'Bakanteng posisyon', officeHours: 'Oras ng opisina', acceptedResume: 'Tinatanggap na resume format', resumeTitle: 'Gawing madaling suriin ang iyong resume', resumeText: 'Gumamit ng malinaw na headings at isama ang mga impormasyong binabasa ng PESOLUTION. Magsumite ng isang malinaw na PDF, JPG, o PNG file na hanggang 10 MB.', createResume: 'Gumawa ng Resume', sample: 'Sample na napi-print', portalTitle: 'Para saan ang applicant portal', portalText: 'Pagkatapos ng onsite registration, gamitin ang PESOLUTION account upang ipagpatuloy online ang inyong employment journey.', completeGuide: 'Tingnan ang buong gabay', updates: 'Mga update ng PESO', announcements: 'Mga Anunsyo', noAnnouncements: 'Walang kasalukuyang pampublikong anunsyo.', experiences: 'Karanasan ng aplikante', stories: 'Mga kuwento ng mga natulungan ng PESO',
    officeName: 'Lipa City Public Employment Service Office', heroTitle: 'Maghanap ng trabaho sa Lipa City, kasama ang PESO', heroLead: 'Tulong sa trabaho, job matching, at referral services para sa mga jobseeker ng Lipa City.', heroCaption: 'PESO Trabaho Center, Lipa City Hall',
    searchJobsPlaceholder: 'Maghanap ng posisyon, kumpanya, o skill', searchAction: 'Maghanap ng trabaho', allLocations: 'Lahat ng lokasyon', industriesLabel: 'Mga industriya',
    noOnlineRegistration: 'Ang registration ay sa PESO Trabaho Center. Magdala ng valid ID at resume — kukunan kayo ng litrato at ie-encode ng staff ang record.',
    trustLabel: 'Sa pakikipagtulungan ng public employment service network', liveFromSystem: 'Live mula sa PESOLUTION', openPositions: 'Mga bukas na posisyon ngayon', openPositionsLabel: 'bukas na posisyon', openPositionOne: 'bukas na posisyon',
    viewAllJobs: 'Tingnan lahat ng trabaho', slotsLabel: 'slots', lastSlotLabel: '1 slot na lang', hardSkillsLabel: 'Hard skills', softSkillsLabel: 'Soft skills', viewJob: 'Tingnan ang trabaho', postedLabel: 'Nai-post', noJobsMatch: 'Wala pang bukas na posisyong tugma sa inyong hinahanap. Subukan ang ibang keyword o tingnan lahat ng trabaho.', loadingJobs: 'Nilo-load ang mga bukas na posisyon…',
    whatToBring: 'Mga dapat dalhin', bringResume: 'Resume sa PDF, JPG, o PNG, hanggang 10 MB', bringId: 'Valid ID bilang patunay ng paninirahan sa Lipa City', bringPhoto: 'Ang applicant photo ay kukunan sa opisina ng PESO staff',
    requirementsNote: 'Ang walk-in registration at pagkuha ng litrato ay personal na ginagawa. Ang portal ay para sa pagtingin ng matches, pagsubaybay ng status, at paghingi ng referral.',
    visitOffice: 'Bisitahin ang Trabaho Center', visitOfficeText: 'Ang registration at pagkuha ng litrato ay personal na ginagawa. Tingnan ang lokasyon at iskedyul ng opisina bago bumisita.', location: 'Lokasyon', telephone: 'Telepono', scheduleFallback: 'Makipag-ugnayan sa PESO para sa iskedyul.',
    resumePrivacy: 'Ang Resume Maker ay gumagana sa inyong browser at hindi nagse-save ng personal na data.', announcementsHint: 'Mga opisyal na abiso at schedule mula sa PESO office.',
    ctaEyebrow: 'PESO Lipa City', ctaTitle: 'Magsimula sa pagbisita, magpatuloy online', ctaText: 'Magparehistro sa PESO Trabaho Center, pagkatapos ay gamitin ang PESOLUTION account para sa job matches at referral.', contactOffice: 'Makipag-ugnayan sa opisina',
    portalUse1: 'Suriin ang rule-based job match scores at skill requirements', portalUse2: 'Tingnan ang matched skills, skill gaps, at mga mungkahi sa pagpapabuti', portalUse3: 'Humiling at subaybayan ang PESO employment referrals', portalUse4: 'Subaybayan ang kasalukuyan at dating status ng application', sampleContent: 'Halimbawang nilalaman', language: 'Wika', appearance: 'Itsura', light: 'Maliwanag', dark: 'Madilim',
    storiesConsent: 'Ang bawat kuwento ay inilalathala lamang kapag may nakasulat na pahintulot ang aplikante mula sa feedback gathering ng PESO.',
    simulatorEyebrow: 'Simulator ng job matching', simulatorTitle: 'Tingnan kung paano nagsu-score ang job match', simulatorLead: 'Pumili ng mabilis na sample resume at ihambing ito sa apat na dummy na job order. Pareho ang weights na ginagamit ng portal: 50% hard skills, 30% soft skills, at 20% edukasyon.',
    simulatorSampleResume: 'Iyong sample na resume', simulatorEducation: 'Pinakamataas na edukasyon', simulatorHardLabel: 'Hard skills · 50%', simulatorSoftLabel: 'Soft skills · 30%', simulatorEducationLabel: 'Edukasyon · 20%',
    simulatorCutoff: 'cutoff 60%', simulatorMet: 'Natugunan', simulatorNotMet: 'Hindi natugunan', simulatorGapLabel: 'Kasanayang palakasin',
    simulatorReset: 'I-reset ang sample', simulatorShuffle: 'Palitan ang sample na trabaho', simulatorJobs: 'Mga sample na job order', simulatorMatch: 'match',
    simulatorMatched: 'Mga natugunang requirement', simulatorGaps: 'Mga kulang na skill', simulatorThresholdMet: 'Umabot sa 60% matching threshold', simulatorThresholdMissed: 'Mababa sa 60% matching threshold',
    simulatorEducationMet: 'Natugunan ang education requirement', simulatorEducationMissed: 'Hindi natugunan ang education requirement', simulatorRequires: 'Kailangan',
    simulatorSelected: 'napili', simulatorTapHint: 'I-tap ang skill para idagdag o alisin sa sample resume.', simulatorRanked: 'Naka-rank ayon sa match score', simulatorBestMatch: 'Pinakamalapit na match',
    simulatorFormulaTitle: 'Paano kinukwenta ang score', simulatorFormula: 'Final score = (hard skills × 50%) + (soft skills × 30%) + (edukasyon × 20%). Pumapasa ang trabaho kapag umabot sa 60% ang final score.',
    simulatorPrivacy: 'Gumagana ang simulator na ito sa browser lamang at walang sine-save. Pagkatapos ng onsite registration, gagamitin ng tunay na match results ang na-encode na resume at aktibong job orders.',
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
