import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, AlertTriangle, Star, Users, TrendingDown } from "lucide-react";
import { CompanyInsights } from "@/components/company/CompanyInsights";
import { CompanyReviews } from "@/components/company/CompanyReviews";
import { EmployeeNetwork } from "@/components/company/EmployeeNetwork";
import { CompanyStatusTracker } from "@/components/company/CompanyStatusTracker";

export default function CompanyIntelligence() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Company Intelligence</h1>
        <p className="text-muted-foreground mt-2">
          Inside scoops, reviews, employee connections, and hiring status
        </p>
      </div>

      <Tabs defaultValue="insights" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights" className="gap-2">
            <Building2 className="w-4 h-4" />
            Inside Scoops
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-2">
            <Star className="w-4 h-4" />
            Reviews
          </TabsTrigger>
          <TabsTrigger value="network" className="gap-2">
            <Users className="w-4 h-4" />
            Employee Network
          </TabsTrigger>
          <TabsTrigger value="status" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Company Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights">
          <CompanyInsights />
        </TabsContent>

        <TabsContent value="reviews">
          <CompanyReviews />
        </TabsContent>

        <TabsContent value="network">
          <EmployeeNetwork />
        </TabsContent>

        <TabsContent value="status">
          <CompanyStatusTracker />
        </TabsContent>
      </Tabs>
    </div>
  );
}
