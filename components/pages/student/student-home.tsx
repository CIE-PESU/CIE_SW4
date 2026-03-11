"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth-provider"
import { BookOpen, FolderOpen, ClipboardCheck, Clock, Calendar, MapPin, Wrench, Briefcase } from "lucide-react"
import { useRef, useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { TodoList } from '@/components/ui/todo-list'
import { useToast } from '@/hooks/use-toast'
import { User } from 'lucide-react'

interface StudentHomeProps {
  onPageChange?: (page: string) => void
}

export function StudentHome({ onPageChange }: StudentHomeProps) {
  const { user } = useAuth()
  const { theme } = useTheme();
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) return
      
      try {
        const response = await fetch('/api/dashboard/student', {
          headers: {
            'x-user-id': user.id
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setDashboardData(data)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
        setDashboardData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user?.id])

  const stats = dashboardData ? [
    {
      title: "Projects",
      value: (dashboardData.stats.activeProjects || 0).toString(),
      description: "Enrolled projects",
      icon: FolderOpen,
      color: "text-green-600",
    },
    {
      title: "Attendance Rate",
      value: dashboardData.stats.attendanceRate !== null ? `${dashboardData.stats.attendanceRate}%` : "N/A",
      description: "This semester",
      icon: ClipboardCheck,
      color: "text-purple-600",
    },
    {
      title: "Courses",
      value: (dashboardData.stats.courses || 0).toString(),
      description: "Available courses",
      icon: BookOpen,
      color: "text-blue-600",
    },
    {
      title: "Lab Components",
      value: (dashboardData.stats.labComponents || 0).toString(),
      description: "Available components",
      icon: Wrench,
      color: "text-orange-600",
    },
    {
      title: "Library Books",
      value: (dashboardData.stats.libraryBooks || 0).toString(),
      description: "Available books",
      icon: BookOpen,
      color: "text-indigo-600",
    },
    {
      title: "Opportunities",
      value: (dashboardData.stats.opportunities || 0).toString(),
      description: "Available opportunities",
      icon: Briefcase,
      color: "text-pink-600",
    },
  ] : []



  const quickActionsRef = useRef<HTMLDivElement>(null);
  const [highlightQuickActions, setHighlightQuickActions] = useState(false);
  const handleQuickActionsClick = () => {
    quickActionsRef.current?.scrollIntoView({ behavior: 'smooth' });
    setHighlightQuickActions(true);
    setTimeout(() => setHighlightQuickActions(false), 1000);
  };

  // Class schedule logic (today's classes)
  const [todaySchedules, setTodaySchedules] = useState<any[]>([]);
  useEffect(() => {
    const fetchTodaySchedules = async () => {
      if (!user?.id) return;
      try {
        const response = await fetch(`/api/class-schedules?studentId=${user.student_id}`);
        if (!response.ok) throw new Error('Failed to fetch schedules');
        const data = await response.json();
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const today = new Date();
        const currentDay = daysOfWeek[today.getDay()];
        setTodaySchedules((data.schedules || []).filter((s: any) => s.day_of_week === currentDay));
      } catch (e) {
        setTodaySchedules([]);
      }
    };
    fetchTodaySchedules();
  }, [user?.id]);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = Number.parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-6 min-h-screen">
      {/* Hero Section - match admin dashboard style */}
      <div className="rounded-lg shadow-2xl p-4 min-h-[100px] flex flex-col md:flex-row items-center justify-between relative overflow-hidden mb-0" style={{ background: "linear-gradient(135deg, #34305E 0%, #3999C2 40%, #56A3C2 58%, #76ABC1 72%, #98ADB1 84%, #C49B86 94%, #E75A2D 100%)" }}>
        <div className="flex-1 z-6">
          <span className="text-white text-2xl font-extrabold tracking-tight">CIE Student Portal</span>
          <h2 className="text-3xl md:text-3xl font-extrabold text-white mb-2 mt-2">Empower your learning journey!</h2>
          <p className="text-white/90 mb-4 max-w-2xl text-lg">Access your courses, track your progress, and manage your projects—all in one place.</p>
        </div>
      </div>

      {/* Stats Section - 6 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow animate-pulse" style={theme === 'light' ? { background: '#e3f0ff' } : {}}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </CardContent>
            </Card>
          ))
        ) : (
          stats.map((stat, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow transform hover:scale-105 focus:scale-105 transition-transform duration-200" style={theme === 'light' ? { background: '#e3f0ff' } : {}}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="lg:col-span-1 h-full">
          <TodoList role="student" />
        </div>
        <div className="lg:col-span-1 h-full">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Today's Class Schedule</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todaySchedules.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No classes today</p>
                  <p className="text-xs mt-1">Enjoy your free day!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todaySchedules.map((schedule, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div>
                        <h3 className="font-medium">{schedule.course.course_id}</h3>
                        <p className="text-sm text-gray-600">{schedule.course.course_name}</p>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <User className="h-3 w-3 mr-1" />
                          {schedule.faculty?.user?.name}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</p>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          {schedule.room}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
