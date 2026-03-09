"use client"

import type React from "react"
import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Menu, LogOut, User, Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from 'next-themes'
import { NotificationDropdown } from "@/components/ui/notification-dropdown"
import { useNotifications } from "@/components/notification-provider"

interface NavbarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  sidebarCollapsed: boolean
  onPageChange: (page: string) => void
}

export function Navbar({ sidebarOpen, setSidebarOpen, sidebarCollapsed, onPageChange }: NavbarProps) {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { activities, loading } = useNotifications()

  const handleSignOut = () => {
    logout()
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 w-full h-[55px] backdrop-blur-lg 
      bg-gradient-to-r from-[rgba(255,255,255,0.6)] via-[rgba(181,210,248,0.6)] to-[rgba(142,192,252,0.6)] 
      dark:from-[rgba(0,0,0,0.6)] dark:via-[rgba(20,32,43,0.6)] dark:to-[rgba(9,56,114,0.6)] 
      z-50 transition-all duration-300"
    >
      <div className="flex items-center justify-between h-full pl-1 pr-4">
        {/* Left side: Logo & Mobile menu button */}
        <div className="flex items-center space-x-2 h-full">
          <div className="lg:hidden">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="h-8 w-8 ml-1 text-slate-700 dark:text-slate-400 hover:bg-transparent hover:text-blue-500 dark:hover:text-white transition-colors duration-200"
            >
              <Menu/>
            </Button>
          </div>

          {/* Logo */}
          <div
            className="cursor-pointer flex items-center h-full p-2"
            onClick={() => onPageChange('home')}
            title="Go to Dashboard"
          >
            <img
              src="/logo.png"
              alt="CIE Logo"
              className="h-full w-auto object-contain"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end flex-1">
          {/* Dark mode toggle button */}
          <Button
            className="text-slate-700 dark:text-slate-400 hover:bg-transparent hover:text-blue-500 dark:hover:text-white transition-colors duration-200"
            variant="ghost"
            size="icon"
            aria-label="Toggle dark mode"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun/> : <Moon/>}
          </Button>

          <NotificationDropdown activities={activities} loading={loading} onPageChange={onPageChange} />

          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 pl-3 pr-1 rounded-full flex items-center space-x-2 hover:bg-sky-100 dark:hover:bg-sky-700">
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <p className="font-medium text-slate-800 dark:text-slate-100 text-sm">{user?.name}</p>
                    <p className="text-xs leading-none text-slate-600 dark:text-slate-300">
                      {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase() : ''}
                    </p>
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user?.role === 'FACULTY' && (user as any)?.profileData?.faculty_id ? `/profile-img/${(user as any).profileData.faculty_id}.jpg` : undefined}
                      alt={user?.name || 'User avatar'}
                      onError={(e) => {
                        // Try different extensions if jpg fails
                        const currentSrc = e.currentTarget.src;
                        if (currentSrc.includes('.jpg')) {
                          e.currentTarget.src = currentSrc.replace('.jpg', '.jpeg');
                        } else if (currentSrc.includes('.jpeg')) {
                          e.currentTarget.src = currentSrc.replace('.jpeg', '.png');
                        }
                      }}
                    />
                    <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold text-sm">
                      {user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" forceMount>
              <DropdownMenuItem onClick={() => onPageChange('profile')} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Sign Out Button */}
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span className="font-medium">Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
