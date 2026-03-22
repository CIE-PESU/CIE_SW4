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
  Lightbulb,
  X
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

  const sidebarSections = [
    "Dashboard", "Courses", "Lab Components", "Library", "Locations", "Project Management", "Feedbacks", "Settings"
  ];

  useEffect(() => {
    fetchPlatformFeedbacks();
  }, [user]);

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
        <p className="text-muted-foreground">Share your suggestions or report issues with the CIE portal.</p>
      </div>

      <div className="space-y-4 pt-4">
        <Card className="shadow-lg border-blue-100/50">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-blue-900">Submit Platform Feedback</CardTitle>
            <CardDescription>Share suggestions or report bugs regarding the CIE portal.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitPlatformFeedback} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="title" className="text-sm font-semibold">Title</Label>
                  <Input id="title" placeholder="Give your feedback a clear title" value={title} onChange={e => setTitle(e.target.value)} disabled={submitting} />
                </div>
                <div className="w-full md:w-64 space-y-2">
                  <Label htmlFor="category" className="text-sm font-semibold">Category</Label>
                  <select
                    id="category"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    disabled={submitting}
                  >
                    <option value="">Select Category</option>
                    {sidebarSections.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                <Textarea id="description" placeholder="Provide as much detail as possible..." value={description} onChange={e => setDescription(e.target.value)} rows={4} disabled={submitting} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Optional Screenshot</Label>
                <div className="flex flex-col items-start gap-3">
                  <input id="system-file-tab" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('system-file-tab')?.click()} disabled={submitting} className="border-dashed border-2 hover:border-blue-500 hover:bg-blue-50 transition-all">
                    <Upload className="h-4 w-4 mr-2" /> Upload Screenshot
                  </Button>
                  {imagePreview && (
                    <div className="relative group">
                      <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg border shadow-md" />
                      <button 
                        type="button" 
                        onClick={() => {setImage(null); setImagePreview(null);}} 
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) }
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={submitting} className="bg-[#34305E] hover:bg-black text-white px-8 py-2 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-blue-900/20">
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Submitting...
                    </div>
                  ) : (
                    "Submit Feedback"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        
        {feedbacks.length > 0 && (
          <div className="space-y-4 pt-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Your Previous Submissions
            </h3>
            <div className="grid gap-4">
              {loading ? (
                <div className="flex justify-center p-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : (
                feedbacks.map((f, i) => (
                  <Card key={i} className="hover:shadow-md transition-all border-l-4 border-l-blue-500">
                    <CardContent className="p-4 flex justify-between items-center">
                      <div className="space-y-1">
                        <p className="font-bold text-blue-900">{f.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] uppercase">{f.category}</Badge>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-medium">
                            <Calendar className="h-3 w-3" />
                            {new Date(f.created_at).toLocaleDateString()}
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge 
                          variant={f.status === "completed" ? "outline" : "secondary"} 
                          className={cn(
                            "capitalize font-bold px-3 py-1",
                            f.status === "completed" ? "bg-green-50 text-green-700 border-green-200" : 
                            f.status === "pending" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                            "bg-slate-100 text-slate-700"
                          )}
                        >
                          {f.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
