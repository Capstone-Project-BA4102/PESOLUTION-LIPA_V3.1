import { lazy, Suspense, useState, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { BarChart3, Briefcase, Building2, ClipboardList, FileText, Home, Puzzle, Settings, User, Users, Workflow } from 'lucide-react'
import { AuthProvider, useAuth, roleHome, type Role } from '@/lib/auth'
import { appReveal } from '@/lib/appReveal'
import { PublicPreferencesProvider } from '@/lib/publicPreferences'
import AdminWebsitePage from '@/pages/admin/AdminWebsitePage'
import { useQuery } from '@/lib/useQuery'
import { fetchApplicantMatchedJobs } from '@/lib/api'
import { PortalLayout, type NavItem } from '@/components/layout/PortalLayout'
import { FirstLoginPasswordGate } from '@/components/applicant/FirstLoginPasswordGate'
import { PublicLayout } from '@/components/layout/PublicLayout'

// Public
import LandingPage from '@/pages/public/LandingPage'
import AboutPage from '@/pages/public/AboutPage'
import JobsPage from '@/pages/public/JobsPage'
import HowItWorksPage from '@/pages/public/HowItWorksPage'
import ContactPage from '@/pages/public/ContactPage'
import LegalPage from '@/pages/public/LegalPage'
// Batch 5 visual reference screens (fixtures only, no auth, not linked from the app)
import DesignPreviewIndex from '@/pages/design-preview/DesignPreviewIndex'
import DesignPreviewLanding from '@/pages/design-preview/DesignPreviewLanding'
import DesignPreviewAdminDashboard from '@/pages/design-preview/DesignPreviewAdminDashboard'
import DesignPreviewAdminApplicants from '@/pages/design-preview/DesignPreviewAdminApplicants'
import DesignPreviewAdminCompanies from '@/pages/design-preview/DesignPreviewAdminCompanies'
import DesignPreviewAdminMatching from '@/pages/design-preview/DesignPreviewAdminMatching'
import DesignPreviewApplicantDashboard from '@/pages/design-preview/DesignPreviewApplicantDashboard'
import DesignPreviewApplicantJobs from '@/pages/design-preview/DesignPreviewApplicantJobs'
// Route modules are declared once so each portal can warm them after the splash.
const lazyPages = {
  applicantDashboard: () => import('@/pages/applicant/ApplicantDashboard'),
  resumeMaker: () => import('@/pages/public/ResumeMakerPage'),
  applicantProfile: () => import('@/pages/applicant/ApplicantProfile'),
  applicationStatus: () => import('@/pages/applicant/ApplicationStatus'),
  applicantJobs: () => import('@/pages/applicant/ApplicantJobs'),
  adminDashboard: () => import('@/pages/admin/AdminDashboard'),
  applicants: () => import('@/pages/admin/ApplicantsPage'),
  registerWalkIn: () => import('@/pages/admin/RegisterWalkIn'),
  accountReceipt: () => import('@/pages/admin/ApplicantAccountReceiptPage'),
  companies: () => import('@/pages/admin/CompaniesPage'),
  addCompany: () => import('@/pages/admin/AddCompanyPage'),
  jobListings: () => import('@/pages/admin/JobListingsPage'),
  addJob: () => import('@/pages/admin/AddJobPage'),
  matching: () => import('@/pages/admin/MatchingPage'),
  matchDetails: () => import('@/pages/admin/MatchDetailsPage'),
  referralSlip: () => import('@/pages/admin/ReferralSlipPage'),
  activities: () => import('@/pages/admin/ActivitiesPage'),
  analytics: () => import('@/pages/admin/AnalyticsPage'),
} as const

const ApplicantDashboard = lazy(lazyPages.applicantDashboard)
const ResumeMakerPage = lazy(lazyPages.resumeMaker)
const ApplicantProfile = lazy(lazyPages.applicantProfile)
const ApplicationStatus = lazy(lazyPages.applicationStatus)
const ApplicantJobs = lazy(lazyPages.applicantJobs)
const AdminDashboard = lazy(lazyPages.adminDashboard)
const ApplicantsPage = lazy(lazyPages.applicants)
const RegisterWalkIn = lazy(lazyPages.registerWalkIn)
const ApplicantAccountReceiptPage = lazy(lazyPages.accountReceipt)
const CompaniesPage = lazy(lazyPages.companies)
const AddCompanyPage = lazy(lazyPages.addCompany)
const JobListingsPage = lazy(lazyPages.jobListings)
const AddJobPage = lazy(lazyPages.addJob)
const MatchingPage = lazy(lazyPages.matching)
const MatchDetailsPage = lazy(lazyPages.matchDetails)
const ReferralSlipPage = lazy(lazyPages.referralSlip)
const ActivitiesPage = lazy(lazyPages.activities)
const AnalyticsPage = lazy(lazyPages.analytics)

const APPLICANT_CHUNKS = [
  lazyPages.applicantDashboard,
  lazyPages.applicantProfile,
  lazyPages.applicationStatus,
  lazyPages.applicantJobs,
]
const ADMIN_CHUNKS = [
  lazyPages.adminDashboard,
  lazyPages.applicants,
  lazyPages.registerWalkIn,
  lazyPages.accountReceipt,
  lazyPages.companies,
  lazyPages.addCompany,
  lazyPages.jobListings,
  lazyPages.addJob,
  lazyPages.matching,
  lazyPages.matchDetails,
  lazyPages.referralSlip,
  lazyPages.activities,
  lazyPages.analytics,
]

/** Warms route chunks in the background so navigation never waits on a fallback. */
function usePrefetch(loaders: ReadonlyArray<() => Promise<unknown>>) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      for (const load of loaders) void load().catch(() => {})
    }, 2500)
    return () => window.clearTimeout(timer)
  }, [loaders])
}

/** ONE admin menu used on every admin page (fixes inconsistent sidebars in the wireframes). */
const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Home', icon: <Home />, end: true },
  { to: '/admin/applicants', label: 'Applicants', icon: <Users /> },
  { to: '/admin/companies', label: 'Companies', icon: <Building2 /> },
  { to: '/admin/jobs', label: 'Job Listings', icon: <ClipboardList /> },
  { to: '/admin/matching', label: 'Matching', icon: <Puzzle /> },
  { to: '/admin/activities', label: 'Activities', icon: <Workflow /> },
  { to: '/admin/analytics', label: 'Analytics', icon: <BarChart3 /> },
  { to: '/admin/website', label: 'Settings', icon: <Settings /> },
]

const applicantNav = (pendingRequests: number): NavItem[] => [
  { to: '/applicant', label: 'Dashboard', icon: <Home />, end: true },
  { to: '/applicant/profile', label: 'My Profile', icon: <User /> },
  { to: '/applicant/status', label: 'Application Status', icon: <FileText /> },
  { to: '/applicant/jobs', label: 'Matched Jobs', icon: <Briefcase />, badge: pendingRequests },
]

/** Applicant shell: keeps the Matched Jobs nav badge in sync with pending referral requests. */
function ApplicantPortalShell() {
  const { user } = useAuth()
  const location = useLocation()
  usePrefetch(APPLICANT_CHUNKS)
  const { data } = useQuery(
    () => (user?.email ? fetchApplicantMatchedJobs(user.email) : Promise.resolve({ activeRequests: 0 })),
    [user?.email, location.pathname]
  )
  return (
    <>
      <PortalLayout
        nav={applicantNav(data?.activeRequests ?? 0)}
        homePath="/applicant"
      />
      <FirstLoginPasswordGate />
    </>
  )
}

function AdminPortalShell() {
  usePrefetch(ADMIN_CHUNKS)
  return <PortalLayout nav={ADMIN_NAV} homePath="/admin" />
}

import { SplashScreen, SPLASH_FADE_MS, SPLASH_HOLD_MS } from '@/components/ui/SplashScreen'

function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, isLoading } = useAuth()
  
  if (isLoading) {
    return null
  }
  
  if (!user) return <Navigate to="/" replace />
  if (user.role !== role) return <Navigate to={roleHome(user.role)} replace />
  return <>{children}</>
}

function GlobalLoader({ children }: { children: ReactNode }) {
  const { isLoading, splashAt } = useAuth()
  const [showSplash, setShowSplash] = useState(() => {
    try { return sessionStorage.getItem('peso:splash-seen') !== '1' } catch { return true }
  })
  const [revealApp, setRevealApp] = useState(() => !showSplash)
  const handledSplash = useRef(splashAt)

  // Layout effect: cover the next paint before it happens, for both sign-in and sign-out.
  useLayoutEffect(() => {
    if (!splashAt || splashAt === handledSplash.current) return
    handledSplash.current = splashAt
    setShowSplash(true)
    setRevealApp(false)
  }, [splashAt])

  useEffect(() => {
    if (!showSplash || isLoading) return
    // Start the entrance as the splash begins fading so there is no blank frame.
    const revealTimer = setTimeout(() => {
      setRevealApp(true)
      try { sessionStorage.setItem('peso:splash-seen', '1') } catch { /* Storage is optional. */ }
    }, SPLASH_HOLD_MS)
    const removeTimer = setTimeout(() => setShowSplash(false), SPLASH_HOLD_MS + SPLASH_FADE_MS)
    return () => {
      clearTimeout(revealTimer)
      clearTimeout(removeTimer)
    }
  }, [showSplash, isLoading, splashAt])

  // Counters and score rings wait for this before they start animating.
  useLayoutEffect(() => { appReveal.set(!revealApp) }, [revealApp])

  return (
    <>
      {showSplash && <SplashScreen />}
      {/* Mounted under the splash; the entrance replays as the splash fades out. */}
      <div className={revealApp ? 'ui-page-enter' : 'opacity-0'}>
        {!isLoading && children}
      </div>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      {/* Mounted above the router so Light/Dark applies to the public site AND both portals. */}
      <PublicPreferencesProvider>
      <GlobalLoader>
        <BrowserRouter>
          {/* Route chunks are pre-warmed, so this is a thin fallback, not a layout swap. */}
          <Suspense fallback={<div className="fixed inset-x-0 top-0 z-[80] h-[3px] overflow-hidden bg-brand-100" role="status"><div className="h-full w-1/2 animate-pulse rounded-r-full bg-brand-600" /><span className="sr-only">Loading page…</span></div>}>
          <Routes>
            {/* Public website */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy" element={<LegalPage kind="privacy" />} />
              <Route path="/terms" element={<LegalPage kind="terms" />} />
              <Route path="/resume-maker" element={<ResumeMakerPage />} />
            </Route>
            <Route path="/login" element={<Navigate to="/" replace />} />

            {/* Batch 5 visual reference (fixtures only, no auth) */}
            <Route path="/design-preview" element={<DesignPreviewIndex />} />
            <Route path="/design-preview/landing" element={<DesignPreviewLanding />} />
            <Route path="/design-preview/admin-dashboard" element={<DesignPreviewAdminDashboard />} />
            <Route path="/design-preview/admin-applicants" element={<DesignPreviewAdminApplicants />} />
            <Route path="/design-preview/admin-companies" element={<DesignPreviewAdminCompanies />} />
            <Route path="/design-preview/admin-matching" element={<DesignPreviewAdminMatching />} />
            <Route path="/design-preview/applicant-dashboard" element={<DesignPreviewApplicantDashboard />} />
            <Route path="/design-preview/applicant-jobs" element={<DesignPreviewApplicantJobs />} />

            {/* Applicant portal */}
            <Route
              path="/applicant"
              element={
                <RequireRole role="applicant">
                  <ApplicantPortalShell />
                </RequireRole>
              }
            >
              <Route index element={<ApplicantDashboard />} />
              <Route path="profile" element={<ApplicantProfile />} />
              <Route path="status" element={<ApplicationStatus tab="current" />} />
              <Route path="status/previous" element={<ApplicationStatus tab="previous" />} /><Route path="status/referral-slip" element={<ReferralSlipPage />} />
              <Route path="jobs" element={<ApplicantJobs />} />
            </Route>

            {/* Admin portal */}
            <Route
              path="/admin"
              element={
                <RequireRole role="admin">
                  <AdminPortalShell />
                </RequireRole>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="applicants" element={<ApplicantsPage />} />
              <Route path="applicants/register" element={<RegisterWalkIn />} />
              <Route path="applicants/:applicantId/account-receipt" element={<ApplicantAccountReceiptPage />} />
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="companies/new" element={<AddCompanyPage />} />
              <Route path="jobs" element={<JobListingsPage />} />
              <Route path="jobs/new" element={<AddJobPage />} />
              <Route path="matching" element={<MatchingPage />} />
              <Route path="activities" element={<ActivitiesPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="feedback" element={<Navigate to="/admin/analytics?tab=feedback" replace />} />
              <Route path="website" element={<AdminWebsitePage />} />
              <Route path="matching/:applicantId" element={<MatchDetailsPage />} />
              <Route path="matching/:applicantId/referral" element={<ReferralSlipPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </GlobalLoader>
      </PublicPreferencesProvider>
      <Toaster position="top-right" toastOptions={{
        // Toasts sit over the printed documents (account receipt, referral slip), so keep them on screen only.
        className: 'ui-toast print:hidden',
        style: {
          background: '#334155',
          color: '#fff',
        },
        success: {
          iconTheme: { primary: '#10b981', secondary: '#fff' }
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#fff' }
        }
      }} />
    </AuthProvider>
  )
}




