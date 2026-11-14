import { lazy, Suspense, useState, useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Briefcase, Building2, FileText, GitCompareArrows, Home, LayoutDashboard, User, Users, Settings, MessageSquareText, History } from 'lucide-react'
import { AuthProvider, useAuth, roleHome, type Role } from '@/lib/auth'
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
// Applicant
const ApplicantDashboard = lazy(() => import('@/pages/applicant/ApplicantDashboard'))
const ResumeMakerPage = lazy(() => import('@/pages/public/ResumeMakerPage'))
const ApplicantProfile = lazy(() => import('@/pages/applicant/ApplicantProfile'))
const ApplicationStatus = lazy(() => import('@/pages/applicant/ApplicationStatus'))
const ApplicantJobs = lazy(() => import('@/pages/applicant/ApplicantJobs'))
// Admin
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const ApplicantsPage = lazy(() => import('@/pages/admin/ApplicantsPage'))
const RegisterWalkIn = lazy(() => import('@/pages/admin/RegisterWalkIn'))
const ApplicantAccountReceiptPage = lazy(() => import('@/pages/admin/ApplicantAccountReceiptPage'))
const CompaniesPage = lazy(() => import('@/pages/admin/CompaniesPage'))
const AddCompanyPage = lazy(() => import('@/pages/admin/AddCompanyPage'))
const JobListingsPage = lazy(() => import('@/pages/admin/JobListingsPage'))
const AddJobPage = lazy(() => import('@/pages/admin/AddJobPage'))
const MatchingPage = lazy(() => import('@/pages/admin/MatchingPage'))
const MatchDetailsPage = lazy(() => import('@/pages/admin/MatchDetailsPage'))
const ReferralSlipPage = lazy(() => import('@/pages/admin/ReferralSlipPage'))
const FeedbackAnalyticsPage = lazy(() => import('@/pages/superadmin/FeedbackAnalyticsPage'))
const ActivitiesPage = lazy(() => import('@/pages/admin/ActivitiesPage'))

/** ONE admin menu used on every admin page (fixes inconsistent sidebars in the wireframes). */
const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard />, end: true },
  { to: '/admin/applicants', label: 'Applicants', icon: <Users /> },
  { to: '/admin/companies', label: 'Companies', icon: <Building2 /> },
  { to: '/admin/jobs', label: 'Job Listings', icon: <Briefcase /> },
  { to: '/admin/matching', label: 'Matching & Referrals', icon: <GitCompareArrows /> },
  { to: '/admin/activities', label: 'Activities', icon: <History /> },
  { to: '/admin/feedback', label: 'Feedback Analytics', icon: <MessageSquareText /> },
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
  return <PortalLayout nav={ADMIN_NAV} homePath="/admin" />
}

import { SplashScreen } from '@/components/ui/SplashScreen'

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
  const { isLoading, logoutAt } = useAuth()
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    // If auth is loaded, wait for splash to finish its min duration
    if (isLoading) return
    if (logoutAt) setShowSplash(true)
    const timer = setTimeout(() => setShowSplash(false), 2000)
    return () => clearTimeout(timer)
  }, [isLoading, logoutAt])

  return (
    <>
      {showSplash && <SplashScreen />}
      <div className={showSplash ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'}>
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
          <Suspense fallback={<div className="p-8 text-slate-500" role="status">Loading page...</div>}>
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
              <Route path="feedback" element={<FeedbackAnalyticsPage />} />
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
        className: 'print:hidden',
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




