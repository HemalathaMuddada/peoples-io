import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Target, Video, TrendingUp, Users, MessageSquare, Calendar, BarChart3, Brain } from "lucide-react";
import { LearningPaths } from "@/components/career/LearningPaths";
import { GoalTracker } from "@/components/career/GoalTracker";
import { MockInterview } from "@/components/career/MockInterview";
import { CareerPlanner } from "@/components/career/CareerPlanner";
import { CareerAnalytics } from "@/components/career/CareerAnalytics";
import { SkillGapDashboard } from "@/components/career/SkillGapDashboard";
import { LearningProgressTracker } from "@/components/career/LearningProgressTracker";
import { LearningRecommendations } from "@/components/career/LearningRecommendations";
import { StreaksAndBadges } from "@/components/career/StreaksAndBadges";
import Coach from "./Coach";
import Coaches from "./Coaches";
import CoachingRequests from "./CoachingRequests";

export default function CareerDevelopment() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Career Development</h1>
        <p className="text-muted-foreground mt-2">
          Develop your skills, track your goals, and advance your career
        </p>
      </div>

      <Tabs defaultValue="coach" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9 gap-1">
          <TabsTrigger value="coach" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">AI Coach</span>
            <span className="sm:hidden">Coach</span>
          </TabsTrigger>
          <TabsTrigger value="coaches" className="gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Coaches</span>
            <span className="sm:hidden">Coaches</span>
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Requests</span>
            <span className="sm:hidden">Requests</span>
          </TabsTrigger>
          <TabsTrigger value="skills" className="gap-2">
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">Skills</span>
            <span className="sm:hidden">Skills</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Analytics</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="learning" className="gap-2">
            <GraduationCap className="w-4 h-4" />
            <span className="hidden sm:inline">Learning</span>
            <span className="sm:hidden">Learn</span>
          </TabsTrigger>
          <TabsTrigger value="goals" className="gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Goals</span>
            <span className="sm:hidden">Goals</span>
          </TabsTrigger>
          <TabsTrigger value="interview" className="gap-2">
            <Video className="w-4 h-4" />
            <span className="hidden sm:inline">Interview</span>
            <span className="sm:hidden">Interview</span>
          </TabsTrigger>
          <TabsTrigger value="planner" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Planner</span>
            <span className="sm:hidden">Plan</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coach">
          <Coach />
        </TabsContent>

        <TabsContent value="coaches">
          <Coaches />
        </TabsContent>

        <TabsContent value="requests">
          <CoachingRequests />
        </TabsContent>

        <TabsContent value="skills">
          <SkillGapDashboard />
        </TabsContent>

        <TabsContent value="analytics">
          <CareerAnalytics />
        </TabsContent>

        <TabsContent value="learning">
          <div className="space-y-6">
            <StreaksAndBadges />
            <LearningRecommendations />
            <LearningProgressTracker />
            <LearningPaths />
          </div>
        </TabsContent>

        <TabsContent value="goals">
          <GoalTracker />
        </TabsContent>

        <TabsContent value="interview">
          <MockInterview />
        </TabsContent>

        <TabsContent value="planner">
          <CareerPlanner />
        </TabsContent>
      </Tabs>
    </div>
  );
}
