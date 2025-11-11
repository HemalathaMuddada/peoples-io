import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
  requireAuth?: boolean;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  requireAuth = true 
}: ProtectedRouteProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthorization();
  }, []);

  const checkAuthorization = async () => {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        if (requireAuth) {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        } else {
          setIsAuthorized(true);
          setIsLoading(false);
          return;
        }
      }

      // If no specific roles required, just check authentication
      if (allowedRoles.length === 0) {
        setIsAuthorized(true);
        setIsLoading(false);
        return;
      }

      // Check user roles
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error checking user roles:', error);
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      // Check if user has any of the allowed roles
      const hasRole = userRoles?.some(ur => 
        allowedRoles.includes(ur.role)
      );

      if (!hasRole) {
        toast.error("You don't have permission to access this page");
      }

      setIsAuthorized(hasRole || false);
      setIsLoading(false);
    } catch (error) {
      console.error('Authorization error:', error);
      setIsAuthorized(false);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
