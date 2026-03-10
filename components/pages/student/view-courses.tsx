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
import { BookOpen, Calendar, UserPlus, Trash2, RefreshCw, List, Clock, FileText, Search, Filter, MessageSquare, Star } from "lucide-react"
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
  const [feedbackRating, setFeedbackRating] = useState(5)
  const [feedbackComment, setFeedbackComment] = useState("")
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
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

  const openFeedbackDialog = (course: Course, e: React.MouseEvent) => {
    e.stopPropagation()
    setFeedbackCourse(course)
    setFeedbackRating(5)
    setFeedbackComment("")
    setIsFeedbackDialogOpen(true)
  }

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
          rating: feedbackRating,
          comment: feedbackComment,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Feedback submitted successfully",
        })
        setIsFeedbackDialogOpen(false)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to submit feedback")
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
          <h1 className="text-3xl font-bold text-gray-900">Available Courses</h1>
          <p className="text-gray-600 mt-2">Browse and sign up for available courses</p>
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
        <div className="flex items-center gap-4 text-sm bg-gray-50 dark:bg-slate-800/50 px-4 py-2 rounded-lg border border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span className="text-gray-600 dark:text-slate-400">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-orange-500"></div>
            <span className="text-gray-600 dark:text-slate-400">Ongoing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            <span className="text-gray-600 dark:text-slate-400">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-500"></div>
            <span className="text-gray-600 dark:text-slate-400">Ended</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredCourses.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
              <p className="text-gray-600">Try adjusting your search or filters.</p>
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
                      <span className="font-bold text-lg text-gray-900 truncate">{course.course_name}</span>
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
                  <CardDescription className="text-gray-600 text-sm line-clamp-2">
                    {course.course_description}
                  </CardDescription>
                  <span className="text-xs text-gray-400 mt-1 block">{course.course_code}</span>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between px-0 pb-0">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-4 text-sm mb-2">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{new Date(course.course_start_date).toLocaleDateString()} - {new Date(course.course_end_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{totalHours} hours</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span>{totalAssignments} assignments</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <List className="h-4 w-4 text-gray-400" />
                        <span>{course.course_units?.length || 0} units</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1" />
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-gray-500">Created by: {course.creator?.name || course.created_by}</span>
                    <div className="flex space-x-2">
                      {enrolled && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => openFeedbackDialog(course, e)}
                        >
                          <MessageSquare className="h-4 w-4 md:mr-1" />
                          <span className="hidden md:inline">Give Feedback</span>
                        </Button>
                      )}
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
                  </div>
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Feedback Dialog */}
      <Dialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Course Feedback</DialogTitle>
            <DialogDescription>
              Share your thoughts on {feedbackCourse?.course_name}. Your feedback helps us improve.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="rating">Rating</Label>
              <div className="flex items-center gap-1">
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
                        "h-6 w-6 transition-colors",
                        star <= feedbackRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      )}
                    />
                  </Button>
                ))}
                <span className="ml-2 text-sm font-medium text-gray-600">{feedbackRating}/5</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="comment">Comments</Label>
              <Textarea
                id="comment"
                placeholder="What did you like? What could be improved?"
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFeedbackDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitFeedback} disabled={submittingFeedback || !feedbackComment.trim()}>
              {submittingFeedback ? "Submitting..." : "Submit Feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
