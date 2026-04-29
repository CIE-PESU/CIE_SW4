"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Home, Users, User as UserIcon, MapPin, Calendar, FolderOpen, ClipboardCheck, Wrench, BookOpen, Settings, Award, Briefcase, BarChart3, GraduationCap } from "lucide-react"
import { FacultyHome } from "@/components/pages/faculty/faculty-home"
import { LabComponentsManagement } from "@/components/pages/faculty/lab-components-management"
import { LabComponentsRequest } from "@/components/pages/faculty/lab-components-request"
import { FacultyCalendar } from "@/components/pages/faculty/faculty-calendar"
import { FacultyViewCourses } from "@/components/pages/faculty/view-courses"
import { ProjectManagement } from "@/components/pages/faculty/project-management"
import { AttendanceManagement } from "@/components/pages/faculty/attendance-management"
import { LocationBooking } from "@/components/pages/faculty/location-booking"
import { UserProfile } from "@/components/common/user-profile"
import { LibraryDashboard } from "@/components/pages/common/library-dashboard"
import { CoordinatorDashboard } from "@/components/pages/faculty/coordinator-dashboard"
import { ManagePrograms } from "@/components/pages/admin/manage-programs"
import { useAuth } from "@/components/auth-provider"
import FacultyOpportunity from '@/components/pages/faculty/faculty-opportunity';
import FacultyFeedbacks from '@/components/pages/faculty/feedbacks';
import { NotificationsPage } from "@/components/pages/common/notifications-page"

function FacultyDashboardContent() {
  const searchParams = useSearchParams()
  const initialPage = searchParams?.get("page") || "home"
  const { user } = useAuth()
  const [currentPage, setCurrentPage] = useState(initialPage)

  useEffect(() => {
    const page = searchParams?.get("page")
    if (page) {
      setCurrentPage(page)
    }
  }, [searchParams])
  const [isCoordinator, setIsCoordinator] = useState(false)
  const [isLabCoordinator, setIsLabCoordinator] = useState(false)

  useEffect(() => {
    // Check if this faculty member is assigned as a coordinator
    const checkCoordinatorStatus = async () => {
      if (user?.id) {
        try {
          const response = await fetch(`/api/coordinators/check`, {
            headers: { "x-user-id": user.id }
          })
          const data = await response.json()
          setIsCoordinator(data.isCoordinator || false)
          // Check for lab domain (case-insensitive)
          const labDomain = data.assignedDomains?.find((d: any) => d.name?.toLowerCase().includes("lab"))
          setIsLabCoordinator(!!labDomain && labDomain.name.toLowerCase().includes("lab"))
        } catch (error) {
          console.error("Error checking coordinator status:", error)
        }
      }
    }

    checkCoordinatorStatus()
  }, [user])

  const getMenuItems = () => {
    const baseItems = [
      { id: "home", label: "Dashboard", icon: Home },
      { id: "courses", label: "Courses", icon: Users },
      { id: "locations", label: "Book Rooms", icon: MapPin },

      { id: "projects", label: "Projects", icon: FolderOpen },
      { id: "programs", label: "Programs", icon: GraduationCap },
      { id: "lab-components", label: "Lab Components", icon: Wrench },
      { id: "library", label: "Library", icon: BookOpen },
      { id: "opportunities", label: "Opportunities", icon: Briefcase }, // Added
      { id: "feedbacks", label: "Feedbacks", icon: BarChart3 }, // Add Feedbacks
      { id: "attendance", label: "Attendance", icon: ClipboardCheck, disabled: true },
      { id: "calendar", label: "Calendar", icon: Calendar, disabled: true },
    ]

    // Add CIE Coordinator section if user is a coordinator
    if (isCoordinator) {
      baseItems.splice(1, 0, { id: "coordinator", label: "CIE Coordinator", icon: Award })
    }

    // Remove Lab Management if present (ensure it is not in the sidebar)
    return baseItems.filter(item => item.id !== "lab-management")
  }

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <FacultyHome onPageChange={setCurrentPage} />
      case "coordinator":
        return isCoordinator ? <CoordinatorDashboard /> : <FacultyHome onPageChange={setCurrentPage} />
      case "lab-management":
        return isLabCoordinator ? <LabComponentsManagement /> : <FacultyHome onPageChange={setCurrentPage} />
      case "courses":
        return <FacultyViewCourses />
      case "locations":
        return <LocationBooking />
      case "calendar":
        return <FacultyCalendar />
      case "projects":
        return <ProjectManagement />
      case "programs":
        return <ManagePrograms />
      case "attendance":
        return <AttendanceManagement />
      case "lab-components":
        return <LabComponentsRequest />
      case "profile":
        return <UserProfile />
      case "library":
        return <LibraryDashboard />
      case "opportunities":
        return <FacultyOpportunity />
      case "feedbacks":
        return <FacultyFeedbacks />;
      case "notifications":
        return <NotificationsPage />
      default:
        return <FacultyHome onPageChange={setCurrentPage} />
    }
  }

  return (
    <DashboardLayout currentPage={currentPage} onPageChange={setCurrentPage} menuItems={getMenuItems()}>
      {renderPage()}
    </DashboardLayout>
  )
}

export function FacultyDashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <FacultyDashboardContent />
    </Suspense>
  )
}
