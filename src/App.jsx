import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import ErrorBoundary from '@/components/shared/ErrorBoundary'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import AppShell from '@/components/layout/AppShell'
import Spinner from '@/components/ui/Spinner'

import { ROLES } from '@/config/roles'
import { PLATFORM_NAV, SCHOOL_NAV, FAMILY_NAV } from '@/config/navigation'

import Login from '@/pages/auth/Login'
import NotFound from '@/pages/NotFound'

import PlatformDashboard from '@/pages/platform/PlatformDashboard'
import SchoolsList from '@/pages/platform/SchoolsList'
import PlatformUsers from '@/pages/platform/PlatformUsers'

import Dashboard from '@/pages/school/Dashboard'
import StudentList from '@/pages/school/students/StudentList'
import Attendance from '@/pages/school/Attendance'
import Classes from '@/pages/school/Classes'
import Subjects from '@/pages/school/Subjects'
import Exams from '@/pages/school/Exams'
import Results from '@/pages/school/Results'
import ReportCard from '@/pages/school/ReportCard'
import Reports from '@/pages/school/Reports'
import Discipline from '@/pages/school/Discipline'
import Timetable from '@/pages/school/Timetable'
import Teachers from '@/pages/school/Teachers'
import SchoolUsers from '@/pages/school/SchoolUsers'
import Fees from '@/pages/school/Fees'
import Announcements from '@/pages/school/Announcements'
import Settings from '@/pages/school/Settings'

import PortalDashboard from '@/pages/portal/PortalDashboard'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000
    }
  }
})

// Mtumiaji anapofungua "/" tunampeleka mahali panapomfaa
function HomeRedirect() {
  const { loading, isAuthenticated, role } = useAuth()

  if (loading) return <Spinner full />
  if (!isAuthenticated) return <Navigate to="/ingia" replace />

  if (role === ROLES.SUPER_ADMIN) return <Navigate to="/platform" replace />
  if (role === ROLES.SCHOOL_OWNER || role === ROLES.SCHOOL_ADMIN || role === ROLES.TEACHER) {
    return <Navigate to="/app" replace />
  }
  return <Navigate to="/portal" replace />
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <Routes>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/ingia" element={<Login />} />

                {/* ---------- Jukwaa (super admin) ---------- */}
                <Route
                  path="/platform"
                  element={
                    <ProtectedRoute roles={[ROLES.SUPER_ADMIN]}>
                      <AppShell nav={PLATFORM_NAV} flat />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<PlatformDashboard />} />
                  <Route path="schools" element={<SchoolsList />} />
                  <Route path="users" element={<PlatformUsers />} />
                </Route>

                {/* ---------- Shule (admin & mwalimu) ---------- */}
                <Route
                  path="/app"
                  element={
                    <ProtectedRoute roles={[ROLES.SCHOOL_OWNER, ROLES.SCHOOL_ADMIN, ROLES.TEACHER]}>
                      <AppShell nav={SCHOOL_NAV} />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="students"      element={<ProtectedRoute permission="students.view"><StudentList /></ProtectedRoute>} />
                  <Route path="attendance"    element={<ProtectedRoute permission="attendance.view"><Attendance /></ProtectedRoute>} />
                  <Route path="classes"       element={<ProtectedRoute permission="classes.view"><Classes /></ProtectedRoute>} />
                  <Route path="subjects"      element={<ProtectedRoute permission="subjects.view"><Subjects /></ProtectedRoute>} />
                  <Route path="exams"         element={<ProtectedRoute permission="exams.view"><Exams /></ProtectedRoute>} />
                  <Route path="results"       element={<ProtectedRoute permission="results.view"><Results /></ProtectedRoute>} />
                  <Route path="report-cards"  element={<ProtectedRoute permission="reports.view"><ReportCard /></ProtectedRoute>} />
                  <Route path="reports"       element={<ProtectedRoute permission="reports.view"><Reports /></ProtectedRoute>} />
                  <Route path="discipline"    element={<ProtectedRoute permission="discipline.view"><Discipline /></ProtectedRoute>} />
                  <Route path="timetable"     element={<ProtectedRoute permission="timetable.view"><Timetable /></ProtectedRoute>} />
                  <Route path="teachers"      element={<ProtectedRoute permission="teachers.view"><Teachers /></ProtectedRoute>} />
                  <Route path="users"         element={<ProtectedRoute permission="users.create"><SchoolUsers /></ProtectedRoute>} />
                  <Route path="fees"          element={<ProtectedRoute permission="fees.view"><Fees /></ProtectedRoute>} />
                  <Route path="announcements" element={<ProtectedRoute permission="announcements.view"><Announcements /></ProtectedRoute>} />
                  <Route path="settings"      element={<ProtectedRoute permission="settings.manage"><Settings /></ProtectedRoute>} />
                </Route>

                {/* ---------- Portal (mzazi & mwanafunzi) ---------- */}
                <Route
                  path="/portal"
                  element={
                    <ProtectedRoute roles={[ROLES.PARENT, ROLES.STUDENT]}>
                      <AppShell nav={FAMILY_NAV} />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<PortalDashboard />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
