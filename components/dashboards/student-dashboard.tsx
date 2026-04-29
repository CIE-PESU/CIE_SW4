"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Home, User as UserIcon, MapPin, Calendar, BookOpen, FolderOpen, ClipboardCheck, Wrench, Moon, Sun, History, Briefcase, GraduationCap } from "lucide-react"
import { StudentHome } from "@/components/pages/student/student-home"
import { StudentCalendar } from "@/components/pages/student/student-calendar"
import { LabComponentsRequest } from "@/components/pages/student/lab-components-request"
import { ViewCourses } from "@/components/pages/student/view-courses"
import { ViewProjects } from "@/components/pages/student/view-projects"
import { ViewAttendance } from "@/components/pages/student/view-attendance"
import { UserProfile } from "@/components/common/user-profile"
import { LibraryDashboard } from "@/components/pages/common/library-dashboard"
import { StudentRequestHistory } from "@/components/pages/student/request-history"
import StudentOpportunity from '@/components/pages/student/student-opportunity';
import { ViewPrograms } from "@/components/pages/student/view-programs";
import { NotificationsPage } from "@/components/pages/common/notifications-page"

const menuItems = [
  { id: "home", label: "Dashboard", icon: Home },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "courses", label: "Courses", icon: BookOpen },
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "programs", label: "Programs", icon: GraduationCap },
  { id: "lab-components", label: "Lab Components", icon: Wrench },
  { id: "library", label: "Library", icon: BookOpen },
  { id: "opportunities", label: "Opportunities", icon: Briefcase },
  { id: "attendance", label: "Attendance", icon: ClipboardCheck, disabled: true },
  { id: "locations", label: "Class Locations", icon: MapPin, disabled: true },
]

function StudentDashboardContent() {
  const searchParams = useSearchParams()
  const initialPage = searchParams?.get("page") || "home"
  const [currentPage, setCurrentPage] = useState(initialPage)

  useEffect(() => {
    const page = searchParams?.get("page")
    if (page) {
      setCurrentPage(page)
    }
  }, [searchParams])

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <StudentHome onPageChange={setCurrentPage} />
      case "request-history":
        return <StudentRequestHistory />
      case "locations":
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold">Class Locations</h2>
            <p className="text-gray-600 mt-2">Coming soon...</p>
          </div>
        )
      case "calendar":
        return <StudentCalendar />
      case "courses":
        return <ViewCourses />
      case "projects":
        return <ViewProjects />
      case "programs":
        return <ViewPrograms />
      case "attendance":
        return <ViewAttendance />
      case "lab-components":
        return <LabComponentsRequest />
      case "profile":
        return <UserProfile />
      case "library":
        return <LibraryDashboard />
      case "opportunities":
        return <StudentOpportunity />
      case "notifications":
        return <NotificationsPage />
      default:
        return <StudentHome onPageChange={setCurrentPage} />
    }
  }

  return (
    <DashboardLayout currentPage={currentPage} onPageChange={setCurrentPage} menuItems={menuItems}>
      {renderPage()}
    </DashboardLayout>
  )
}

export function StudentDashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <StudentDashboardContent />
    </Suspense>
  )
}
