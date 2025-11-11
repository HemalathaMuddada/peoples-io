import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, RefreshCw, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HealthCheckResult {
  status: "healthy" | "error" | "checking";
  triggers?: Array<{ name: string; enabled: boolean }>;
  errors?: string[];
}

export function SignupDiagnosticBanner() {
  const [healthCheck, setHealthCheck] = useState<HealthCheckResult>({ status: "healthy" });
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  const runHealthCheck = async () => {
    setIsChecking(true);
    setHealthCheck({ status: "checking" });

    try {
      // Check if we can connect to the database
      const { error: connectionError } = await supabase.from("profiles").select("count").limit(1);
      
      if (connectionError) {
        setHealthCheck({
          status: "error",
          errors: [`Database connection failed: ${connectionError.message}`]
        });
        toast({
          title: "Health Check Failed",
          description: "Unable to connect to database",
          variant: "destructive"
        });
        return;
      }

      // Check auth triggers (using a query to pg_trigger)
      const { data: triggerData, error: triggerError } = await supabase.rpc('get_auth_triggers_info' as any);
      
      if (triggerError) {
        // If the function doesn't exist, we can't check triggers but connection is ok
        setHealthCheck({
          status: "healthy",
          errors: ["Cannot check trigger status - function not available"]
        });
      } else {
        const triggers = Array.isArray(triggerData) ? triggerData : [];
        setHealthCheck({
          status: "healthy",
          triggers
        });
      }

      toast({
        title: "Health Check Complete",
        description: "Backend is responding normally",
      });
    } catch (error) {
      setHealthCheck({
        status: "error",
        errors: [`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      });
      toast({
        title: "Health Check Failed",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  if (healthCheck.status === "healthy" && !healthCheck.errors && !healthCheck.triggers) {
    return null;
  }

  return (
    <Alert variant={healthCheck.status === "error" ? "destructive" : "default"} className="mb-4">
      <Activity className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>Signup Diagnostics</span>
        <Button
          size="sm"
          variant="outline"
          onClick={runHealthCheck}
          disabled={isChecking}
          className="ml-4"
        >
          {isChecking ? (
            <>
              <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-3 w-3" />
              Run Health Check
            </>
          )}
        </Button>
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        {healthCheck.status === "checking" && (
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Running diagnostics...</span>
          </div>
        )}

        {healthCheck.errors && healthCheck.errors.length > 0 && (
          <div className="space-y-1">
            <div className="font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Issues Detected:
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {healthCheck.errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {healthCheck.triggers && healthCheck.triggers.length > 0 && (
          <div className="space-y-1">
            <div className="font-semibold">Database Triggers:</div>
            <div className="flex flex-wrap gap-2">
              {healthCheck.triggers.map((trigger, idx) => (
                <Badge
                  key={idx}
                  variant={trigger.enabled ? "default" : "destructive"}
                  className="flex items-center gap-1"
                >
                  {trigger.enabled ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <AlertCircle className="h-3 w-3" />
                  )}
                  {trigger.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {healthCheck.status === "healthy" && !healthCheck.errors && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>All systems operational</span>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
