"use client"

import type React from "react"
import type { ReactNode } from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  GraduationCap,
  LogOut,
  Menu,
  ChevronLeft,
  User,
  Mail,
  BadgeIcon as IdCard,
  Users,
  BookOpen,
  Phone,
  MapPin,
  Calendar,
  Moon,
  Sun,
  Bell,
  BarChart3,
  Award,
  Briefcase,
  Wrench,
  FolderOpen,
  ClipboardCheck,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { useTheme } from 'next-themes'
import { NotificationDropdown } from "@/components/ui/notification-dropdown"
import { useNotifications } from "@/components/notification-provider"
import { Navbar } from "@/components/navbar"

interface DashboardLayoutProps {
  children: ReactNode
  currentPage: string
  onPageChange: (page: string) => void
  menuItems: Array<{
    id: string
    label: string
    icon: React.ComponentType<any>
    disabled?: boolean
  }>
}

// Profile data interfaces
interface BaseProfileData {
  name: string
  email: string
  id: string
  role: string
  phone: string | undefined
  join_date: string | Date
}

interface AdminProfileData extends BaseProfileData {
  role: "admin"
  department: string
  office: string
  permissions: string[]
  working_hours: string
}

interface FacultyProfileData extends BaseProfileData {
  role: "faculty"
  department: string
  office: string
  assigned_courses: string[]
  specialization: string
  office_hours: string
}

interface ProfessorProfileData extends BaseProfileData {
  role: "professor"
  department: string
  office: string
  assigned_courses: string[]
  specialization: string
  office_hours: string
}

interface StudentProfileData extends BaseProfileData {
  role: "student"
  student_id: string
  program: string
  year: string
  section: string
  gpa: string
  advisor: string
}

type ProfileData = AdminProfileData | FacultyProfileData | ProfessorProfileData | StudentProfileData

// Type guards
function isAdminProfile(data: ProfileData): data is AdminProfileData {
  return data.role === "admin"
}

function isFacultyProfile(data: ProfileData): data is FacultyProfileData {
  return data.role === "faculty"
}

function isProfessorProfile(data: ProfileData): data is ProfessorProfileData {
  return data.role === "professor"
}

function isStudentProfile(data: ProfileData): data is StudentProfileData {
  return data.role === "student"
}

export function DashboardLayout({ children, currentPage, onPageChange, menuItems }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { theme, setTheme } = useTheme()
  const { activities, unreadActivities, loading } = useNotifications()

  // Only disable scrolling for dashboard home pages (case-insensitive)
  const isDashboardHome = ["home", "dashboard"].includes(currentPage.toLowerCase());

  const sidebarWidth = sidebarCollapsed ? "lg:w-16 w-64" : "w-64"
  const mainMargin = sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"

  const getRoleColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-100 text-red-800"
      case "FACULTY":
        return "bg-blue-100 text-blue-800"
      case "PROFESSOR":
        return "bg-purple-100 text-purple-800"
      case "STUDENT":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Hardcoded profile data based on user role
  const getProfileData = (): ProfileData | null => {
    if (!user) return null

    const baseData = {
      name: user.name,
      email: user.email,
      id: user.id,
      phone: user.phone,
      join_date: user.join_date,
    }

    switch (user.role) {
      case "ADMIN":
        return {
          ...baseData,
          role: "admin" as const,
          department: "Administration",
          office: "Admin Building, Room 101",
          permissions: ["Full System Access", "User Management", "System Configuration"],
          working_hours: "9:00 AM - 5:00 PM",
        }
      case "FACULTY":
        return {
          ...baseData,
          role: "faculty" as const,
          department: "Computer Science",
          office: "Engineering Building, Room 205",
          assigned_courses: ["CS101 - Intro to Programming", "CS201 - Data Structures", "CS301 - Algorithms"],
          specialization: "Software Engineering",
          office_hours: "Mon-Wed-Fri: 2:00 PM - 4:00 PM",
        }
      case "STUDENT":
        return {
          ...baseData,
          role: "student" as const,
          student_id: "STU2024001",
          program: "Bachelor of Computer Science",
          year: "3rd Year",
          section: "Section A",
          gpa: "3.85",
          advisor: "Dr. John Smith",
        }
      default:
        return {
          ...baseData,
          role: "student" as const,
          student_id: "STU2024001",
          program: "Bachelor of Computer Science",
          year: "3rd Year",
          section: "Section A",
          gpa: "3.85",
          advisor: "Dr. John Smith",
        }
    }
  }

  const profileData = getProfileData()

  // Get role-specific quick actions
  const getQuickActions = () => {
    if (!user) return []
    
    switch (user.role) {
      case "ADMIN":
        return [
          { id: "domains", label: "Coordinators", icon: Award },
          { id: "faculty", label: "Faculty", icon: Briefcase },
          { id: "students", label: "Students", icon: Users },
          { id: "locations", label: "Room Bookings", icon: MapPin },
        ]
      case "FACULTY":
        return [
          { id: "coordinator", label: "CIE Coordinator", icon: Award },
          { id: "projects", label: "Projects", icon: FolderOpen },
          { id: "locations", label: "Book Room", icon: MapPin },
          { id: "lab-components", label: "Lab Components", icon: Wrench },
          { id: "library", label: "Library", icon: BookOpen },
        ]
      case "STUDENT":
        return [
          { id: "projects", label: "Projects", icon: FolderOpen },
          { id: "lab-components", label: "Lab Components", icon: Wrench },
          { id: "library", label: "Library", icon: BookOpen },
          { id: "attendance", label: "Attendance", icon: ClipboardCheck },
        ]
      default:
        return []
    }
  }

  const quickActions = getQuickActions()

  const handleSignOut = () => {
    logout()
  }

  return (
    <div className={cn("min-h-screen bg-white dark:bg-dark5 dark:text-dark1", isDashboardHome ? "overflow-hidden" : "overflow-auto") }>
      <Navbar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        sidebarCollapsed={sidebarCollapsed} 
        onPageChange={onPageChange} 
      />

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-[55px] bottom-0 left-0 z-40 transform transition-all duration-300 ease-in-out lg:translate-x-0 rounded-r-2xl overflow-hidden shadow-2xl backdrop-blur-lg",
          sidebarWidth,
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "bg-[rgba(255,255,255,0.65)] dark:bg-[rgba(17,17,17,0.8)] text-sidebar-foreground"
        )}
        style={{
          boxShadow: '4px 0 15px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div className="flex flex-col h-full">

          {/* Navigation with animated items */}
          <nav className={cn("flex-1 py-4 space-y-1 overflow-y-auto", sidebarCollapsed ? "lg:px-1 px-2" : "px-2")}>
            {menuItems.map((item, index) => (
              <div 
                key={item.id}
                className={cn("py-1 group", sidebarCollapsed ? "lg:px-0 px-2" : "px-2")}
                style={{
                  animation: `fadeIn 0.3s ease-out ${index * 0.05}s forwards`,
                  opacity: 0,
                  transform: 'translateX(-10px)'
                }}
              >
                <button
                  className={cn(
                    "flex items-center transition-all duration-200 rounded-lg overflow-hidden h-11",
                    sidebarCollapsed 
                      ? "lg:aspect-square lg:h-11 lg:w-11 lg:justify-center lg:mx-auto w-full p-3 px-4 mx-1" 
                      : "w-full p-3 px-4 mx-1",
                    item.disabled 
                      ? "text-gray-400 cursor-not-allowed opacity-50" 
                      : currentPage === item.id
                        ? "bg-indigo-200 text-indigo-800 font-medium shadow-sm transform hover:scale-105 focus:scale-105"
                        : "text-gray-800 hover:bg-blue-100 hover:text-indigo-800 dark:text-dark1 transform hover:scale-105 focus:scale-105"
                  )}
                  onClick={() => {
                    if (!item.disabled) {
                      onPageChange(item.id)
                      setSidebarOpen(false)
                    }
                  }}
                  title={sidebarCollapsed ? item.label : undefined}
                  disabled={item.disabled}
                >
                  <item.icon 
                    className={cn(
                      "h-5 w-5 aspect-square transition-transform duration-300 flex-shrink-0",
                      sidebarCollapsed ? "lg:mr-0 mr-3" : "mr-3",
                      item.disabled 
                        ? "text-gray-400" 
                        : currentPage === item.id 
                          ? "text-blue-600" 
                          : "text-gray-600 dark:text-dark1"
                    )} 
                  />
                  <span className={cn(
                    "text-sm font-medium whitespace-nowrap truncate transition-all duration-300",
                    sidebarCollapsed && "lg:opacity-0 lg:w-0 lg:hidden"
                  )}>
                    {item.label}
                  </span>
                </button>
              </div>
            ))}
          </nav>

          {/* Add keyframe animations */}
          <style jsx global>{`
            @keyframes fadeIn {
              to {
                opacity: 1;
                transform: translateX(0);
              }
            }
          `}</style>

          {/* Bottom navigation items */}
          <div className="px-2 py-1 mt-auto">
            {/* Bottom navigation items removed */}
          </div>

          {/* Collapse button */}
          <div className="hidden lg:block mx-3 py-2 border-t border-gray-200/60 dark:border-gray-800/60">
            <button
              className={cn(
                "flex items-center text-gray-800 dark:text-dark1 hover:bg-blue-100 hover:text-indigo-800 transition-all duration-200 rounded-lg overflow-hidden transform hover:scale-105 focus:scale-105 h-11",
                sidebarCollapsed 
                  ? "lg:aspect-square lg:h-11 lg:w-11 lg:justify-center lg:mx-auto w-full p-3 px-4" 
                  : "w-full p-2 px-3 mx-1"
              )}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <ChevronLeft
                className={cn(
                  "h-5 w-5 aspect-square transition-transform duration-300 flex-shrink-0",
                  sidebarCollapsed ? "rotate-180" : "",
                  !sidebarCollapsed && "mr-3"
                )}
              />
              {!sidebarCollapsed && (
                <span className="text-sm font-medium transition-opacity duration-300 whitespace-nowrap truncate">
                  Collapse
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={cn("transition-all duration-300 ease-in-out", isDashboardHome ? "overflow-hidden" : "overflow-auto", mainMargin)}>
        <div className={cn("pt-16", isDashboardHome ? "overflow-hidden" : "overflow-auto") }>
          <div className={cn("p-4 lg:p-8 rounded-tl-2xl min-h-[calc(100vh-4rem)]", isDashboardHome ? "overflow-hidden" : "overflow-auto") }>
            {children}
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
