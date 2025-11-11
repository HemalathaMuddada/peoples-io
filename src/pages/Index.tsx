import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Counter } from "@/components/ui/counter";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Briefcase, Target, TrendingUp, FileText, MessageSquare, CheckCircle, Zap, Shield, Users, Star, Clock, BarChart3, Sparkles, Award, Rocket, Brain, Network, Building2, DollarSign, GraduationCap, LineChart, Lightbulb, Mail, Calendar, Repeat, UserCheck, TrendingDown, Gauge, BookOpen, Trophy, Flame, Share2, Search, Bell } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet";
import heroBackground from "@/assets/hero-background.jpg";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<string>("ai-tools");
  const heroBackgroundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Capture referral code from URL
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      localStorage.setItem('referral_code', refCode);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  useEffect(() => {
    const handleScroll = () => {
      if (heroBackgroundRef.current) {
        const scrolled = window.scrollY;
        const parallaxSpeed = 0.5;
        heroBackgroundRef.current.style.transform = `translateY(${scrolled * parallaxSpeed}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const featureCategories = {
    "ai-tools": {
      title: "AI-Powered Tools",
      icon: Brain,
      description: "Advanced AI capabilities to supercharge your job search",
      features: [
        { icon: FileText, title: "Resume Optimization", description: "ATS scoring and AI-powered improvements with version control" },
        { icon: Rocket, title: "AI Cover Letters", description: "Generate tailored cover letters in seconds" },
        { icon: MessageSquare, title: "Mock Interviews", description: "Practice with AI and get real-time feedback" },
        { icon: Brain, title: "24/7 AI Career Coach", description: "Instant personalized career guidance anytime" },
        { icon: Gauge, title: "Application Strength Analyzer", description: "Predict your chances before applying" },
        { icon: Lightbulb, title: "Resume Performance Prediction", description: "See how your resume will perform" },
        { icon: Mail, title: "Follow-Up Email Generator", description: "Automated personalized follow-up messages" },
        { icon: Target, title: "Culture Fit Analysis", description: "AI-powered company culture matching" },
      ]
    },
    "network": {
      title: "Professional Network",
      icon: Network,
      description: "Leverage connections and expert guidance",
      features: [
        { icon: UserCheck, title: "Peer Mentorship", description: "Connect with professionals in your target industry" },
        { icon: Users, title: "Coaching Marketplace", description: "Book sessions with verified career coaches" },
        { icon: Share2, title: "Connection Referrals", description: "Match LinkedIn connections to job opportunities" },
        { icon: MessageSquare, title: "Direct Messaging", description: "Chat with coaches and mentors directly" },
        { icon: Calendar, title: "Session Scheduling", description: "Book coaching sessions with ease" },
        { icon: Award, title: "Coach Reviews & Ratings", description: "Find the best coaches based on verified reviews" },
      ]
    },
    "intelligence": {
      title: "Market Intelligence",
      icon: Building2,
      description: "Deep insights into companies and opportunities",
      features: [
        { icon: Building2, title: "Company Research", description: "Real-time news and insights about target companies" },
        { icon: DollarSign, title: "Salary Insights", description: "Market data and negotiation assistance" },
        { icon: Users, title: "Employee Network", description: "Connect with insiders at target companies" },
        { icon: Star, title: "Company Reviews", description: "Culture insights from current and former employees" },
        { icon: TrendingUp, title: "Company Status Tracker", description: "Monitor hiring trends and company health" },
        { icon: Search, title: "Job Market Analytics", description: "Track trends in your industry and role" },
      ]
    },
    "career-growth": {
      title: "Career Development",
      icon: GraduationCap,
      description: "Long-term career planning and skill development",
      features: [
        { icon: GraduationCap, title: "Learning Paths", description: "Personalized skill development roadmaps" },
        { icon: Target, title: "Skill Gap Analysis", description: "Identify and close skill gaps for target roles" },
        { icon: BookOpen, title: "Career Planning", description: "Long-term career progression strategies" },
        { icon: Trophy, title: "Goals & Achievements", description: "Track progress with gamification" },
        { icon: Flame, title: "Streaks & Badges", description: "Stay motivated with achievements" },
        { icon: LineChart, title: "Career Analytics", description: "Track your career growth metrics" },
        { icon: Lightbulb, title: "Learning Recommendations", description: "AI-curated learning resources" },
      ]
    },
    "automation": {
      title: "Smart Automation",
      icon: Zap,
      description: "Save time with intelligent automation",
      features: [
        { icon: Target, title: "Smart Job Matching", description: "AI finds and ranks perfect opportunities" },
        { icon: Zap, title: "Bulk Applications", description: "Apply to multiple matched jobs at once" },
        { icon: Bell, title: "Application Reminders", description: "Never miss a follow-up or deadline" },
        { icon: BarChart3, title: "Application Tracking", description: "Comprehensive application pipeline management" },
        { icon: Calendar, title: "Interview Scheduler", description: "Automated interview coordination" },
        { icon: Repeat, title: "LinkedIn Sync", description: "Auto-sync connections and profile data" },
        { icon: FileText, title: "Resume A/B Testing", description: "Test and optimize resume performance" },
      ]
    }
  };

  if (user) return null;

  return (
    <>
      <Helmet>
        <title>Peoples.io - AI-Powered Career Acceleration Platform | Land Your Dream Job Faster</title>
        <meta name="description" content="Transform your career transition with Peoples.io. AI-powered resume optimization, smart job matching, 24/7 career coaching, and interview prep. Start your 14-day free trial today." />
        <meta name="keywords" content="career acceleration, outplacement services, AI resume optimization, ATS resume checker, job search platform, career coaching, interview preparation, cover letter generator, job application tracking" />
        <link rel="canonical" href="https://peoples.io" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Peoples.io",
            "applicationCategory": "BusinessApplication",
            "offers": {
              "@type": "AggregateOffer",
              "lowPrice": "29",
              "highPrice": "79",
              "priceCurrency": "USD"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.9",
              "ratingCount": "2847"
            }
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <nav className="border-b border-border/40 bg-background/95 backdrop-blur-lg sticky top-0 z-50">
          <div className="container mx-auto px-6 py-5 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">Peoples.io</span>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => navigate("/auth")} className="text-base">
                Sign In
              </Button>
              <Button onClick={() => navigate("/auth")} className="bg-gradient-primary text-base">
                Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border/40">
          <div 
            ref={heroBackgroundRef}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 will-change-transform"
            style={{ backgroundImage: `url(${heroBackground})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background/90"></div>
          </div>
          <div className="relative container mx-auto px-6 py-24 lg:py-36">
            <div className="max-w-5xl mx-auto text-center">
              <Badge className="mb-8 bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10 px-4 py-2 text-sm">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                AI-Powered Career Acceleration Platform
              </Badge>
              <h1 className="text-6xl md:text-8xl font-bold mb-8 text-foreground leading-[1.1] tracking-tight">
                Land Your Dream Role
                <span className="block bg-gradient-primary bg-clip-text text-transparent mt-4">
                  3x Faster
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
                Transform your career transition with AI-powered resume optimization, intelligent job matching, 
                and 24/7 career coaching designed for modern professionals.
              </p>
              <div className="flex gap-4 justify-center flex-wrap mb-10">
                <Button size="lg" onClick={() => navigate("/auth")} className="bg-gradient-primary text-lg px-10 h-16 shadow-xl hover:shadow-2xl transition-all text-base font-semibold">
                  Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-10 h-16 border-2 text-base font-semibold hover:bg-accent">
                  Watch Demo
                </Button>
              </div>
              <p className="text-base text-muted-foreground flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                No credit card required • 14-day free trial • Cancel anytime
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="container mx-auto px-6 py-20">
          <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <Card className="border-2 border-border/50 hover:border-primary/50 transition-all duration-300 bg-card/50 backdrop-blur hover:scale-105 transform">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-3">
                  <Counter end={95} suffix="%" duration={2000} />
                </div>
                <p className="text-muted-foreground font-medium">Success Rate</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-border/50 hover:border-primary/50 transition-all duration-300 bg-card/50 backdrop-blur hover:scale-105 transform">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-3">
                  <Counter end={50} suffix="K+" duration={2500} />
                </div>
                <p className="text-muted-foreground font-medium">Active Users</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-border/50 hover:border-primary/50 transition-all duration-300 bg-card/50 backdrop-blur hover:scale-105 transform">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-3">
                  <Counter end={45} suffix=" Days" duration={2200} />
                </div>
                <p className="text-muted-foreground font-medium">Avg. Time to Hire</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-border/50 hover:border-primary/50 transition-all duration-300 bg-card/50 backdrop-blur hover:scale-105 transform">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-3">
                  <Counter end={4.9} suffix="★" decimals={1} duration={2000} />
                </div>
                <p className="text-muted-foreground font-medium">User Rating</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Key Features Overview */}
        <section className="container mx-auto px-6 py-24 border-t border-border/40">
          <div className="text-center mb-20">
            <Badge className="mb-6 bg-primary/5 text-primary border border-primary/20 px-4 py-2">
              Platform Features
            </Badge>
            <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground tracking-tight">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Comprehensive AI-powered tools designed to accelerate your career transition
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            <Card className="group border-2 border-border/50 hover:border-primary/50 hover:shadow-2xl transition-all duration-300 bg-card/50 backdrop-blur">
              <CardHeader className="space-y-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="h-7 w-7 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl">AI Resume Optimization</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Get instant ATS scoring and AI-powered improvements to make your resume stand out to recruiters
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-2 border-border/50 hover:border-primary/50 hover:shadow-2xl transition-all duration-300 bg-card/50 backdrop-blur">
              <CardHeader className="space-y-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Target className="h-7 w-7 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl">Smart Job Matching</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Find perfect opportunities matched to your skills and preferences automatically with AI
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-2 border-border/50 hover:border-primary/50 hover:shadow-2xl transition-all duration-300 bg-card/50 backdrop-blur">
              <CardHeader className="space-y-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Brain className="h-7 w-7 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl">24/7 AI Career Coach</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Get instant personalized guidance and strategic advice from your AI career advisor
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-2 border-border/50 hover:border-primary/50 hover:shadow-2xl transition-all duration-300 bg-card/50 backdrop-blur">
              <CardHeader className="space-y-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-7 w-7 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl">Application Tracking</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Manage applications with automated follow-ups and progress tracking in one dashboard
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-2 border-border/50 hover:border-primary/50 hover:shadow-2xl transition-all duration-300 bg-card/50 backdrop-blur">
              <CardHeader className="space-y-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Rocket className="h-7 w-7 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl">Auto Cover Letters</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Generate perfectly tailored cover letters in seconds with AI trained on success
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group border-2 border-border/50 hover:border-primary/50 hover:shadow-2xl transition-all duration-300 bg-card/50 backdrop-blur">
              <CardHeader className="space-y-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Award className="h-7 w-7 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl">Interview Preparation</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Practice with AI-generated questions for your target roles and get real-time feedback
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Interactive Feature Explorer */}
        <section className="container mx-auto px-6 py-24 border-t border-border/40 bg-muted/20">
          <div className="text-center mb-16">
            <Badge className="mb-6 bg-primary/5 text-primary border border-primary/20 px-4 py-2">
              Complete Feature Set
            </Badge>
            <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground tracking-tight">
              Explore All Capabilities
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Discover the full power of our platform organized by category
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-3 justify-center mb-12">
            {Object.entries(featureCategories).map(([key, category]) => {
              const IconComponent = category.icon;
              return (
                <Button
                  key={key}
                  variant={activeCategory === key ? "default" : "outline"}
                  size="lg"
                  onClick={() => setActiveCategory(key)}
                  className={`text-base h-14 px-6 transition-all ${
                    activeCategory === key 
                      ? "bg-gradient-primary shadow-lg scale-105" 
                      : "hover:scale-105"
                  }`}
                >
                  <IconComponent className="h-5 w-5 mr-2" />
                  {category.title}
                </Button>
              );
            })}
          </div>

          {/* Active Category Content */}
          <div className="max-w-7xl mx-auto">
            <Card className="border-2 border-primary/20 bg-card/80 backdrop-blur-lg mb-8">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0">
                    {(() => {
                      const IconComponent = featureCategories[activeCategory as keyof typeof featureCategories].icon;
                      return <IconComponent className="h-8 w-8 text-primary-foreground" />;
                    })()}
                  </div>
                  <div>
                    <CardTitle className="text-3xl mb-2">
                      {featureCategories[activeCategory as keyof typeof featureCategories].title}
                    </CardTitle>
                    <CardDescription className="text-lg">
                      {featureCategories[activeCategory as keyof typeof featureCategories].description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featureCategories[activeCategory as keyof typeof featureCategories].features.map((feature, index) => {
                const FeatureIcon = feature.icon;
                return (
                  <Card key={index} className="group border-2 border-border/50 hover:border-primary/50 hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur">
                    <CardHeader className="space-y-3">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FeatureIcon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                      <CardDescription className="leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="container mx-auto px-6 py-24 border-t border-border/40 bg-muted/20">
          <div className="text-center mb-20">
            <Badge className="mb-6 bg-primary/5 text-primary border border-primary/20 px-4 py-2">
              Simple Process
            </Badge>
            <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground tracking-tight">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Get started in minutes and land interviews faster than ever
            </p>
          </div>

          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-12">
            <div className="text-center space-y-4">
              <div className="h-20 w-20 rounded-2xl bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-3xl mx-auto shadow-lg">
                1
              </div>
              <h3 className="text-2xl font-bold">Upload Your Resume</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Upload your resume and get instant AI analysis with ATS scoring and improvement suggestions
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="h-20 w-20 rounded-2xl bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-3xl mx-auto shadow-lg">
                2
              </div>
              <h3 className="text-2xl font-bold">Get Matched</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Our AI finds and ranks the best opportunities based on your profile, skills, and preferences
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="h-20 w-20 rounded-2xl bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-3xl mx-auto shadow-lg">
                3
              </div>
              <h3 className="text-2xl font-bold">Land Interviews</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Apply with optimized materials and prepare with AI coaching to ace your interviews
              </p>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="container mx-auto px-6 py-24 border-t border-border/40">
          <div className="text-center mb-20">
            <Badge className="mb-6 bg-success/10 text-success border border-success/20 px-4 py-2">
              Success Stories
            </Badge>
            <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground tracking-tight">
              Loved by Career Professionals
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Join thousands who've accelerated their career transition
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            <Card className="border-2 border-border/50 hover:border-primary/50 transition-all duration-300 bg-card/50 backdrop-blur">
              <CardHeader className="space-y-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-warning text-warning" />
                  ))}
                </div>
                <CardDescription className="text-lg leading-relaxed text-foreground">
                  "Peoples.io helped me land my dream role in just 3 weeks. The AI resume optimization was a game-changer!"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="font-semibold text-lg">Sarah Chen</p>
                <p className="text-muted-foreground">Product Manager at Tech Corp</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-border/50 hover:border-primary/50 transition-all duration-300 bg-card/50 backdrop-blur">
              <CardHeader className="space-y-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-warning text-warning" />
                  ))}
                </div>
                <CardDescription className="text-lg leading-relaxed text-foreground">
                  "The career coach feature is incredible. It's like having a personal advisor available 24/7. Worth every penny!"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="font-semibold text-lg">Michael Rodriguez</p>
                <p className="text-muted-foreground">Senior Developer at StartupX</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-border/50 hover:border-primary/50 transition-all duration-300 bg-card/50 backdrop-blur">
              <CardHeader className="space-y-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-warning text-warning" />
                  ))}
                </div>
                <CardDescription className="text-lg leading-relaxed text-foreground">
                  "I went from laid off to hired in 6 weeks. The job matching was spot-on and saved me hours of searching."
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="font-semibold text-lg">Emily Thompson</p>
                <p className="text-muted-foreground">Marketing Director at Global Inc</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="container mx-auto px-6 py-24 border-t border-border/40 bg-muted/20">
          <div className="text-center mb-20">
            <Badge className="mb-6 bg-primary/5 text-primary border border-primary/20 px-4 py-2">
              Transparent Pricing
            </Badge>
            <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground tracking-tight">
              Choose Your Plan
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Flexible pricing that scales with your career journey
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Starter Plan */}
            <Card className="border-2 border-border/50 hover:border-primary/50 hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur">
              <CardHeader className="space-y-4 pb-6">
                <CardTitle className="text-3xl">Starter</CardTitle>
                <CardDescription className="text-base">Perfect for getting started</CardDescription>
                <div className="pt-4">
                  <span className="text-5xl font-bold text-foreground">$29</span>
                  <span className="text-muted-foreground text-lg">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    <span>Up to 3 resume versions</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    <span>20 job applications tracking</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    <span>Basic AI career coach</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    <span>10 cover letters/month</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    <span>Email support</span>
                  </div>
                </div>
                <Button className="w-full h-12 text-base" variant="outline" onClick={() => navigate("/auth")}>
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>

            {/* Professional Plan */}
            <Card className="border-2 border-primary shadow-2xl relative overflow-hidden md:scale-105 bg-card/80 backdrop-blur">
              <div className="absolute top-0 right-0 bg-gradient-primary text-primary-foreground px-5 py-2 text-sm font-bold">
                MOST POPULAR
              </div>
              <CardHeader className="space-y-4 pb-6 pt-8">
                <CardTitle className="text-3xl">Professional</CardTitle>
                <CardDescription className="text-base">For serious job seekers</CardDescription>
                <div className="pt-4">
                  <span className="text-5xl font-bold text-foreground">$79</span>
                  <span className="text-muted-foreground text-lg">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    <span>Unlimited resume versions</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    <span>Unlimited applications tracking</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    <span>Advanced AI career coach</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    <span>Unlimited cover letters</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    <span>Interview question generator</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    <span>LinkedIn profile optimization</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    <span>Priority support</span>
                  </div>
                </div>
                <Button className="w-full h-12 text-base bg-gradient-primary font-semibold" onClick={() => navigate("/auth")}>
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card className="border-2 border-border/50 hover:border-primary/50 hover:shadow-xl transition-all duration-300 bg-card/50 backdrop-blur">
              <CardHeader className="space-y-4 pb-6">
                <CardTitle className="text-3xl">Enterprise</CardTitle>
                <CardDescription className="text-base">For teams & organizations</CardDescription>
                <div className="pt-4">
                  <span className="text-5xl font-bold text-foreground">Custom</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    <span>Everything in Professional</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    <span>Multiple team members</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    <span>Custom integrations</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    <span>Dedicated account manager</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    <span>Custom reporting & analytics</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success shrink-0" />
                    <span>White-label options</span>
                  </div>
                </div>
                <Button className="w-full h-12 text-base" variant="outline">
                  Contact Sales
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="container mx-auto px-6 py-24 border-t border-border/40">
          <div className="text-center mb-20">
            <Badge className="mb-6 bg-primary/5 text-primary border border-primary/20 px-4 py-2">
              FAQ
            </Badge>
            <h2 className="text-5xl md:text-6xl font-bold mb-6 text-foreground tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Everything you need to know about Peoples.io
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              <AccordionItem value="item-1" className="bg-card/50 backdrop-blur border-2 border-border/50 rounded-xl px-8">
                <AccordionTrigger className="text-left hover:no-underline py-6">
                  <span className="font-semibold text-lg">How does the AI resume optimization work?</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                  Our AI analyzes your resume against thousands of successful applications and current ATS (Applicant Tracking System) requirements. It provides specific suggestions for improvements, keyword optimization, and formatting to increase your chances of getting past automated screening and landing interviews.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="bg-card/50 backdrop-blur border-2 border-border/50 rounded-xl px-8">
                <AccordionTrigger className="text-left hover:no-underline py-6">
                  <span className="font-semibold text-lg">Can I cancel my subscription anytime?</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                  Yes! You can cancel your subscription at any time with no penalties or fees. Your access will continue until the end of your current billing period, and you won't be charged again.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="bg-card/50 backdrop-blur border-2 border-border/50 rounded-xl px-8">
                <AccordionTrigger className="text-left hover:no-underline py-6">
                  <span className="font-semibold text-lg">What makes Peoples.io different from other job search platforms?</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                  Peoples.io combines multiple tools into one comprehensive platform: AI resume optimization, intelligent job matching, automated cover letter generation, interview preparation, and 24/7 career coaching. Instead of juggling multiple tools, you get everything you need in one place, powered by advanced AI.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="bg-card/50 backdrop-blur border-2 border-border/50 rounded-xl px-8">
                <AccordionTrigger className="text-left hover:no-underline py-6">
                  <span className="font-semibold text-lg">Is my data secure and private?</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                  Absolutely. We use enterprise-grade encryption and security measures to protect your personal information, resume, and job search data. We never share your information with third parties without your explicit consent, and you maintain full control over your data at all times.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="bg-card/50 backdrop-blur border-2 border-border/50 rounded-xl px-8">
                <AccordionTrigger className="text-left hover:no-underline py-6">
                  <span className="font-semibold text-lg">How quickly can I expect results?</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                  Most users see improved interview rates within the first 2 weeks of using our platform. On average, our users land their next role 3x faster than traditional job search methods, with an average time to hire of 45 days compared to the industry average of 135 days.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-24 border-t border-border/40 bg-muted/20">
          <Card className="bg-gradient-primary text-primary-foreground border-0 shadow-2xl overflow-hidden">
            <CardContent className="text-center py-20 px-8 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent"></div>
              <div className="relative">
                <div className="h-24 w-24 rounded-2xl bg-primary-foreground/10 flex items-center justify-center mx-auto mb-8 backdrop-blur">
                  <Users className="h-12 w-12" />
                </div>
                <h2 className="text-5xl md:text-6xl font-bold mb-8 tracking-tight">
                  Ready to Accelerate Your Career?
                </h2>
                <p className="text-xl md:text-2xl mb-12 opacity-95 max-w-3xl mx-auto leading-relaxed">
                  Join over 50,000 professionals who've successfully transitioned to their dream roles with Peoples.io. Start your free 14-day trial today.
                </p>
                <div className="flex gap-6 justify-center flex-wrap">
                  <Button size="lg" variant="secondary" onClick={() => navigate("/auth")} className="text-lg px-10 h-16 shadow-xl font-semibold">
                    Start Your Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button size="lg" variant="outline" className="text-lg px-10 h-16 bg-transparent border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary font-semibold">
                    Schedule a Demo
                  </Button>
                </div>
                <p className="text-base mt-8 opacity-90 flex items-center justify-center gap-2">
                  <Clock className="h-5 w-5" />
                  Average setup time: 5 minutes
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/40 bg-background/95 backdrop-blur-lg py-16">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-4 gap-12 mb-12">
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="text-xl font-bold">Peoples.io</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Your AI-powered career acceleration platform
                </p>
                <Badge variant="outline" className="text-xs border-warning/20 bg-warning/5">
                  <Star className="h-3 w-3 mr-1 fill-warning text-warning" />
                  4.9 Rating
                </Badge>
              </div>
              <div>
                <h4 className="font-semibold mb-4 text-lg">Product</h4>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="hover:text-foreground cursor-pointer transition-colors">Features</li>
                  <li className="hover:text-foreground cursor-pointer transition-colors">Pricing</li>
                  <li className="hover:text-foreground cursor-pointer transition-colors">FAQ</li>
                  <li className="hover:text-foreground cursor-pointer transition-colors">Integrations</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4 text-lg">Company</h4>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="hover:text-foreground cursor-pointer transition-colors">About</li>
                  <li className="hover:text-foreground cursor-pointer transition-colors">Blog</li>
                  <li className="hover:text-foreground cursor-pointer transition-colors">Careers</li>
                  <li className="hover:text-foreground cursor-pointer transition-colors">Press</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4 text-lg">Legal</h4>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="hover:text-foreground cursor-pointer transition-colors">Privacy Policy</li>
                  <li className="hover:text-foreground cursor-pointer transition-colors">Terms of Service</li>
                  <li className="hover:text-foreground cursor-pointer transition-colors">Security</li>
                  <li className="hover:text-foreground cursor-pointer transition-colors">GDPR</li>
                </ul>
              </div>
            </div>
            <div className="border-t border-border/40 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-muted-foreground">
              <p>© 2025 Peoples.io. All rights reserved.</p>
              <p className="flex items-center gap-1.5">
                Made with <span className="text-destructive">❤</span> for career professionals
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Index;
