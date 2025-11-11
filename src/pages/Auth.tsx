import { AuthForm } from "@/components/auth/AuthForm";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminAndRedirect = async (userId: string) => {
      // Run post-signup repair to ensure all user data exists
      try {
        const { data: repairResult, error: repairError } = await supabase.rpc('repair_user_data');
        
        if (repairError) {
          console.error('Error repairing user data:', repairError);
        } else if (repairResult) {
          const result = repairResult as any;
          if (result?.repairs && Object.keys(result.repairs).length > 0) {
            console.log('User data repaired:', result.repairs);
          }
        }
      } catch (error) {
        console.error('Unexpected error during user data repair:', error);
      }

      // Process referral code if exists
      const refCode = localStorage.getItem('referral_code');
      if (refCode && refCode !== userId) {
        try {
          await supabase.from('referrals').insert({
            referrer_id: refCode,
            referred_id: userId,
            status: 'active'
          });
          localStorage.removeItem('referral_code');
        } catch (error) {
          console.error('Error processing referral:', error);
        }
      }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (roles && roles.length > 0) {
        const userRole = roles[0].role;
        
        // Route based on primary role
        switch (userRole) {
          case 'platform_admin':
            navigate("/admin");
            break;
          case 'agency_admin':
            navigate("/agency-analytics");
            break;
          case 'recruiter':
            navigate("/recruiter-dashboard");
            break;
          case 'org_admin':
          case 'hiring_manager':
            navigate("/employer-portal");
            break;
          case 'mentor':
            navigate("/coach-dashboard");
            break;
          default:
            navigate("/dashboard");
        }
      } else {
        navigate("/dashboard");
      }
    };

    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkAdminAndRedirect(session.user.id);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        checkAdminAndRedirect(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return <AuthForm />;
}
