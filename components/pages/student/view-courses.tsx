"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { BookOpen, Calendar, UserPlus, Trash2, RefreshCw, List, Clock, FileText, Search, Filter, MessageSquare, Star, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"

interface CourseUnit {
  id: string
  unit_number: number
  unit_name: string
  unit_description: string
  assignment_count: number
  hours_per_unit: number
}

interface Course {
  id: string
  course_code: string
  course_name: string
  course_description: string
  course_start_date: string
  course_end_date: string
  course_enrollments: string[]
  created_by: string
  created_date: string
  modified_by?: string
  modified_date: string
  course_units: CourseUnit[]
  creator?: {
    id: string
    name: string
    email: string
  }
}

export function ViewCourses() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [isUnitsSheetOpen, setIsUnitsSheetOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filter, setFilter] = useState("all")
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false)
  const [feedbackCourse, setFeedbackCourse] = useState<Course | null>(null)
  const [feedbackUnitId, setFeedbackUnitId] = useState<string>("")
  const [feedbackRating, setFeedbackRating] = useState(5)
  const [feedbackComment, setFeedbackComment] = useState("")
  const [feedbackSuggestions, setFeedbackSuggestions] = useState("")
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [courseFeedbacks, setCourseFeedbacks] = useState<any[]>([])
  const [allSuggestions, setAllSuggestions] = useState<any[]>([])
  const [isFeedbacksLoading, setIsFeedbacksLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (user) fetchData()
  }, [user])

  const fetchData = async () => {
    if (!user) return
    try {
      setLoading(true)
      const response = await fetch("/api/courses")
      const data = await response.json()
      setCourses(data.courses || [])
    } catch (error) {
      console.error("Error fetching courses:", error)
      toast({
        title: "Error",
        description: "Failed to load course data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const isEnrolled = (course: Course) => {
    return user && course.course_enrollments.includes(user.id)
  }

  const handleSignUp = async (courseId: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to sign up for courses",
        variant: "destructive",
      })
      return
    }
    try {
      const response = await fetch(`/api/courses`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({ courseId, action: "enroll" }),
      })
      if (response.ok) {
        toast({ title: "Success", description: "Enrolled in course!" })
        fetchData()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to enroll")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to enroll in course",
        variant: "destructive",
      })
    }
  }

  const openUnitsSheet = (course: Course) => {
    setSelectedCourse(course)
    setIsUnitsSheetOpen(true)
  }

  const openFeedbackDialog = (course: Course, unitId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setFeedbackCourse(course)
    setFeedbackUnitId(unitId)
    
    // Reset form defaults
    setFeedbackRating(5)
    setFeedbackComment("")
    setFeedbackSuggestions("")
    
    setIsFeedbackDialogOpen(true)
    fetchCourseFeedbacks(course.id, unitId)
  }

  const fetchCourseFeedbacks = async (courseId: string, unitId?: string) => {
    try {
      setIsFeedbacksLoading(true)
      const url = unitId && unitId !== "all" 
        ? `/api/courses/feedback?courseId=${courseId}&unitId=${unitId}`
        : `/api/courses/feedback?courseId=${courseId}`;
        
      const response = await fetch(url, {
        headers: {
          "x-user-id": user?.id || "",
        },
      })
      const data = await response.json()
      if (response.ok) {
        setCourseFeedbacks(data.feedbacks || [])
        setAllSuggestions(data.allSuggestions || [])
        // Pre-fill if we found existing feedback for this user
        if (data.feedbacks && data.feedbacks.length > 0) {
          const myFeedback = data.feedbacks[0]
          setFeedbackRating(myFeedback.rating)
          setFeedbackComment(myFeedback.comment)
          setFeedbackSuggestions(myFeedback.suggestions || "")
        }
      } else {
        throw new Error(data.error || "Failed to fetch feedbacks")
      }
    } catch (error) {
      console.error("Error fetching feedbacks:", error)
    } finally {
      setIsFeedbacksLoading(false)
    }
  }

  const refreshData = async () => {
    if (!feedbackCourse) return;
    await fetchCourseFeedbacks(feedbackCourse.id, feedbackUnitId)
    toast({
      title: "Refreshed",
      description: "Latest feedback history loaded",
    })
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackCourse || !user) return
    try {
      setSubmittingFeedback(true)
      const response = await fetch("/api/courses/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({
          courseId: feedbackCourse.id,
          unitId: feedbackUnitId,
          rating: feedbackRating,
          comment: feedbackComment,
          suggestions: feedbackSuggestions,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Feedback submitted successfully",
        })
        fetchCourseFeedbacks(feedbackCourse.id, feedbackUnitId)
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${errorData.details}` 
          : (errorData.error || "Failed to submit feedback");
        throw new Error(errorMessage)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit feedback",
        variant: "destructive",
      })
    } finally {
      setSubmittingFeedback(false)
    }
  }

  const getTotalHours = (units: CourseUnit[]) => {
    return units.reduce((total, unit) => total + unit.hours_per_unit, 0)
  }

  const getTotalAssignments = (units: CourseUnit[]) => {
    return units.reduce((total, unit) => total + unit.assignment_count, 0)
  }

  const getCourseStatus = (course: Course) => {
    const now = new Date();
    const start = new Date(course.course_start_date);
    const end = new Date(course.course_end_date);
    const enrolled = isEnrolled(course);

    if (enrolled) {
      if (now > end) return { label: "Completed", color: "bg-green-500" };
      return { label: "Ongoing", color: "bg-orange-500" };
    } else {
      if (now > end) return { label: "Ended", color: "bg-red-500" };
      return { label: "Available", color: "bg-blue-500" };
    }
  };

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.course_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.course_code.toLowerCase().includes(searchTerm.toLowerCase());
      
      const enrolled = isEnrolled(course);
      const matchesFilter = filter === "all" || (filter === "my_courses" && enrolled);
      
      return matchesSearch && matchesFilter;
    });
  }, [courses, searchTerm, filter, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading courses...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Available Courses</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Browse and sign up for available courses</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <Filter className="h-5 w-5 text-gray-400 mx-2" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900"
          >
            <option value="all">All Courses</option>
            <option value="my_courses">My Courses</option>
          </select>
        </div>

        {/* Status Legend */}
        <div className="flex flex-wrap items-center gap-4 text-sm bg-gray-50 dark:bg-slate-800/50 px-4 py-2 rounded-lg border border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span className="text-gray-600 dark:text-gray-300">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-orange-500"></div>
            <span className="text-gray-600 dark:text-gray-300">Ongoing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            <span className="text-gray-600 dark:text-gray-300">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-500"></div>
            <span className="text-gray-600 dark:text-gray-300">Ended</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredCourses.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No courses found</h3>
              <p className="text-gray-600 dark:text-gray-400">Try adjusting your search or filters.</p>
            </CardContent>
          </Card>
        ) : (
          filteredCourses.map((course) => {
            const enrolled = isEnrolled(course)
            const totalHours = getTotalHours(course.course_units || [])
            const totalAssignments = getTotalAssignments(course.course_units || [])
            return (
              <Card 
                key={course.id} 
                className="admin-card flex flex-col justify-between min-h-[280px] w-full cursor-pointer"
                onClick={() => {
                  const selection = window.getSelection();
                  if (selection && selection.toString().length > 0) return;
                  openUnitsSheet(course);
                }}
              >
                <CardHeader className="pb-2 px-0">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                      <span className="font-bold text-lg text-gray-900 dark:text-white truncate">{course.course_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-slate-100 border-0 whitespace-nowrap pointer-events-none">
                        {course.course_units?.length || 0} Units
                      </Badge>
                      <Badge className={`${getCourseStatus(course).color} text-white border-0 whitespace-nowrap pointer-events-none`}>
                        {getCourseStatus(course).label}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
                    {course.course_description}
                  </CardDescription>
                  <span className="text-xs text-gray-400 mt-1 block">{course.course_code}</span>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between px-0 pb-0">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-4 text-sm mb-2 text-gray-600 dark:text-gray-300">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <span>{new Date(course.course_start_date).toLocaleDateString()} - {new Date(course.course_end_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <span>{totalHours} hours</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <span>{totalAssignments} assignments</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <List className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <span>{course.course_units?.length || 0} units</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1" />
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-gray-500">Created by: {course.creator?.name || course.created_by}</span>
                    <div className="flex space-x-2">
                      {!enrolled && getCourseStatus(course).label === "Available" && (
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSignUp(course.id);
                          }}
                        >
                          <UserPlus className="h-4 w-4 md:mr-1" />
                          <span className="hidden md:inline">Sign Up</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Course Units Sheet */}
      <Sheet open={isUnitsSheetOpen} onOpenChange={setIsUnitsSheetOpen}>
        <SheetContent className="w-96">
          <SheetHeader>
            <SheetTitle>Course Units</SheetTitle>
            <SheetDescription>
              {selectedCourse?.course_name}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {selectedCourse?.course_units?.length === 0 ? (
              <p className="text-gray-500 text-center">No units added yet</p>
            ) : (
              selectedCourse?.course_units?.map((unit) => (
                <Card key={unit.id} className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">Unit {unit.unit_number}</h4>
                      <Badge variant="outline">{unit.hours_per_unit}h</Badge>
                    </div>
                    <h5 className="font-medium text-sm">{unit.unit_name}</h5>
                    <p className="text-sm text-gray-600">{unit.unit_description}</p>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{unit.assignment_count} assignments</span>
                    </div>
                    {selectedCourse && isEnrolled(selectedCourse) && (
                      <div className="mt-3 pt-3 border-t">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full text-blue-600 border-blue-100 hover:bg-blue-50"
                          onClick={(e) => openFeedbackDialog(selectedCourse, unit.id, e)}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Give Feedback
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Feedback Dialog */}
      <Dialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Unit Performance & Feedback
            </DialogTitle>
            <DialogDescription>
              Share your thoughts on <span className="font-semibold text-blue-600">Unit {feedbackCourse?.course_units?.find(u => u.id === feedbackUnitId)?.unit_number}: {feedbackCourse?.course_units?.find(u => u.id === feedbackUnitId)?.unit_name}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            {/* Left Column: Form */}
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-3 uppercase tracking-wider">Submit Your Feedback</h3>
                
                <div className="flex items-start gap-2 mb-4 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg text-[10px] text-amber-800 dark:text-amber-300">
                  <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <p className="leading-tight">
                    <span className="font-bold underline">Note:</span> New submissions <span className="font-bold italic">overwrite</span> previous ones for this unit.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-3">
                    <Label htmlFor="rating" className="text-xs font-semibold text-gray-500 uppercase">Class Rating</Label>
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-2 rounded-lg border w-fit">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Button
                          key={star}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="p-1 h-auto hover:bg-transparent"
                          onClick={() => setFeedbackRating(star)}
                        >
                          <Star
                            className={cn(
                              "h-7 w-7 transition-all duration-200 transform hover:scale-110",
                              star <= feedbackRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                            )}
                          />
                        </Button>
                      ))}
                      <span className="ml-2 text-base font-bold text-gray-700 dark:text-white">{feedbackRating}/5</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="comment" className="text-[10px] font-semibold text-gray-500 uppercase">Your Experience</Label>
                    <Textarea
                      id="comment"
                      placeholder="What did you like? What could be improved?"
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      rows={3}
                      className="resize-none bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="suggestions" className="text-[10px] font-semibold text-gray-500 uppercase">Suggestions for Next Session</Label>
                    <Textarea
                      id="suggestions"
                      placeholder="What should be changed for the next session?"
                      value={feedbackSuggestions}
                      onChange={(e) => setFeedbackSuggestions(e.target.value)}
                      rows={3}
                      className="resize-none bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <Button 
                    onClick={handleSubmitFeedback} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg shadow shadow-blue-200 transition-all active:scale-[0.98] h-10"
                    disabled={submittingFeedback || !feedbackComment.trim()}
                  >
                    {submittingFeedback ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <MessageSquare className="h-4 w-4 mr-2" />
                    )}
                    {submittingFeedback ? "Submitting..." : "Submit Feedback"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Column: History */}
            <div className="space-y-6">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Your Submission</h3>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8"
                  onClick={refreshData}
                  disabled={isFeedbacksLoading}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5 mr-2", isFeedbacksLoading && "animate-spin")} />
                  Refresh
                </Button>
              </div>

              {/* Your Submission Card - Matching Faculty FeedbackCard style */}
              <div className="space-y-4">
                {isFeedbacksLoading ? (
                  <div className="flex justify-center p-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-300" />
                  </div>
                ) : courseFeedbacks.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700">
                    <Info className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No feedback submitted yet</p>
                  </div>
                ) : (
                  courseFeedbacks.map((f, idx) => (
                    <Card key={idx} className="overflow-hidden border-slate-200 dark:border-slate-700 shadow-md">
                      <CardHeader className="p-4 pb-2 bg-slate-50/50 dark:bg-slate-800/20">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                              {user?.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {user?.name}
                              </p>
                              <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Updated on {new Date(f.updated_at || f.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center justify-end gap-0.5 mb-1">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star 
                                  key={s} 
                                  className={cn(
                                    "h-3.5 w-3.5",
                                    s <= (f.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                                  )} 
                                />
                              ))}
                            </div>
                            <Badge variant="outline" className="text-[9px] font-bold px-1.5 h-5 bg-white shadow-sm">
                              ID: {f.id.slice(-4).toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic bg-white dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 quote">
                          "{f.comment}"
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Suggestions from all students */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 px-1">
                  <div className="h-1 w-8 bg-blue-500 rounded-full" />
                  <h3 className="text-[10px] font-bold text-gray-900 dark:text-white uppercase tracking-wider">Collective Session Ideas</h3>
                </div>
                {allSuggestions.length === 0 ? (
                  <div className="text-center py-4 bg-slate-50/50 dark:bg-slate-800/20 rounded-lg border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] text-gray-400 italic">No suggestions shared yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allSuggestions.map((s, idx) => (
                      <div key={idx} className="p-2.5 bg-blue-50/30 dark:bg-blue-900/10 border border-blue-50 dark:border-blue-900/30 rounded-lg">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">{s.student?.user?.name || "Student"}</span>
                          <span className="text-[8px] text-gray-400">{new Date(s.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal italic">
                          "{s.suggestions}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-8 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsFeedbackDialogOpen(false)} className="px-8">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
