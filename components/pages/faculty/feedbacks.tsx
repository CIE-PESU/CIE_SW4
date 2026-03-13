import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  MessageSquare, 
  Star, 
  BookOpen, 
  Users, 
  Calendar, 
  RefreshCw,
  Sparkles,
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function FacultyFeedbacks() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Platform Feedback State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Course Feedback State
  const [courses, setCourses] = useState<any[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [isFeedbackSheetOpen, setIsFeedbackSheetOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [courseFeedbacks, setCourseFeedbacks] = useState<any[]>([]);
  const [isFeedbacksLoading, setIsFeedbacksLoading] = useState(false);
  const [selectedFeedbackUnitId, setSelectedFeedbackUnitId] = useState<string>("all");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    summary: string;
    sentiment: string;
    insights: string[];
  } | null>(null);

  const sidebarSections = [
    "Dashboard", "Courses", "Lab Components", "Library", "Locations", "Project Management", "Feedbacks", "Settings"
  ];

  useEffect(() => {
    fetchMyCourses();
    fetchPlatformFeedbacks();
  }, [user]);

  const fetchMyCourses = async () => {
    if (!user?.id) return;
    try {
      setCoursesLoading(true);
      const response = await fetch("/api/courses", {
        headers: { "x-user-id": user.id },
      });
      const data = await response.json();
      // Filter only courses created by this faculty
      const myCourses = (data.courses || []).filter((c: any) => c.created_by === user.id);
      setCourses(myCourses);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setCoursesLoading(false);
    }
  };

  const fetchPlatformFeedbacks = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch("/api/feedbacks?created_by=me", {
        headers: { "x-user-id": user.id },
      });
      const data = await res.json();
      setFeedbacks(data.feedbacks || []);
    } catch (error) {
      console.error("Error loading platform feedbacks:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseFeedbacks = async (courseId: string, unitId?: string) => {
    try {
      setIsFeedbacksLoading(true);
      const url = unitId && unitId !== "all" 
        ? `/api/courses/feedback?courseId=${courseId}&unitId=${unitId}`
        : `/api/courses/feedback?courseId=${courseId}`;
        
      const response = await fetch(url, {
        headers: { "x-user-id": user?.id || "" },
      });
      const data = await response.json();
      if (response.ok) {
        setCourseFeedbacks(data.feedbacks || []);
        setAiAnalysis(null); // Reset analysis when feedbacks change
      }
    } catch (error) {
      console.error("Error fetching course feedbacks:", error)
    } finally {
      setIsFeedbacksLoading(false);
    }
  };

  const analyzeWithAI = async () => {
    if (!courseFeedbacks.length || !user?.id) return;
    
    setIsAnalyzing(true);
    try {
      const context = selectedFeedbackUnitId === "all" 
        ? `the entire course: ${selectedCourse?.course_name}`
        : `Unit ${selectedCourse?.course_units?.find((u: any) => u.id === selectedFeedbackUnitId)?.unit_number} of ${selectedCourse?.course_name}`;

      const response = await fetch("/api/courses/feedback/analyze", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": user.id 
        },
        body: JSON.stringify({
          feedbacks: courseFeedbacks,
          context: context
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiAnalysis(data.analysis);
      } else {
        const errData = await response.json();
        const isQuotaError = errData.details?.toLowerCase().includes("429") || errData.details?.toLowerCase().includes("quota");
        
        toast({ 
          title: isQuotaError ? "AI Quota Reached" : "Analysis Failed", 
          description: isQuotaError 
            ? "You've reached the free tier limit. Please wait a minute and try again." 
            : (errData.details || errData.error || "Unable to reach AI services"), 
          variant: "destructive" 
        });
      }
    } catch (error) {
      toast({ title: "Analysis Error", description: "Something went wrong during analysis", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openFeedbackSheet = (course: any) => {
    setSelectedCourse(course);
    setSelectedFeedbackUnitId("all");
    setIsFeedbackSheetOpen(true);
    setAiAnalysis(null);
    fetchCourseFeedbacks(course.id, "all");
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleSubmitPlatformFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !category) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      if (image) formData.append("image", image);
      const res = await fetch("/api/feedbacks", {
        method: "POST",
        headers: { "x-user-id": user?.id || "" },
        body: formData,
      });
      if (res.ok) {
        setTitle("");
        setDescription("");
        setCategory("");
        setImage(null);
        setImagePreview(null);
        fetchPlatformFeedbacks();
        toast({ title: "Success", description: "Platform feedback submitted" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to submit feedback", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-6 max-w-5xl w-full mx-auto space-y-6 px-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Feedback Center</h2>
        <p className="text-muted-foreground">Monitor course performance and share platform feedback.</p>
      </div>

      <Tabs defaultValue="courses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="courses">Student Course Feedback</TabsTrigger>
          <TabsTrigger value="system">Submit System Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-4">
          {coursesLoading ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : courses.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium">No courses found</h3>
              <p className="text-muted-foreground">Feedback will appear here once you create a course and students provide input.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map((course) => (
                <Card key={course.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{course.course_name}</CardTitle>
                      <Badge variant="outline">{course.course_code}</Badge>
                    </div>
                    <CardDescription className="line-clamp-1">{course.course_description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {course.course_enrollments?.length || 0} Students
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(course.course_start_date).toLocaleDateString()}
                        </span>
                      </div>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => openFeedbackSheet(course)}>
                        <MessageSquare className="h-3.5 w-3.5 mr-2" />
                        View Feedback
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Submit Platform Feedback</CardTitle>
              <CardDescription>Share suggestions or report bugs regarding the CIE portal.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitPlatformFeedback} className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} disabled={submitting} className="flex-1" />
                  <select
                    className="flex h-10 w-full md:w-64 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    disabled={submitting}
                  >
                    <option value="">Select Category</option>
                    {sidebarSections.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <Textarea placeholder="Describe your feedback..." value={description} onChange={e => setDescription(e.target.value)} rows={4} disabled={submitting} />
                <div>
                  <input id="system-file-tab" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('system-file-tab')?.click()} disabled={submitting}>
                    <Upload className="h-4 w-4 mr-2" /> Upload Screenshot
                  </Button>
                  {imagePreview && <img src={imagePreview} alt="Preview" className="mt-2 max-h-32 rounded border shadow-sm" />}
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={submitting} className="bg-blue-900 hover:bg-black text-white">
                    {submitting ? "Submitting..." : "Submit Feedback"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          
          {feedbacks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your Previous Submissions</h3>
              <div className="grid gap-3">
                {feedbacks.map((f, i) => (
                  <Card key={i} className="bg-slate-50/50">
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{f.title}</p>
                        <p className="text-xs text-muted-foreground">{f.category} • {new Date(f.created_at).toLocaleDateString()}</p>
                      </div>
                      <Badge variant={f.status === "completed" ? "outline" : "secondary"}>{f.status}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Course Feedback Sheet - REUSED FROM ADMIN */}
      <Sheet open={isFeedbackSheetOpen} onOpenChange={setIsFeedbackSheetOpen}>
        <SheetContent className="w-[450px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Course Performance & Feedback</SheetTitle>
            <SheetDescription>
              Performance data for {selectedCourse?.course_name}
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-4 pb-4 border-b flex items-end gap-3">
            <div className="flex-1">
              <Label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                Filter by Unit
              </Label>
              <select
                value={selectedFeedbackUnitId}
                onChange={(e) => {
                  setSelectedFeedbackUnitId(e.target.value);
                  setAiAnalysis(null);
                  fetchCourseFeedbacks(selectedCourse.id, e.target.value);
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Overall Performance</option>
                {selectedCourse?.course_units?.map((unit: any) => (
                  <option key={unit.id} value={unit.id}>
                    Unit {unit.unit_number}: {unit.unit_name}
                  </option>
                ))}
              </select>
            </div>
            <Button 
              size="sm" 
              className="bg-purple-600 hover:bg-purple-700 text-white shrink-0"
              onClick={analyzeWithAI}
              disabled={isAnalyzing || courseFeedbacks.length === 0}
            >
              {isAnalyzing ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-2" /> : <Sparkles className="h-3.5 w-3.5 mr-2" />}
              AI Insight
            </Button>
          </div>

          <div className="mt-6 space-y-6">
            {isAnalyzing && (
              <div className="p-6 border-2 border-dashed border-purple-200 rounded-xl bg-purple-50/30 flex flex-col items-center justify-center text-center">
                <BrainCircuit className="h-10 w-10 text-purple-400 animate-pulse mb-3" />
                <p className="text-purple-700 font-medium">Brewing Deep Insights...</p>
                <p className="text-sm text-purple-500">Our AI is distilling student feedback for you.</p>
              </div>
            )}

            {aiAnalysis && !isAnalyzing && (
              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white overflow-hidden shadow-sm">
                <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-100 rounded-lg">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-purple-900 uppercase tracking-tight">AI Intelligent Summary</CardTitle>
                      <CardDescription className="text-[10px] text-purple-600">Based on {courseFeedbacks.length} student responses</CardDescription>
                    </div>
                  </div>
                  <Badge className={cn(
                    "capitalize text-[10px] font-bold border-0",
                    aiAnalysis.sentiment.toLowerCase().includes("positive") ? "bg-green-100 text-green-700" :
                    aiAnalysis.sentiment.toLowerCase().includes("negative") ? "bg-red-100 text-red-700" :
                    "bg-slate-100 text-slate-700"
                  )}>
                    {aiAnalysis.sentiment.toLowerCase().includes("positive") ? <TrendingUp className="h-3 w-3 mr-1" /> :
                     aiAnalysis.sentiment.toLowerCase().includes("negative") ? <TrendingDown className="h-3 w-3 mr-1" /> :
                     <Minus className="h-3 w-3 mr-1" />}
                    {aiAnalysis.sentiment}
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm text-slate-700 leading-relaxed italic">
                    "{aiAnalysis.summary}"
                  </p>
                  
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <Lightbulb className="h-3 w-3 text-yellow-500" /> Actionable Recommendations
                    </p>
                    <div className="grid gap-2">
                      {aiAnalysis.insights.map((insight, idx) => (
                        <div key={idx} className="flex gap-2 items-start p-2 bg-white/60 rounded-lg border border-purple-50 text-xs text-slate-600">
                          <AlertCircle className="h-3.5 w-3.5 text-purple-400 shrink-0 mt-0.5" />
                          <span>{insight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isFeedbacksLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : courseFeedbacks.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed">
                <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No reviews found</p>
                <p className="text-sm text-slate-400">Student input for this unit will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <span className="text-sm font-medium text-gray-500">{courseFeedbacks.length} Responses</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-gray-900">
                      {(courseFeedbacks.reduce((acc, f) => acc + (f.rating || 0), 0) / courseFeedbacks.length).toFixed(1)}
                    </span>
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  </div>
                </div>
                {courseFeedbacks.map((feedback) => (
                  <Card key={feedback.id} className="overflow-hidden">
                    <CardHeader className="p-4 pb-2 bg-slate-50/50">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 text-xs">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                            {feedback.student?.user?.name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <p className="font-semibold">{feedback.student?.user?.name}</p>
                            <p className="text-gray-500">{new Date(feedback.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-[10px] bg-white">Unit {feedback.unit?.unit_number}</Badge>
                          <div className="flex items-center justify-end mt-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={cn("h-3 w-3", s <= (feedback.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-200")} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <p className="text-[10px] font-bold text-blue-600 mb-1">{feedback.unit?.unit_name}</p>
                      <p className="text-sm italic">"{feedback.comment}"</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
} 