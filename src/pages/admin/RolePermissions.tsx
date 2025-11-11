import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Shield, Briefcase, Users, Building, UserCheck, GraduationCap } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const roles = [
  {
    id: 'platform_admin',
    label: 'Platform Admin',
    icon: Shield,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10'
  },
  {
    id: 'org_admin',
    label: 'Org Admin',
    icon: Building,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10'
  },
  {
    id: 'agency_admin',
    label: 'Agency Admin',
    icon: Briefcase,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  {
    id: 'recruiter',
    label: 'Recruiter',
    icon: UserCheck,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10'
  },
  {
    id: 'hiring_manager',
    label: 'Hiring Manager',
    icon: Users,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10'
  },
  {
    id: 'mentor',
    label: 'Mentor',
    icon: GraduationCap,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10'
  },
  {
    id: 'candidate',
    label: 'Candidate',
    icon: Users,
    color: 'text-primary',
    bgColor: 'bg-primary/10'
  }
];

const permissions = [
  {
    category: 'Admin Features',
    routes: [
      { path: '/admin', name: 'Admin Dashboard', roles: ['platform_admin', 'org_admin'] },
      { path: '/admin/users', name: 'User Management', roles: ['platform_admin', 'org_admin'] },
      { path: '/admin/roles', name: 'Role Management', roles: ['platform_admin'] },
      { path: '/admin/analytics', name: 'Analytics', roles: ['platform_admin', 'org_admin'] },
      { path: '/admin/ai', name: 'AI Management', roles: ['platform_admin'] },
      { path: '/admin/ai-insights', name: 'AI Insights', roles: ['platform_admin'] },
      { path: '/admin/system-health', name: 'System Health', roles: ['platform_admin'] },
      { path: '/admin/reports', name: 'Reports', roles: ['platform_admin', 'org_admin'] },
      { path: '/admin/announcements', name: 'Announcements', roles: ['platform_admin'] },
      { path: '/admin/settings', name: 'Platform Settings', roles: ['platform_admin'] },
      { path: '/admin/moderation', name: 'Content Moderation', roles: ['platform_admin', 'org_admin'] },
      { path: '/admin/organizations', name: 'Organizations', roles: ['platform_admin'] },
      { path: '/admin/companies', name: 'Company Management', roles: ['platform_admin'] },
      { path: '/admin/company-signup-requests', name: 'Signup Requests', roles: ['platform_admin'] },
      { path: '/admin/resumes', name: 'Resume Management', roles: ['platform_admin', 'org_admin'] },
      { path: '/admin/coach-management', name: 'Coach Management', roles: ['platform_admin', 'org_admin'] },
    ]
  },
  {
    category: 'Agency & Recruitment',
    routes: [
      { path: '/agency-clients', name: 'Client Relationships', roles: ['agency_admin', 'recruiter'] },
      { path: '/agency-analytics', name: 'Agency Analytics', roles: ['agency_admin'] },
      { path: '/agency-analytics-dashboard', name: 'Analytics Dashboard', roles: ['agency_admin'] },
      { path: '/recruiter-dashboard', name: 'Recruiter Dashboard', roles: ['recruiter', 'agency_admin'] },
      { path: '/recruiter-leaderboard', name: 'Recruiter Leaderboard', roles: ['recruiter', 'agency_admin'] },
    ]
  },
  {
    category: 'Employer Features',
    routes: [
      { path: '/employer-portal', name: 'Employer Portal', roles: ['org_admin', 'hiring_manager'] },
      { path: '/admin/jobs', name: 'Job Management', roles: ['platform_admin', 'org_admin', 'hiring_manager', 'agency_admin'] },
    ]
  },
  {
    category: 'Coaching & Mentorship',
    routes: [
      { path: '/coach-dashboard', name: 'Coach Dashboard', roles: ['mentor'] },
      { path: '/coach-settings', name: 'Coach Settings', roles: ['mentor'] },
      { path: '/coaches', name: 'Find Coaches', roles: ['candidate', 'mentor', 'recruiter', 'org_admin', 'hiring_manager', 'agency_admin'] },
      { path: '/coaching-requests', name: 'Coaching Requests', roles: ['candidate', 'mentor'] },
    ]
  },
  {
    category: 'Candidate Features',
    routes: [
      { path: '/dashboard', name: 'Dashboard', roles: ['candidate', 'mentor', 'recruiter', 'org_admin', 'hiring_manager', 'agency_admin'] },
      { path: '/profile', name: 'Profile', roles: ['candidate', 'mentor', 'recruiter', 'org_admin', 'hiring_manager', 'agency_admin'] },
      { path: '/resumes', name: 'Resumes', roles: ['candidate', 'mentor'] },
      { path: '/jobs', name: 'Job Matches', roles: ['candidate', 'mentor'] },
      { path: '/applications', name: 'Applications', roles: ['candidate', 'mentor'] },
      { path: '/career', name: 'Career Development', roles: ['candidate', 'mentor'] },
      { path: '/gamification', name: 'Achievements', roles: ['candidate', 'mentor'] },
    ]
  },
  {
    category: 'Collaboration',
    routes: [
      { path: '/teams', name: 'Teams', roles: ['candidate', 'mentor', 'recruiter', 'org_admin', 'hiring_manager', 'agency_admin'] },
      { path: '/community', name: 'Community', roles: ['candidate', 'mentor', 'recruiter', 'org_admin', 'hiring_manager', 'agency_admin'] },
      { path: '/peer-mentorship', name: 'Peer Mentorship', roles: ['candidate', 'mentor'] },
    ]
  },
  {
    category: 'Other Features',
    routes: [
      { path: '/events', name: 'Events', roles: ['candidate', 'mentor', 'recruiter', 'org_admin', 'hiring_manager', 'agency_admin'] },
      { path: '/invitations', name: 'Invitations', roles: ['org_admin', 'agency_admin', 'platform_admin'] },
      { path: '/notification-preferences', name: 'Notifications', roles: ['candidate', 'mentor', 'recruiter', 'org_admin', 'hiring_manager', 'agency_admin'] },
    ]
  }
];

export default function RolePermissions() {
  const hasAccess = (routeRoles: string[], roleId: string) => {
    return routeRoles.includes(roleId);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Role Permissions Matrix</h1>
        <p className="text-muted-foreground">
          Overview of access rights for each role across the platform
        </p>
      </div>

      {/* Role Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Available Roles</CardTitle>
          <CardDescription>All user roles in the system and their purpose</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <div
                  key={role.id}
                  className={`p-4 rounded-lg border ${role.bgColor} transition-all hover:scale-105`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-5 w-5 ${role.color}`} />
                    <span className="font-semibold">{role.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {role.id === 'platform_admin' && 'Full system access and control'}
                    {role.id === 'org_admin' && 'Organization administration'}
                    {role.id === 'agency_admin' && 'Agency management and oversight'}
                    {role.id === 'recruiter' && 'Recruitment and candidate management'}
                    {role.id === 'hiring_manager' && 'Hiring and job posting management'}
                    {role.id === 'mentor' && 'Coaching and mentorship services'}
                    {role.id === 'candidate' && 'Job seeker with full career tools'}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Matrix */}
      {permissions.map((section) => (
        <Card key={section.category}>
          <CardHeader>
            <CardTitle>{section.category}</CardTitle>
            <CardDescription>
              Access permissions for {section.routes.length} features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Feature / Route</TableHead>
                    {roles.map((role) => (
                      <TableHead key={role.id} className="text-center min-w-[100px]">
                        <div className="flex flex-col items-center gap-1">
                          <role.icon className={`h-4 w-4 ${role.color}`} />
                          <span className="text-xs">{role.label}</span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {section.routes.map((route) => (
                    <TableRow key={route.path}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{route.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {route.path}
                          </div>
                        </div>
                      </TableCell>
                      {roles.map((role) => (
                        <TableCell key={role.id} className="text-center">
                          {hasAccess(route.roles, role.id) ? (
                            <div className="flex justify-center">
                              <Badge
                                variant="outline"
                                className="bg-green-500/10 text-green-600 border-green-500/20"
                              >
                                <Check className="h-3 w-3" />
                              </Badge>
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <Badge
                                variant="outline"
                                className="bg-muted/50 text-muted-foreground border-muted"
                              >
                                <X className="h-3 w-3" />
                              </Badge>
                            </div>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Access Summary</CardTitle>
          <CardDescription>Total features accessible by each role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {roles.map((role) => {
              const totalFeatures = permissions.reduce((acc, section) => {
                const accessibleRoutes = section.routes.filter(route =>
                  route.roles.includes(role.id)
                );
                return acc + accessibleRoutes.length;
              }, 0);

              return (
                <div
                  key={role.id}
                  className={`p-4 rounded-lg border ${role.bgColor}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <role.icon className={`h-4 w-4 ${role.color}`} />
                    <span className="font-medium text-sm">{role.label}</span>
                  </div>
                  <div className="text-2xl font-bold">{totalFeatures}</div>
                  <div className="text-xs text-muted-foreground">features accessible</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
