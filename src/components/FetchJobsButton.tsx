import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const FetchJobsButton = ({ onJobsFetched }: { onJobsFetched: () => void }) => {
  const [isFetching, setIsFetching] = useState(false);

  const handleFetchJobs = async () => {
    try {
      setIsFetching(true);
      toast.info("Fetching real job opportunities...");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to fetch jobs");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-jobs`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            num_pages: 2 // Fetch 2 pages of results
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const result = await response.json();
      
      if (result.count > 0) {
        toast.success(`Successfully loaded ${result.count} real jobs!`);
        onJobsFetched();
      } else {
        toast.info("No jobs found matching your profile");
      }
    } catch (error: any) {
      console.error("Error fetching jobs:", error);
      toast.error("Failed to fetch jobs. Please try again.");
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <Button
      onClick={handleFetchJobs}
      disabled={isFetching}
      variant="outline"
      className="gap-2"
    >
      {isFetching ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Fetching Jobs...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Fetch Real Jobs
        </>
      )}
    </Button>
  );
};
