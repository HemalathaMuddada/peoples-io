import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Shield, Briefcase, Users, Building, UserCheck } from "lucide-react";

interface RoleBadgeProps {
  userId: string;
  showIcon?: boolean;
  size?: "sm" | "default" | "lg";
}

const roleConfig = {
  platform_admin: {
    label: "Platform Admin",
    icon: Shield,
    className: "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
  },
  org_admin: {
    label: "Org Admin",
    icon: Building,
    className: "bg-purple-500/10 text-purple-500 border-purple-500/20 hover:bg-purple-500/20"
  },
  agency_admin: {
    label: "Agency Admin",
    icon: Briefcase,
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20"
  },
  recruiter: {
    label: "Recruiter",
    icon: UserCheck,
    className: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500/20"
  },
  hiring_manager: {
    label: "Hiring Manager",
    icon: Users,
    className: "bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20"
  },
  mentor: {
    label: "Mentor",
    icon: Users,
    className: "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20"
  },
  candidate: {
    label: "Candidate",
    icon: Users,
    className: "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
  }
};

export function RoleBadge({ userId, showIcon = true, size = "default" }: RoleBadgeProps) {
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUserRoles();
  }, [userId]);

  const fetchUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) throw error;

      // Prioritize roles: admin roles first, then special roles, then candidate
      const rolePriority = ['platform_admin', 'org_admin', 'agency_admin', 'hiring_manager', 'recruiter', 'mentor', 'candidate'];
      const sortedRoles = (data?.map(r => r.role) || []).sort(
        (a, b) => rolePriority.indexOf(a) - rolePriority.indexOf(b)
      );

      setRoles(sortedRoles);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Badge variant="outline" className="animate-pulse">
        Loading...
      </Badge>
    );
  }

  if (roles.length === 0) {
    return null;
  }

  // Show primary role (first in priority order)
  const primaryRole = roles[0];
  const config = roleConfig[primaryRole as keyof typeof roleConfig];

  if (!config) return null;

  const Icon = config.icon;
  const sizeClasses = {
    sm: "text-xs h-5",
    default: "text-sm h-6",
    lg: "text-base h-7"
  };

  return (
    <div className="flex flex-wrap gap-1">
      <Badge 
        variant="outline" 
        className={`${config.className} ${sizeClasses[size]} font-medium transition-colors`}
      >
        {showIcon && <Icon className="mr-1 h-3 w-3" />}
        {config.label}
      </Badge>
      {roles.length > 1 && (
        <Badge 
          variant="outline" 
          className="bg-muted/50 text-muted-foreground border-border hover:bg-muted text-xs h-5"
        >
          +{roles.length - 1}
        </Badge>
      )}
    </div>
  );
}
