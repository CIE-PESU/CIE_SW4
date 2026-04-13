"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Plus, Trash2, BookOpen, Calendar, Users, RefreshCw, List, X, Search, Filter, MessageSquare, Edit, Star, Sparkles, BrainCircuit, TrendingUp, TrendingDown, Minus, Lightbulb, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"

interface CourseUnit {
  id?: string
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
  status?: "not_started" | "ongoing" | "completed"
  requires_approval?: boolean
  enrollments?: any[]
}

interface ManageCoursesProps {
  facultyOnly?: boolean;
}

function FeedbackCard({ feedback }: { feedback: any }) {
  return (
    <Card className="overflow-hidden border-slate-200 dark:border-slate-700">
      <CardHeader className="p-4 pb-2 bg-slate-50/50 dark:bg-slate-800/20">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
              {feedback.student?.user?.name?.charAt(0) || 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {feedback.student?.user?.name}
                </p>
                {feedback.is_used ? (
                  <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-green-50 text-green-600 border-green-100 font-medium">Included in Summary</Badge>
                ) : (
                  <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-orange-50 text-orange-600 border-orange-100 font-bold animate-pulse">New / Unused</Badge>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Enrolled Student • {new Date(feedback.created_at).toLocaleDateString()} at {new Date(feedback.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="text-[10px] font-bold py-0 h-5 mb-1 bg-white">
              Unit {feedback.unit?.unit_number}
            </Badge>
            <div className="flex items-center justify-end">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star 
                  key={s} 
                  className={cn(
                    "h-3 w-3",
                    s <= (feedback.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                  )} 
                />
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="mb-2">
          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-tighter">
            {feedback.unit?.unit_name}
          </span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 italic">
          "{feedback.comment}"
        </p>
      </CardContent>
    </Card>
  );
}

export function ManageCourses({ facultyOnly }: ManageCoursesProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isUnitsSheetOpen, setIsUnitsSheetOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filter, setFilter] = useState("all")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null)
  const [isFeedbackSheetOpen, setIsFeedbackSheetOpen] = useState(false)
  const [courseFeedbacks, setCourseFeedbacks] = useState<any[]>([])
  const [selectedFeedbackUnitId, setSelectedFeedbackUnitId] = useState<string>("all")
  const [isFeedbacksLoading, setIsFeedbacksLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [isEnrollmentsSheetOpen, setIsEnrollmentsSheetOpen] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const [newCourse, setNewCourse] = useState({
    course_code: "",
    course_name: "",
    course_description: "",
    course_start_date: "",
    course_end_date: "",
    requires_approval: false,
  })

  const [courseUnits, setCourseUnits] = useState<CourseUnit[]>([
    {
      unit_number: 1,
      unit_name: "",
      unit_description: "",
      assignment_count: 0,
      hours_per_unit: 1,
    }
  ])

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editCourse, setEditCourse] = useState<Course | null>(null)
  const [editCourseUnits, setEditCourseUnits] = useState<CourseUnit[]>([])

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/courses", {
        headers: {
          "x-user-id": user?.id || "",
        },
      })
      const data = await response.json()
      let loadedCourses = data.courses || [];
      if (facultyOnly && user?.id) {
        loadedCourses = loadedCourses.filter((course: Course) => course.created_by === user.id)
      }
      setCourses(loadedCourses)
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

  const filteredCourses = courses.filter(
    (course) => {
      const matchesSearch =
        course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.course_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (course.creator?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      // Filter logic including 'My Courses'
      const matchesFilter = filter === "all" || (filter === "my_courses" && course.created_by === user?.id);
      return matchesSearch && matchesFilter;
    }
  )

  const handleAddCourse = async () => {
    if (!newCourse.course_code || !newCourse.course_name || !newCourse.course_description || !newCourse.course_start_date || !newCourse.course_end_date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    // Validate dates
    const startDate = new Date(newCourse.course_start_date)
    const endDate = new Date(newCourse.course_end_date)
    if (endDate <= startDate) {
      toast({
        title: "Error",
        description: "End date must be after start date",
        variant: "destructive",
      })
      return
    }

    // Validate course units
    const validUnits = courseUnits.filter(unit => 
      unit.unit_name.trim() !== "" && unit.unit_description.trim() !== ""
    )

    if (validUnits.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one course unit",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify({
          ...newCourse,
          course_units: validUnits
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCourses((prev) => [...prev, data.course])
        setNewCourse({
          course_code: "",
          course_name: "",
          course_description: "",
          course_start_date: "",
          course_end_date: "",
          requires_approval: false,
        })
        setCourseUnits([{
          unit_number: 1,
          unit_name: "",
          unit_description: "",
          assignment_count: 0,
          hours_per_unit: 1,
        }])
        setIsAddDialogOpen(false)

        toast({
          title: "Success",
          description: "Course added successfully",
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to add course")
      }
    } catch (error) {
      console.error("Error adding course:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add course",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCourse = async (courseId: string) => {
    try {
      const response = await fetch(`/api/courses?id=${courseId}`, {
        method: "DELETE",
        headers: {
          "x-user-id": user?.id || "",
        },
      })

      if (response.ok) {
        setCourses((prev) => prev.filter((course) => course.id !== courseId))
        toast({
          title: "Success",
          description: "Course deleted successfully",
        })
      } else {
        throw new Error("Failed to delete course")
      }
    } catch (error) {
      console.error("Error deleting course:", error)
      toast({
        title: "Error",
        description: "Failed to delete course",
        variant: "destructive",
      })
    }
  }

  const handleAddUnit = () => {
    setCourseUnits(prev => [
      ...prev,
      {
        unit_number: prev.length + 1,
        unit_name: "",
        unit_description: "",
        assignment_count: 0,
        hours_per_unit: 1,
      }
    ])
  }

  const handleRemoveUnit = (index: number) => {
    if (courseUnits.length > 1) {
      setCourseUnits(prev => prev.filter((_, i) => i !== index))
    }
  }

  const handleUnitChange = (index: number, field: keyof CourseUnit, value: any) => {
    setCourseUnits(prev => prev.map((unit, i) => 
      i === index ? { ...unit, [field]: value } : unit
    ))
  }

  const openUnitsSheet = (course: Course) => {
    setSelectedCourse(course)
    setIsUnitsSheetOpen(true)
  }

  const openEnrollmentsSheet = (course: Course) => {
    setSelectedCourse(course)
    setIsEnrollmentsSheetOpen(true)
  }

  const handleEnrollmentAction = async (enrollmentId: string, action: "ACCEPTED" | "REJECTED") => {
    try {
      const response = await fetch(`/api/enrollments/${enrollmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify({ status: action }),
      });
      if (response.ok) {
        toast({ title: "Success", description: `Enrollment ${action.toLowerCase()} successfully` });
        // Update local state temporarily for UX
        if (selectedCourse && selectedCourse.enrollments) {
           const updatedEnrollments = selectedCourse.enrollments.map((e: any) => 
               e.id === enrollmentId ? { ...e, status: action } : e
           );
           setSelectedCourse({ ...selectedCourse, enrollments: updatedEnrollments });
        }
        fetchCourses(); // Refetch to sync course_enrollments
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Action failed");
      }
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Action failed", variant: "destructive" });
    }
  }

  const openFeedbackSheet = async (course: Course, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedCourse(course)
    setSelectedFeedbackUnitId("all")
    setAiAnalysis(null)
    setIsFeedbackSheetOpen(true)
    fetchCourseFeedbacks(course.id, "all")
  }

  const analyzeWithAI = async () => {
    if (!courseFeedbacks.length || !user?.id || !selectedCourse) return;
    
    setIsAnalyzing(true);
    try {
      const context = selectedFeedbackUnitId === "all" 
        ? `the entire course: ${selectedCourse.course_name}`
        : `Unit ${selectedCourse.course_units?.find((u: any) => u.id === selectedFeedbackUnitId)?.unit_number || 'N/A'} of ${selectedCourse.course_name}`;

      const response = await fetch("/api/courses/feedback/analyze", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": user.id 
        },
        body: JSON.stringify({
          feedbacks: courseFeedbacks,
          context: context,
          courseId: selectedCourse.id,
          unitId: selectedFeedbackUnitId
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
        if (data.latestSummary) {
          setAiAnalysis(data.latestSummary)
        } else {
          setAiAnalysis(null)
        }
      } else {
        throw new Error(data.error || "Failed to fetch feedbacks")
      }
    } catch (error) {
      console.error("Error fetching feedbacks:", error)
      toast({
        title: "Error",
        description: "Failed to load feedback data",
        variant: "destructive",
      })
    } finally {
      setIsFeedbacksLoading(false)
    }
  }

  const openEditDialog = (course: Course) => {
    setEditCourse(course)
    setEditCourseUnits(course.course_units.map(unit => ({ ...unit })))
    setIsEditDialogOpen(true)
  }

  const handleEditCourse = async () => {
    if (!editCourse) return
    if (!editCourse.course_code || !editCourse.course_name || !editCourse.course_description || !editCourse.course_start_date || !editCourse.course_end_date) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" })
      return
    }
    const startDate = new Date(editCourse.course_start_date)
    const endDate = new Date(editCourse.course_end_date)
    if (endDate <= startDate) {
      toast({ title: "Error", description: "End date must be after start date", variant: "destructive" })
      return
    }
    const validUnits = editCourseUnits.filter(unit => unit.unit_name.trim() !== "" && unit.unit_description.trim() !== "")
    if (validUnits.length === 0) {
      toast({ title: "Error", description: "Please add at least one course unit", variant: "destructive" })
      return
    }
    try {
      const response = await fetch("/api/courses", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify({
          id: editCourse.id,
          course_code: editCourse.course_code,
          course_name: editCourse.course_name,
          course_description: editCourse.course_description,
          course_start_date: editCourse.course_start_date,
          course_end_date: editCourse.course_end_date,
          requires_approval: (editCourse as any).requires_approval,
          course_units: validUnits,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        setCourses(prev => prev.map(c => c.id === data.course.id ? data.course : c))
        setIsEditDialogOpen(false)
        setEditCourse(null)
        setEditCourseUnits([])
        toast({ title: "Success", description: "Course updated successfully" })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update course")
      }
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to update course", variant: "destructive" })
    }
  }

  // Add form validation check
  const isFormValid = useMemo(() => {
    // Check if course basic details are filled
    const courseDetailsValid = !!(
      newCourse.course_code?.trim() &&
      newCourse.course_name?.trim() &&
      newCourse.course_description?.trim() &&
      newCourse.course_start_date &&
      newCourse.course_end_date
    )

    // Check if dates are valid
    const datesValid = newCourse.course_start_date && newCourse.course_end_date &&
      new Date(newCourse.course_end_date) > new Date(newCourse.course_start_date)

    // Check if at least one valid course unit exists
    const validUnits = courseUnits.filter(unit => 
      unit.unit_name?.trim() && unit.unit_description?.trim()
    )
    const unitsValid = validUnits.length > 0

    return courseDetailsValid && datesValid && unitsValid
  }, [
    newCourse.course_code,
    newCourse.course_name, 
    newCourse.course_description,
    newCourse.course_start_date,
    newCourse.course_end_date,
    courseUnits
  ])

  // Add edit form validation check
  const isEditFormValid = useMemo(() => {
    if (!editCourse) return false

    // Check if course basic details are filled
    const courseDetailsValid = !!(
      editCourse.course_code?.trim() &&
      editCourse.course_name?.trim() &&
      editCourse.course_description?.trim() &&
      editCourse.course_start_date &&
      editCourse.course_end_date
    )

    // Check if dates are valid
    const datesValid = editCourse.course_start_date && editCourse.course_end_date &&
      new Date(editCourse.course_end_date) > new Date(editCourse.course_start_date)

    // Check if at least one valid course unit exists
    const validUnits = editCourseUnits.filter(unit => 
      unit.unit_name?.trim() && unit.unit_description?.trim()
    )
    const unitsValid = validUnits.length > 0

    return courseDetailsValid && datesValid && unitsValid
  }, [
    editCourse?.course_code,
    editCourse?.course_name, 
    editCourse?.course_description,
    editCourse?.course_start_date,
    editCourse?.course_end_date,
    editCourseUnits
  ])

  const getCourseStatus = (course: Course) => {
    const now = new Date();
    const start = new Date(course.course_start_date);
    const end = new Date(course.course_end_date);

    if (now < start) return { label: "Not Started", color: "bg-blue-500", text: "text-blue-500", light: "bg-blue-50" };
    if (now > end) return { label: "Completed", color: "bg-green-500", text: "text-green-500", light: "bg-green-50" };
    return { label: "Ongoing", color: "bg-orange-500", text: "text-orange-500", light: "bg-orange-50" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading course data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="admin-page-title">Course Management</h1>
        </div>
        <div className="flex space-x-2">
          <Button onClick={fetchCourses} variant="outline">
            <RefreshCw className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Refresh</span>
          </Button>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Add Course</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] w-[1100px] max-h-[90vh] h-[750px] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Add New Course</DialogTitle>
                <DialogDescription>
                  Create a new course with its units and details
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-y-auto">
                {/* Course Form */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Course Details</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="course_code">Course Code</Label>
                      <Input
                        id="course_code"
                        value={newCourse.course_code}
                        onChange={(e) => setNewCourse(prev => ({ ...prev, course_code: e.target.value.toUpperCase() }))}
                        placeholder="e.g. CS101"
                        maxLength={16}
                      />
                    </div>
                    <div>
                      <Label htmlFor="course_name">Course Name</Label>
                      <Input
                        id="course_name"
                        value={newCourse.course_name}
                        onChange={(e) => setNewCourse(prev => ({ ...prev, course_name: e.target.value }))}
                        placeholder="Enter course name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="course_description">Course Description</Label>
                      <Textarea
                        id="course_description"
                        value={newCourse.course_description}
                        onChange={(e) => setNewCourse(prev => ({ ...prev, course_description: e.target.value }))}
                        placeholder="Enter course description"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="course_start_date">Start Date</Label>
                        <Input
                          id="course_start_date"
                          type="date"
                          value={newCourse.course_start_date}
                          onChange={(e) => setNewCourse(prev => ({ ...prev, course_start_date: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="course_end_date">End Date</Label>
                        <Input
                          id="course_end_date"
                          type="date"
                          value={newCourse.course_end_date}
                          onChange={(e) => setNewCourse(prev => ({ ...prev, course_end_date: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-4 pt-2 border-t">
                      <input 
                        type="checkbox" 
                        id="requires_approval" 
                        checked={newCourse.requires_approval}
                        onChange={(e) => setNewCourse(prev => ({ ...prev, requires_approval: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Label htmlFor="requires_approval" className="cursor-pointer">Requires Faculty Approval for Enrollment</Label>
                    </div>
                  </div>
                </div>

                {/* Course Units Form */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Course Units</h3>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddUnit}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Unit
                    </Button>
                  </div>
                  
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {courseUnits.map((unit, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-medium">Unit {unit.unit_number}</h4>
                          {courseUnits.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveUnit(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor={`unit_name_${index}`}>Unit Name</Label>
                            <Input
                              id={`unit_name_${index}`}
                              value={unit.unit_name}
                              onChange={(e) => handleUnitChange(index, 'unit_name', e.target.value)}
                              placeholder="Enter unit name"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`unit_description_${index}`}>Unit Description</Label>
                            <Textarea
                              id={`unit_description_${index}`}
                              value={unit.unit_description}
                              onChange={(e) => handleUnitChange(index, 'unit_description', e.target.value)}
                              placeholder="Enter unit description"
                              rows={2}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`hours_per_unit_${index}`}>Duration (hours)</Label>
                              <Input
                                id={`hours_per_unit_${index}`}
                                type="number"
                                min="1"
                                value={unit.hours_per_unit}
                                onChange={(e) => handleUnitChange(index, 'hours_per_unit', parseInt(e.target.value) || 1)}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`assignment_count_${index}`}>Assignments</Label>
                              <Input
                                id={`assignment_count_${index}`}
                                type="number"
                                min="0"
                                value={unit.assignment_count}
                                onChange={(e) => handleUnitChange(index, 'assignment_count', parseInt(e.target.value) || 0)}
                              />
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="px-6">Cancel</Button>
                <Button 
                  onClick={handleAddCourse}
                  disabled={!isFormValid}
                  className={!isFormValid ? "opacity-50 cursor-not-allowed" : ""}
                >
                  Create Course
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
            onChange={e => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Courses</option>
            <option value="my_courses">My Courses</option>
          </select>
        </div>

        {/* Status Legend */}
        <div className="flex flex-wrap items-center gap-4 text-sm bg-gray-50 dark:bg-slate-800/50 px-4 py-2 rounded-lg border border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            <span className="text-gray-600 dark:text-gray-300">Not Started</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-orange-500"></div>
            <span className="text-gray-600 dark:text-gray-300">Ongoing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span className="text-gray-600 dark:text-gray-300">Completed</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredCourses.length === 0 ? (
          <Card className="col-span-2">
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No courses found</h3>
              <p className="text-gray-600 dark:text-gray-400">Create your first course to get started.</p>
            </CardContent>
          </Card>
        ) : (
          filteredCourses.map((course) => (
            <div 
              key={course.id} 
              className="admin-card rounded-xl shadow-sm border hover:shadow-md transition-shadow flex flex-col justify-between h-full cursor-pointer"
              onClick={() => {
                const selection = window.getSelection();
                if (selection && selection.toString().length > 0) return;
                openUnitsSheet(course);
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center space-x-2 min-w-0">
                    <BookOpen className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-xl font-bold text-gray-900 dark:text-white truncate">{course.course_name}</span>
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
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="space-y-2 mb-2">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700 dark:text-gray-300">
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <span>{new Date(course.course_start_date).toLocaleDateString()} - {new Date(course.course_end_date).toLocaleDateString()}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Users className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <span>{course.enrollments?.filter(e => e.status === "ACCEPTED").length || course.course_enrollments?.length || 0} enrolled ({(course.enrollments?.filter(e => e.status === "PENDING").length || 0)} pending)</span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-col mt-4 space-y-3">
                  <span className="text-xs text-gray-400">Created by: {course.creator?.name || 'Unknown User'}</span>
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(course);
                        }}
                      >
                        <Edit className="h-4 w-4 md:mr-1" />
                        <span className="hidden md:inline">Edit</span>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setCourseToDelete(course);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 md:mr-1" />
                        <span className="hidden md:inline">Delete</span>
                      </Button>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEnrollmentsSheet(course);
                        }}
                      >
                        <Users className="h-4 w-4 md:mr-1" />
                        <span className="hidden md:inline">Enrollments</span>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => openFeedbackSheet(course, e)}
                      >
                        <MessageSquare className="h-4 w-4 md:mr-1" />
                        <span className="hidden md:inline">Feedback</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </div>
          ))
        )}
      </div>

      {/* Enrollments Sheet */}
      <Sheet open={isEnrollmentsSheetOpen} onOpenChange={setIsEnrollmentsSheetOpen}>
        <SheetContent className="w-[400px]">
          <SheetHeader>
            <SheetTitle>Manage Enrollments</SheetTitle>
            <SheetDescription>
              {selectedCourse?.course_name}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {!selectedCourse?.enrollments || selectedCourse.enrollments.length === 0 ? (
              <p className="text-gray-500 text-center">No enrollments yet</p>
            ) : (
              selectedCourse.enrollments.map((enrollment: any) => (
                <Card key={enrollment.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{enrollment.student?.user?.name || "Unknown Student"}</h4>
                      <p className="text-sm text-gray-500">Status: <Badge variant="outline" className={cn({
                        "text-yellow-600 border-yellow-200 bg-yellow-50": enrollment.status === "PENDING",
                        "text-green-600 border-green-200 bg-green-50": enrollment.status === "ACCEPTED",
                        "text-red-600 border-red-200 bg-red-50": enrollment.status === "REJECTED",
                      })}>{enrollment.status}</Badge></p>
                    </div>
                  </div>
                  {enrollment.status === "PENDING" && (
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" onClick={() => handleEnrollmentAction(enrollment.id, "ACCEPTED")} className="w-full bg-green-600 hover:bg-green-700">Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => handleEnrollmentAction(enrollment.id, "REJECTED")} className="w-full text-red-600 hover:text-red-700 hover:bg-red-50">Reject</Button>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

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

      {/* Course Feedback Dialog */}
      <Dialog open={isFeedbackSheetOpen} onOpenChange={setIsFeedbackSheetOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Course Performance & Feedback</DialogTitle>
            <DialogDescription>
              Feedback for {selectedCourse?.course_name} ({selectedCourse?.course_code})
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 pb-4 border-b flex items-end gap-3">
            <div className="flex-1">
              <Label htmlFor="feedback_unit_filter" className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 block">
                Filter by Unit
              </Label>
              <select
                id="feedback_unit_filter"
                value={selectedFeedbackUnitId}
                onChange={(e) => {
                  setSelectedFeedbackUnitId(e.target.value);
                  setAiAnalysis(null);
                  if (selectedCourse) fetchCourseFeedbacks(selectedCourse.id, e.target.value);
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Overall Performance</option>
                {selectedCourse?.course_units?.map((unit) => (
                  <option key={unit.id || unit.unit_number} value={unit.id}>
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
                <p className="text-purple-700 font-bold">Brewing Deep Insights...</p>
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
                      {aiAnalysis.insights.map((insight: string, idx: number) => (
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
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : courseFeedbacks.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-slate-700">
                <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No feedback submitted yet</p>
                <p className="text-sm text-gray-400">Students will appear here once they give feedback.</p>
              </div>
            ) : (
              <div className="flex flex-col h-full max-h-[60vh]">
                <div className="flex items-center justify-between px-2 mb-4">
                  <span className="text-sm font-medium text-gray-500">{courseFeedbacks.length} Responses</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {(courseFeedbacks.reduce((acc, f: any) => acc + (f.rating || 0), 0) / courseFeedbacks.length).toFixed(1)}
                    </span>
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-gray-400">Average</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                  {/* New Feedbacks Group */}
                  {courseFeedbacks.filter((f: any) => !f.is_used).length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 px-2">
                        <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                        <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider">New Feedbacks ({courseFeedbacks.filter((f: any) => !f.is_used).length})</h3>
                      </div>
                      <div className="grid gap-4">
                        {courseFeedbacks.filter((f: any) => !f.is_used).map((feedback: any) => (
                          <FeedbackCard key={feedback.id} feedback={feedback} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Processed Feedbacks Group */}
                  {courseFeedbacks.filter((f: any) => f.is_used).length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 px-2 pt-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <h3 className="text-sm font-bold text-green-600 uppercase tracking-wider">Included in Summary ({courseFeedbacks.filter((f: any) => f.is_used).length})</h3>
                      </div>
                      <div className="grid gap-4 opacity-80">
                        {courseFeedbacks.filter((f: any) => f.is_used).map((feedback: any) => (
                          <FeedbackCard key={feedback.id} feedback={feedback} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions for Next Session Section */}
                  {courseFeedbacks.filter((f: any) => f.suggestions).length > 0 && (
                    <div className="space-y-4 mt-8 border-t pt-6">
                      <div className="flex items-center gap-2 px-2">
                        <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                          <MessageSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Suggestions for Next Session</h3>
                      </div>
                      <div className="grid gap-4">
                        {courseFeedbacks.filter((f: any) => f.suggestions).map((feedback: any) => (
                          <Card key={`suggestion-${feedback.id}`} className="p-4 border-blue-100 bg-blue-50/20 dark:bg-blue-900/10 dark:border-blue-800">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-bold text-gray-900 dark:text-white">{feedback.student?.user?.name || "Student"}</span>
                              <span className="text-[10px] text-gray-400">{new Date(feedback.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 italic whitespace-pre-wrap">
                              "{feedback.suggestions}"
                            </p>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Course Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>
              Update course details and units
            </DialogDescription>
          </DialogHeader>
          {editCourse && (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Course Form */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Course Details</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit_course_code">Course Code</Label>
                      <Input
                        id="edit_course_code"
                        value={editCourse.course_code}
                        onChange={e => setEditCourse(prev => prev ? { ...prev, course_code: e.target.value.toUpperCase() } : prev)}
                        maxLength={16}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_course_name">Course Name</Label>
                      <Input
                        id="edit_course_name"
                        value={editCourse.course_name}
                        onChange={e => setEditCourse(prev => prev ? { ...prev, course_name: e.target.value } : prev)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_course_description">Course Description</Label>
                      <Textarea
                        id="edit_course_description"
                        value={editCourse.course_description}
                        onChange={e => setEditCourse(prev => prev ? { ...prev, course_description: e.target.value } : prev)}
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit_course_start_date">Start Date</Label>
                        <Input
                          id="edit_course_start_date"
                          type="date"
                          value={editCourse.course_start_date}
                          onChange={e => setEditCourse(prev => prev ? { ...prev, course_start_date: e.target.value } : prev)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit_course_end_date">End Date</Label>
                        <Input
                          id="edit_course_end_date"
                          type="date"
                          value={editCourse.course_end_date}
                          onChange={e => setEditCourse(prev => prev ? { ...prev, course_end_date: e.target.value } : prev)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Course Units Form */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Course Units</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditCourseUnits(prev => [...prev, { unit_number: prev.length + 1, unit_name: "", unit_description: "", assignment_count: 0, hours_per_unit: 1 }])}>
                      <Plus className="h-4 w-4 mr-1" /> Add Unit
                    </Button>
                  </div>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {editCourseUnits.map((unit, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-medium">Unit {unit.unit_number}</h4>
                          {editCourseUnits.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => setEditCourseUnits(prev => prev.filter((_, i) => i !== index))}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor={`edit_unit_name_${index}`}>Unit Name</Label>
                            <Input id={`edit_unit_name_${index}`} value={unit.unit_name} onChange={e => setEditCourseUnits(prev => prev.map((u, i) => i === index ? { ...u, unit_name: e.target.value } : u))} />
                          </div>
                          <div>
                            <Label htmlFor={`edit_unit_description_${index}`}>Unit Description</Label>
                            <Textarea id={`edit_unit_description_${index}`} value={unit.unit_description} onChange={e => setEditCourseUnits(prev => prev.map((u, i) => i === index ? { ...u, unit_description: e.target.value } : u))} rows={2} />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`edit_hours_per_unit_${index}`}>Duration (hours)</Label>
                              <Input id={`edit_hours_per_unit_${index}`} type="number" min="1" value={unit.hours_per_unit} onChange={e => setEditCourseUnits(prev => prev.map((u, i) => i === index ? { ...u, hours_per_unit: parseInt(e.target.value) || 1 } : u))} />
                            </div>
                            <div>
                              <Label htmlFor={`edit_assignment_count_${index}`}>Assignments</Label>
                              <Input id={`edit_assignment_count_${index}`} type="number" min="0" value={unit.assignment_count} onChange={e => setEditCourseUnits(prev => prev.map((u, i) => i === index ? { ...u, assignment_count: parseInt(e.target.value) || 0 } : u))} />
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleEditCourse}
                  disabled={!isEditFormValid}
                  className={!isEditFormValid ? "opacity-50 cursor-not-allowed" : ""}
                >
                  Update Course
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Course Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delete Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this course?
            </DialogDescription>
          </DialogHeader>
          {courseToDelete && (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Course Form */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Course Details</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="delete_course_code">Course Code</Label>
                      <Input
                        id="delete_course_code"
                        value={courseToDelete.course_code}
                        disabled
                      />
                    </div>
                    <div>
                      <Label htmlFor="delete_course_name">Course Name</Label>
                      <Input
                        id="delete_course_name"
                        value={courseToDelete.course_name}
                        disabled
                      />
                    </div>
                    <div>
                      <Label htmlFor="delete_course_description">Course Description</Label>
                      <Textarea
                        id="delete_course_description"
                        value={courseToDelete.course_description}
                        disabled
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="delete_course_start_date">Start Date</Label>
                        <Input
                          id="delete_course_start_date"
                          type="date"
                          value={courseToDelete.course_start_date}
                          disabled
                        />
                      </div>
                      <div>
                        <Label htmlFor="delete_course_end_date">End Date</Label>
                        <Input
                          id="delete_course_end_date"
                          type="date"
                          value={courseToDelete.course_end_date}
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={() => {
                  handleDeleteCourse(courseToDelete.id)
                  setIsDeleteDialogOpen(false)
                }}>Delete Course</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
