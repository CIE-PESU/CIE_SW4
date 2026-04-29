"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Home, Users, User as UserIcon, BookOpen, Wrench, MapPin, Calendar, Building, Briefcase, Award, FolderOpen, GraduationCap } from "lucide-react"
import { AdminHome } from "@/components/pages/admin/admin-home"
import ManageUsers from "@/components/pages/admin/manage-users"
import { ManageFaculty } from "@/components/pages/admin/manage-faculty"
import { ManageStudents } from "@/components/pages/admin/manage-students"
import { ManageCourses } from "@/components/pages/admin/manage-courses"
import { ManageLabComponents } from "@/components/pages/admin/manage-lab-components"
import { ManageLocations } from "@/components/pages/admin/manage-locations"
import { ManageClassSchedules } from "@/components/pages/admin/manage-class-schedules"
import { UserProfile } from "@/components/common/user-profile"
import { ManageLibrary } from "@/components/pages/admin/manage-library"
import { ManageDomains } from "@/components/pages/admin/manage-domains"
import ManageOpportunity from '@/components/pages/admin/manage-opportunity';
import { ManageProjects } from "@/components/pages/admin/manage-projects";
import { ManagePrograms } from "@/components/pages/admin/manage-programs";
import { NotificationsPage } from "@/components/pages/common/notifications-page"

const menuItems = [
  { id: "home", label: "Dashboard", icon: Home },
  { id: "domains", label: "Coordinators", icon: Award },
  { id: "users", label: "Users", icon: Users },
  { id: "faculty", label: "Faculty", icon: Briefcase },
  { id: "students", label: "Students", icon: Users },
  { id: "courses", label: "Courses", icon: BookOpen },
  { id: "locations", label: "Room Bookings", icon: MapPin },
  { id: "lab-components", label: "Lab Components", icon: Wrench },
  { id: "library", label: "Library", icon: BookOpen },
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "programs", label: "Programs", icon: GraduationCap },
  { id: "opportunities", label: "Opportunities", icon: Briefcase },
  { id: "schedules", label: "Class Schedules", icon: Calendar, disabled: true },
]

function AdminDashboardContent() {
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
        return <AdminHome onPageChange={setCurrentPage} />
      case "users":
        return <ManageUsers />
      case "domains":
        return <ManageDomains />
      case "faculty":
        return <ManageFaculty />
      case "students":
        return <ManageStudents />
      case "courses":
        return <ManageCourses />
      case "schedules":
        return <ManageClassSchedules />
      case "locations":
        return <ManageLocations />
      case "lab-components":
        return <ManageLabComponents />
      case "profile":
        return <UserProfile />
      case "library":
        return <ManageLibrary />
      case "projects":
        return <ManageProjects />
      case "programs":
        return <ManagePrograms />
      case "opportunities":
        return <ManageOpportunity />
      case "notifications":
        return <NotificationsPage />
      default:
        return <AdminHome onPageChange={setCurrentPage} />
    }
  }

  return (
    <DashboardLayout currentPage={currentPage} onPageChange={setCurrentPage} menuItems={menuItems}>
      {renderPage()}
    </DashboardLayout>
  )
}

export function AdminDashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
      <AdminDashboardContent />
    </Suspense>
  )
}
