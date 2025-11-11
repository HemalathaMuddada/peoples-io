import { useEffect, useState, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RealtimeNotificationToast } from "@/components/notifications/RealtimeNotificationToast";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import Applications from "./pages/Applications";
import Profile from "./pages/Profile";
import Resumes from "./pages/Resumes";
import Coach from "./pages/Coach";
import ProfileStrength from "./pages/ProfileStrength";
import CareerDevelopment from "./pages/CareerDevelopment";
import Events from "./pages/Events";
import EventAnalytics from "./pages/EventAnalytics";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Coaches from "./pages/Coaches";
import CoachingRequests from "./pages/CoachingRequests";
import CoachSettings from "./pages/CoachSettings";
import CoachManagement from "./pages/admin/CoachManagement";
import CoachDashboard from "./pages/CoachDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import CoachDiscovery from "./pages/CoachDiscovery";
import Community from "./pages/Community";
import ResumeReviews from "./pages/ResumeReviews";
import SuccessStories from "./pages/SuccessStories";
import PeerMentorship from "./pages/PeerMentorship";
import Gamification from "./pages/Gamification";
import SalaryNegotiator from "./pages/SalaryNegotiator";
import InterviewQuestions from "./pages/InterviewQuestions";
import ResumeABTesting from "./pages/ResumeABTesting";
import CultureFit from "./pages/CultureFit";
import CareerIntelligence from "./pages/CareerIntelligence";
import NotificationPreferences from "./pages/NotificationPreferences";
import NotificationAnalytics from "./pages/NotificationAnalytics";
import NotificationScheduling from "./pages/NotificationScheduling";
import NotificationReports from "./pages/NotificationReports";
import PushNotificationSetup from "./pages/PushNotificationSetup";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import AdminDashboard from "./pages/admin/Dashboard";
import JobManagement from "./pages/admin/JobManagement";
import UserManagement from "./pages/admin/UserManagement";
import Analytics from "./pages/admin/Analytics";
import AIManagement from "./pages/admin/AIManagement";
import ContentModeration from "./pages/admin/ContentModeration";
import Organizations from "./pages/admin/Organizations";
import CompanyManagement from "./pages/admin/CompanyManagement";
import AcceptInvitation from "./pages/AcceptInvitation";
import CompanySignup from "./pages/CompanySignup";
import AgencyClientRelationships from "./pages/AgencyClientRelationships";
import InvitationManagement from "./pages/InvitationManagement";

// Lazy load new admin pages
const RoleManagement = lazy(() => import("./pages/admin/RoleManagement"));
const RolePermissions = lazy(() => import("./pages/admin/RolePermissions"));
const RoleAuditLog = lazy(() => import("./pages/admin/RoleAuditLog"));
const RoleApprovals = lazy(() => import("./pages/admin/RoleApprovals"));
const UserRoleHistory = lazy(() => import("./pages/admin/UserRoleHistory"));
const AIInsights = lazy(() => import("./pages/admin/AIInsights"));
const SystemHealth = lazy(() => import("./pages/admin/SystemHealth"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const Announcements = lazy(() => import("./pages/admin/Announcements"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const ResumeManagement = lazy(() => import("./pages/admin/ResumeManagement"));
const CompanySignupRequests = lazy(() => import("./pages/admin/CompanySignupRequests"));
const AgencyAnalytics = lazy(() => import("./pages/AgencyAnalytics"));
const RecruiterJobPosting = lazy(() => import("./pages/RecruiterJobPosting"));
const RecruiterJobMatches = lazy(() => import("./pages/RecruiterJobMatches"));
const RecruiterApplications = lazy(() => import("./pages/RecruiterApplications"));
const RecruiterDashboard = lazy(() => import("./pages/RecruiterDashboard"));
const RecruiterLeaderboard = lazy(() => import("./pages/RecruiterLeaderboard"));
const InvitationHistory = lazy(() => import("./pages/InvitationHistory"));
const EmailTemplates = lazy(() => import("./pages/EmailTemplates"));
const Teams = lazy(() => import("./pages/Teams"));
const TeamDetails = lazy(() => import("./pages/TeamDetails"));
const TeamComparison = lazy(() => import("./pages/TeamComparison"));
const EmployerPortal = lazy(() => import("./pages/EmployerPortal"));
const AgencyAnalyticsDashboard = lazy(() => import("./pages/AgencyAnalyticsDashboard"));
const CalendarCallback = lazy(() => import("./pages/CalendarCallback"));
const InterviewAnalytics = lazy(() => import("./pages/InterviewAnalytics"));
const InterviewerDetails = lazy(() => import("./pages/InterviewerDetails"));
const InterviewerLeaderboard = lazy(() => import("./pages/InterviewerLeaderboard"));
const InterviewerComparison = lazy(() => import("./pages/InterviewerComparison"));
const TeamPerformanceAnalytics = lazy(() => import("./pages/TeamPerformanceAnalytics"));
const RecruiterPipelineDashboard = lazy(() => import("./pages/RecruiterPipelineDashboard"));
const CommunicationHub = lazy(() => import("./pages/CommunicationHub"));

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {user && <RealtimeNotificationToast userId={user.id} />}
        <BrowserRouter>
          <Routes>
            <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Index />} />
            <Route path="/auth" element={user ? <Navigate to="/dashboard" /> : <Auth />} />
            <Route path="/dashboard" element={user ? <AppLayout user={user}><Dashboard /></AppLayout> : <Navigate to="/" />} />
            <Route path="/profile" element={user ? <AppLayout user={user}><Profile /></AppLayout> : <Navigate to="/" />} />
            <Route path="/profile-strength" element={user ? <AppLayout user={user}><ProfileStrength /></AppLayout> : <Navigate to="/" />} />
            <Route path="/resumes" element={user ? <AppLayout user={user}><Resumes /></AppLayout> : <Navigate to="/" />} />
            <Route path="/jobs" element={user ? <AppLayout user={user}><Jobs /></AppLayout> : <Navigate to="/" />} />
            <Route path="/applications" element={user ? <AppLayout user={user}><Applications /></AppLayout> : <Navigate to="/" />} />
            <Route path="/career" element={user ? <AppLayout user={user}><CareerDevelopment /></AppLayout> : <Navigate to="/" />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/analytics" element={user ? <EventAnalytics /> : <Navigate to="/auth" />} />
            <Route path="/coaches" element={user ? <CoachDiscovery /> : <Navigate to="/" />} />
            <Route path="/coaching-requests" element={user ? <AppLayout user={user}><CoachingRequests /></AppLayout> : <Navigate to="/" />} />
            <Route path="/coach-settings" element={user ? <AppLayout user={user}><CoachSettings /></AppLayout> : <Navigate to="/" />} />
            <Route path="/coach-dashboard" element={
              user ? (
                <ProtectedRoute allowedRoles={['mentor']}>
                  <CoachDashboard />
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/client-dashboard" element={user ? <ClientDashboard /> : <Navigate to="/" />} />
            <Route path="/employer-portal" element={
              user ? (
                <ProtectedRoute allowedRoles={['org_admin', 'hiring_manager']}>
                  <AppLayout user={user}>
                    <Suspense fallback={<div className="p-8">Loading...</div>}>
                      <EmployerPortal />
                    </Suspense>
                  </AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            
            {/* Social & Networking Routes */}
            <Route path="/community" element={user ? <AppLayout user={user}><Community /></AppLayout> : <Navigate to="/" />} />
            <Route path="/resume-reviews" element={user ? <AppLayout user={user}><ResumeReviews /></AppLayout> : <Navigate to="/" />} />
            <Route path="/success-stories" element={user ? <AppLayout user={user}><SuccessStories /></AppLayout> : <Navigate to="/" />} />
            <Route path="/peer-mentorship" element={user ? <AppLayout user={user}><PeerMentorship /></AppLayout> : <Navigate to="/" />} />
            <Route path="/gamification" element={user ? <AppLayout user={user}><Gamification /></AppLayout> : <Navigate to="/" />} />
            <Route path="/salary-negotiator" element={user ? <AppLayout user={user}><SalaryNegotiator /></AppLayout> : <Navigate to="/" />} />
            <Route path="/interview-questions" element={user ? <AppLayout user={user}><InterviewQuestions /></AppLayout> : <Navigate to="/" />} />
            <Route path="/resume-ab-testing" element={user ? <AppLayout user={user}><ResumeABTesting /></AppLayout> : <Navigate to="/" />} />
            <Route path="/culture-fit" element={user ? <AppLayout user={user}><CultureFit /></AppLayout> : <Navigate to="/" />} />
            <Route path="/intelligence" element={user ? <AppLayout user={user}><CareerIntelligence /></AppLayout> : <Navigate to="/" />} />
            <Route path="/notification-preferences" element={user ? <NotificationPreferences /> : <Navigate to="/" />} />
            <Route path="/notification-analytics" element={user ? <NotificationAnalytics /> : <Navigate to="/" />} />
            <Route path="/notification-scheduling" element={user ? <NotificationScheduling /> : <Navigate to="/" />} />
            <Route path="/notification-reports" element={user ? <NotificationReports /> : <Navigate to="/" />} />
            <Route path="/push-notifications" element={user ? <PushNotificationSetup /> : <Navigate to="/" />} />
            
            {/* Admin Routes - Protected */}
            <Route path="/admin" element={
              user ? (
                <ProtectedRoute allowedRoles={['platform_admin', 'org_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><AdminDashboard /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/admin/jobs" element={
              user ? (
                <ProtectedRoute allowedRoles={['platform_admin', 'org_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><JobManagement /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/admin/users" element={
              user ? (
                <ProtectedRoute allowedRoles={['platform_admin', 'org_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><UserManagement /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/admin/roles" element={
              user ? (
                <ProtectedRoute allowedRoles={['platform_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><RoleManagement /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/admin/role-permissions" element={
              user ? (
                <ProtectedRoute allowedRoles={['platform_admin', 'org_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><RolePermissions /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/admin/role-approvals" element={
              user ? (
                <ProtectedRoute allowedRoles={['platform_admin', 'org_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><RoleApprovals /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/admin/role-audit" element={
              user ? (
                <ProtectedRoute allowedRoles={['platform_admin', 'org_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><RoleAuditLog /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/admin/user-role-history" element={
              user ? (
                <ProtectedRoute allowedRoles={['platform_admin', 'org_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><UserRoleHistory /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/admin/analytics" element={
              user ? (
                <ProtectedRoute allowedRoles={['platform_admin', 'org_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><Analytics /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/admin/ai" element={
              user ? (
                <ProtectedRoute allowedRoles={['platform_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><AIManagement /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/admin/ai-insights" element={
              user ? (
                <ProtectedRoute allowedRoles={['platform_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><AIInsights /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/admin/system-health" element={
              user ? (
                <ProtectedRoute allowedRoles={['platform_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><SystemHealth /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/admin/reports" element={
              user ? (
                <ProtectedRoute allowedRoles={['platform_admin', 'org_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><Reports /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/admin/announcements" element={
              user ? (
                <ProtectedRoute allowedRoles={['platform_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><Announcements /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/admin/settings" element={
              user ? (
                <ProtectedRoute allowedRoles={['platform_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><Settings /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/admin/moderation" element={
              user ? (
                <ProtectedRoute allowedRoles={['platform_admin', 'org_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><ContentModeration /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/admin/organizations" element={
              user ? (
                <ProtectedRoute allowedRoles={['platform_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><Organizations /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/admin/companies" element={
              user ? (
                <ProtectedRoute allowedRoles={['platform_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><CompanyManagement /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/admin/company-signup-requests" element={
              user ? (
                <ProtectedRoute allowedRoles={['platform_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><CompanySignupRequests /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/admin/resumes" element={
              user ? (
                <ProtectedRoute allowedRoles={['platform_admin', 'org_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><ResumeManagement /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/admin/coach-management" element={
              user ? (
                <ProtectedRoute allowedRoles={['platform_admin', 'org_admin']}>
                  <AppLayout user={user}><CoachManagement /></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            {/* Agency & Recruiter Routes - Protected */}
            <Route path="/agency-clients" element={
              user ? (
                <ProtectedRoute allowedRoles={['agency_admin', 'recruiter']}>
                  <AppLayout user={user}><AgencyClientRelationships /></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/agency-analytics" element={
              user ? (
                <ProtectedRoute allowedRoles={['agency_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><AgencyAnalytics /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/agency-analytics-dashboard" element={
              user ? (
                <ProtectedRoute allowedRoles={['agency_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><AgencyAnalyticsDashboard /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/recruiter-dashboard" element={
              user ? (
                <ProtectedRoute allowedRoles={['recruiter', 'agency_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><RecruiterDashboard /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/recruiter/post-job" element={
              user ? (
                <ProtectedRoute allowedRoles={['recruiter', 'agency_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><RecruiterJobPosting /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/recruiter/applications" element={
              user ? (
                <ProtectedRoute allowedRoles={['recruiter', 'agency_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><RecruiterApplications /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/calendar-callback" element={
              user ? (
                <ProtectedRoute>
                  <Suspense fallback={<div className="p-8">Loading...</div>}><CalendarCallback /></Suspense>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/recruiter/job-matches" element={
              user ? (
                <ProtectedRoute allowedRoles={['recruiter', 'agency_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><RecruiterJobMatches /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/interview-analytics" element={
              user ? (
                <ProtectedRoute allowedRoles={['recruiter', 'agency_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><InterviewAnalytics /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/interviewer/:interviewerName" element={
              user ? (
                <ProtectedRoute allowedRoles={['recruiter', 'agency_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><InterviewerDetails /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/interviewer-leaderboard" element={
              user ? (
                <ProtectedRoute allowedRoles={['recruiter', 'agency_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><InterviewerLeaderboard /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/interviewer-comparison" element={
              user ? (
                <ProtectedRoute allowedRoles={['recruiter', 'agency_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><InterviewerComparison /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/team-performance-analytics" element={
              user ? (
                <ProtectedRoute allowedRoles={['recruiter', 'agency_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><TeamPerformanceAnalytics /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/recruiter-pipeline" element={
              user ? (
                <ProtectedRoute allowedRoles={['recruiter', 'agency_admin', 'hiring_manager']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><RecruiterPipelineDashboard /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/communication-hub" element={
              user ? (
                <ProtectedRoute allowedRoles={['recruiter', 'agency_admin', 'hiring_manager']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><CommunicationHub /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/recruiter-leaderboard" element={
              user ? (
                <ProtectedRoute allowedRoles={['recruiter', 'agency_admin']}>
                  <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><RecruiterLeaderboard /></Suspense></AppLayout>
                </ProtectedRoute>
              ) : <Navigate to="/" />
            } />
            <Route path="/teams" element={user ? <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><Teams /></Suspense></AppLayout> : <Navigate to="/" />} />
            <Route path="/teams/comparison" element={user ? <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><TeamComparison /></Suspense></AppLayout> : <Navigate to="/" />} />
            <Route path="/teams/:teamId" element={user ? <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><TeamDetails /></Suspense></AppLayout> : <Navigate to="/" />} />
            <Route path="/invitations" element={user ? <AppLayout user={user}><InvitationManagement /></AppLayout> : <Navigate to="/" />} />
            <Route path="/invitation-history" element={user ? <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><InvitationHistory /></Suspense></AppLayout> : <Navigate to="/" />} />
            <Route path="/email-templates" element={user ? <AppLayout user={user}><Suspense fallback={<div className="p-8">Loading...</div>}><EmailTemplates /></Suspense></AppLayout> : <Navigate to="/" />} />
            <Route path="/accept-invitation" element={<AcceptInvitation />} />
            <Route path="/company-signup" element={<CompanySignup />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
