import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, ThumbsUp, Plus, ArrowLeft, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function InterviewQuestions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<any[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [showAnswerForm, setShowAnswerForm] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{ [key: string]: any[] }>({});
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Form data
  const [newQuestion, setNewQuestion] = useState({
    company: "",
    job_role: "",
    question: "",
    category: "technical",
    difficulty: "medium",
  });
  const [newAnswer, setNewAnswer] = useState("");

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    filterQuestions();
  }, [questions, searchTerm, roleFilter, companyFilter, categoryFilter]);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from("interview_questions")
        .select("*")
        .order("upvotes", { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterQuestions = () => {
    let filtered = [...questions];

    if (searchTerm) {
      filtered = filtered.filter(q => 
        q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.job_role.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter(q => q.job_role === roleFilter);
    }

    if (companyFilter !== "all") {
      filtered = filtered.filter(q => q.company === companyFilter);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(q => q.category === categoryFilter);
    }

    setFilteredQuestions(filtered);
  };

  const fetchAnswers = async (questionId: string) => {
    if (answers[questionId]) return;

    try {
      const { data, error } = await supabase
        .from("interview_answers")
        .select("*")
        .eq("question_id", questionId)
        .order("upvotes", { ascending: false });

      if (error) throw error;
      setAnswers(prev => ({ ...prev, [questionId]: data || [] }));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const submitQuestion = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("interview_questions")
        .insert({
          ...newQuestion,
          submitted_by: user.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Question submitted successfully!",
      });

      setShowAddQuestion(false);
      setNewQuestion({
        company: "",
        job_role: "",
        question: "",
        category: "technical",
        difficulty: "medium",
      });
      fetchQuestions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const submitAnswer = async (questionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("interview_answers")
        .insert({
          question_id: questionId,
          answer_text: newAnswer,
          submitted_by: user.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Answer submitted successfully!",
      });

      setShowAnswerForm(null);
      setNewAnswer("");
      fetchAnswers(questionId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const upvoteQuestion = async (questionId: string) => {
    try {
      const question = questions.find(q => q.id === questionId);
      if (!question) return;

      const { error } = await supabase
        .from("interview_questions")
        .update({ upvotes: question.upvotes + 1 })
        .eq("id", questionId);

      if (error) throw error;
      fetchQuestions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const uniqueRoles = [...new Set(questions.map(q => q.job_role))];
  const uniqueCompanies = [...new Set(questions.map(q => q.company).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Interview Question Bank</h1>
              <p className="text-muted-foreground">Crowd-sourced questions and answers</p>
            </div>
          </div>
          <Button onClick={() => setShowAddQuestion(!showAddQuestion)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>

        {showAddQuestion && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Submit Interview Question</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Job Role *</Label>
                  <Input
                    value={newQuestion.job_role}
                    onChange={(e) => setNewQuestion({ ...newQuestion, job_role: e.target.value })}
                    placeholder="e.g., Software Engineer"
                  />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input
                    value={newQuestion.company}
                    onChange={(e) => setNewQuestion({ ...newQuestion, company: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select
                    value={newQuestion.category}
                    onValueChange={(value) => setNewQuestion({ ...newQuestion, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="behavioral">Behavioral</SelectItem>
                      <SelectItem value="cultural">Cultural</SelectItem>
                      <SelectItem value="situational">Situational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <Select
                    value={newQuestion.difficulty}
                    onValueChange={(value) => setNewQuestion({ ...newQuestion, difficulty: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Question *</Label>
                <Textarea
                  value={newQuestion.question}
                  onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                  placeholder="Enter the interview question..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={submitQuestion}>Submit Question</Button>
                <Button variant="outline" onClick={() => setShowAddQuestion(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search questions..."
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {uniqueRoles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="behavioral">Behavioral</SelectItem>
                  <SelectItem value="cultural">Cultural</SelectItem>
                  <SelectItem value="situational">Situational</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <ScrollArea className="h-[calc(100vh-400px)]">
          <div className="space-y-4">
            {filteredQuestions.map((question) => (
              <Card key={question.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{question.question}</CardTitle>
                      <CardDescription className="mt-2">
                        {question.job_role}
                        {question.company && ` • ${question.company}`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => upvoteQuestion(question.id)}
                      >
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        {question.upvotes}
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{question.category}</Badge>
                    <Badge variant="outline">{question.difficulty}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="answers">
                    <TabsList>
                      <TabsTrigger
                        value="answers"
                        onClick={() => fetchAnswers(question.id)}
                      >
                        Answers
                      </TabsTrigger>
                      <TabsTrigger value="add-answer">Add Answer</TabsTrigger>
                    </TabsList>
                    <TabsContent value="answers" className="mt-4">
                      {answers[question.id] && answers[question.id].length > 0 ? (
                        <div className="space-y-3">
                          {answers[question.id].map((answer) => (
                            <div key={answer.id} className="bg-muted p-3 rounded-lg">
                              <p className="text-sm">{answer.answer_text}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Button variant="ghost" size="sm">
                                  <ThumbsUp className="h-3 w-3 mr-1" />
                                  {answer.upvotes}
                                </Button>
                                <span className="text-xs text-muted-foreground">
                                  {answer.helpful_count} found helpful
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No answers yet. Be the first to contribute!
                        </p>
                      )}
                    </TabsContent>
                    <TabsContent value="add-answer" className="mt-4">
                      <div className="space-y-4">
                        <Textarea
                          value={showAnswerForm === question.id ? newAnswer : ""}
                          onChange={(e) => {
                            setShowAnswerForm(question.id);
                            setNewAnswer(e.target.value);
                          }}
                          placeholder="Share your answer or approach to this question..."
                          rows={4}
                        />
                        <Button onClick={() => submitAnswer(question.id)}>
                          Submit Answer
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}