import { useNavigate } from "react-router-dom";
import { CompanyJobPostingForm } from "@/components/jobs/CompanyJobPostingForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function RecruiterJobPosting() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/recruiter-dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold">Post New Job</h1>
        <p className="text-muted-foreground mt-2">
          Create a job posting for your company
        </p>
      </div>

      <CompanyJobPostingForm
        onSuccess={() => {
          navigate("/recruiter-dashboard");
        }}
        onCancel={() => {
          navigate("/recruiter-dashboard");
        }}
      />
    </div>
  );
}
