import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  LayoutDashboard,
  FileText,
  Target,
  Briefcase as JobsIcon,
  Settings,
  LogOut,
  User,
  Shield,
  GraduationCap,
  Calendar,
  Users,
  MessageCircle,
  Trophy,
  UserCheck,
  Zap,
  DollarSign,
  BarChart,
  GitCompare,
  ArrowRightLeft,
  Mail,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TeamSwitcher } from "@/components/teams/TeamSwitcher";
import { TeamProvider } from "@/contexts/TeamContext";
import { RoleBadge } from "@/components/auth/RoleBadge";

interface AppLayoutProps {
  children: ReactNode;
  user: any;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Profile", href: "/profile", icon: User },
  { name: "Resumes", href: "/resumes", icon: FileText },
  { name: "Job Matches", href: "/jobs", icon: JobsIcon },
  { name: "Find Jobs", href: "/find-jobs", icon: Search },
  { name: "Applications", href: "/applications", icon: Target },
  { name: "Career Development", href: "/career", icon: GraduationCap },
  { name: "Events", href: "/events", icon: Calendar },
];

const intelligenceNavigation = [
  { name: "Achievements", href: "/gamification", icon: Zap },
  { name: "Salary Negotiator", href: "/salary-negotiator", icon: DollarSign },
  { name: "Interview Questions", href: "/interview-questions", icon: MessageCircle },
  { name: "Resume A/B Testing", href: "/resume-ab-testing", icon: BarChart },
];

const socialNavigation = [
  { name: "Community", href: "/community", icon: Users },
  { name: "Resume Reviews", href: "/resume-reviews", icon: MessageCircle },
  { name: "Success Stories", href: "/success-stories", icon: Trophy },
  { name: "Peer Mentorship", href: "/peer-mentorship", icon: UserCheck },
];

// Navigation for recruiters (individual contributors)
const recruiterNavigation = [
  { name: "Dashboard", href: "/recruiter-dashboard", icon: LayoutDashboard },
  { name: "Pipeline", href: "/recruiter-pipeline", icon: ArrowRightLeft },
  { name: "Communications", href: "/communication-hub", icon: Mail },
  { name: "Post Job", href: "/recruiter/post-job", icon: Briefcase },
  { name: "Applications", href: "/recruiter/applications", icon: Users },
  { name: "Candidate Matches", href: "/recruiter/job-matches", icon: UserCheck },
  { name: "Teams", href: "/teams", icon: Users },
];

// Navigation for agency admins (full agency management)
const agencyAdminNavigation = [
  { name: "Dashboard", href: "/recruiter-dashboard", icon: LayoutDashboard },
  { name: "Pipeline", href: "/recruiter-pipeline", icon: ArrowRightLeft },
  { name: "Communications", href: "/communication-hub", icon: Mail },
  { name: "Client Management", href: "/agency-client-relationships", icon: Users },
  { name: "Post Job", href: "/recruiter/post-job", icon: Briefcase },
  { name: "Candidate Matches", href: "/recruiter/job-matches", icon: UserCheck },
  { name: "Teams", href: "/teams", icon: Users },
  { name: "Agency Analytics", href: "/agency-analytics-dashboard", icon: BarChart },
];

// Interview analytics navigation (for recruiters and agency admins)
const interviewAnalyticsNavigation = [
  { name: "Interview Analytics", href: "/interview-analytics", icon: BarChart },
  { name: "Interviewer Leaderboard", href: "/interviewer-leaderboard", icon: Trophy },
  { name: "Interviewer Comparison", href: "/interviewer-comparison", icon: GitCompare },
  { name: "Team Performance", href: "/team-performance-analytics", icon: Users },
];

export function AppLayout({ children, user }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPlatformAdminOnly, setIsPlatformAdminOnly] = useState(false);
  const [isRecruiter, setIsRecruiter] = useState(false);
  const [isAgencyAdmin, setIsAgencyAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasAdminRole = roles?.some(r => ['platform_admin', 'org_admin'].includes(r.role));
    const isPlatformAdminOnlyRole = roles?.length === 1 && roles[0].role === 'platform_admin';
    const hasRecruiterRole = roles?.some(r => r.role === 'recruiter');
    const hasAgencyAdminRole = roles?.some(r => r.role === 'agency_admin');

    setIsAdmin(hasAdminRole || false);
    setIsPlatformAdminOnly(isPlatformAdminOnlyRole);
    setIsRecruiter(hasRecruiterRole || false);
    setIsAgencyAdmin(hasAgencyAdminRole || false);
  };

  // Filter navigation based on user role
  const filteredNavigation = isPlatformAdminOnly 
    ? [] 
    : isAgencyAdmin 
      ? agencyAdminNavigation
      : isRecruiter 
        ? recruiterNavigation 
        : navigation;
  const filteredSocialNavigation = isPlatformAdminOnly || isRecruiter || isAgencyAdmin ? [] : socialNavigation;

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/auth");
    }
  };

  const initials = user?.user_metadata?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

  return (
    <TeamProvider userId={user.id}>
      <div className="min-h-screen bg-background">
        {/* Top Navigation */}
        <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-primary">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent leading-none">
                  Peoples.io
                </span>
                <span className="text-xs text-muted-foreground">Career Catalyst</span>
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-1">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link key={item.name} to={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
            
            {/* Social Features Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Users className="w-4 h-4" />
                  Community
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {filteredSocialNavigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.name} onClick={() => navigate(item.href)}>
                      <Icon className="mr-2 h-4 w-4" />
                      {item.name}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Intelligence Features Dropdown - Hidden for recruiters */}
            {!isRecruiter && !isAgencyAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Zap className="w-4 h-4" />
                    Intelligence
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {intelligenceNavigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.name} onClick={() => navigate(item.href)}>
                        <Icon className="mr-2 h-4 w-4" />
                        {item.name}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Interview Analytics Dropdown - Only for recruiters and agency admins */}
            {(isRecruiter || isAgencyAdmin) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <BarChart className="w-4 h-4" />
                    Interviews
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {interviewAnalyticsNavigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.name} onClick={() => navigate(item.href)}>
                        <Icon className="mr-2 h-4 w-4" />
                        {item.name}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            </nav>

            <div className="flex items-center gap-3">
              <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-primary text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-2">
                  <div>
                    <p className="text-sm font-medium">
                      {user?.user_metadata?.full_name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <RoleBadge userId={user.id} size="sm" />
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Dashboard
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
            </div>
          </div>
        </header>

      {/* Mobile Navigation */}
      {!isPlatformAdminOnly && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t">
          <div className="flex overflow-x-auto gap-1 p-2">
            {[...filteredNavigation, ...filteredSocialNavigation].map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link key={item.name} to={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className="flex-col h-auto py-2 gap-1 min-w-[70px]"
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs whitespace-nowrap">{item.name}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

        {/* Main Content */}
        <main className="container py-6 pb-20 md:pb-6">{children}</main>
      </div>
    </TeamProvider>
  );
}
