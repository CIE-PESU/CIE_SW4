"use client"

import * as React from "react"
import { useAuth } from "./auth-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { LoginSideCard } from "./login-sidecard";

// Inline Icons implementation
const Icons = {
  logo: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img
      src="/cie_logo_dark.png"
      alt="Logo"
      className="h-16 w-auto"
      {...props}
    />
  ),
  spinner: Loader2
}

export function LoginForm() {
  const [mode, setMode] = React.useState<"login" | "register">("login")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [name, setName] = React.useState("")
  const [role, setRole] = React.useState<"STUDENT" | "FACULTY">("STUDENT")
  const [phone, setPhone] = React.useState("")
  
  // Student fields
  const [studentId, setStudentId] = React.useState("")
  const [program, setProgram] = React.useState("")
  const [year, setYear] = React.useState("")
  const [section, setSection] = React.useState("")
  
  // Faculty fields
  const [facultyId, setFacultyId] = React.useState("")
  const [department, setDepartment] = React.useState("")
  const [office, setOffice] = React.useState("")
  const [specialization, setSpecialization] = React.useState("")
  const [officeHours, setOfficeHours] = React.useState("")

  const [error, setError] = React.useState("")
  const [success, setSuccess] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const { login } = useAuth()

  async function onLogin(event: React.SyntheticEvent) {
    event.preventDefault()
    setIsLoading(true)
    setError("")

    const success = await login(email, password)
    if (!success) {
      setError("Invalid email or password")
    }

    setIsLoading(false)
  }

  async function onRegister(event: React.SyntheticEvent) {
    event.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    const roleData = role === "STUDENT" 
      ? { studentId, program, year, section }
      : { facultyId, department, office, specialization, officeHours }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, role, phone, ...roleData })
      })

      const data = await response.json()
      if (response.ok) {
        setSuccess("Registration successful! You can now log in.")
        setMode("login")
        // Clear registration fields
        setName("")
        setPassword("")
      } else {
        setError(data.error || "Registration failed")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="dark min-h-screen flex items-center justify-center relative overflow-hidden">
      <video
        src="/login_background_animation.mp4"
        className="absolute inset-0 w-full h-full object-cover z-0"
        autoPlay
        loop
        muted
        playsInline
        style={{ pointerEvents: 'none', userSelect: 'none', opacity: 1 }}
      />
      
      <div className={`w-full z-10 flex flex-row items-stretch justify-center gap-6 md:gap-10 max-w-5xl ${mode === 'register' ? 'min-h-[700px]' : 'h-[550px]'} px-6 py-4 transition-all duration-500`}>
        <div className={`flex-1 w-full max-w-[420px] rounded-2xl flex flex-col items-center justify-center p-0 bg-gradient-to-b from-[rgba(0,0,0,0.25)] to-[rgba(255,255,255,0.05)]
        backdrop-blur-3xl shadow-xl border border-white/10 overflow-y-auto no-scrollbar`}>
          <Card className="bg-transparent border-none shadow-none p-0 w-full">
            <CardContent className="p-8 flex flex-col items-center">
              <Icons.logo className="h-16 w-auto mb-4" />
              <h1 className="text-2xl text-slate-300 tracking-tight mb-1" style={{ fontFamily: 'Gotham, Helvetica, Arial, sans-serif' }}>
                {mode === "login" ? "Welcome back" : "Create Account"}
              </h1>
              <p className="text-sm text-slate-500 mb-6">
                {mode === "login" ? "Enter your credentials to sign in" : "Enter your details to register"}
              </p>
              
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="mb-4 bg-green-500/10 text-green-500 border-green-500/20">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={mode === "login" ? onLogin : onRegister} className="space-y-4 w-full">
                {mode === "register" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-slate-500 text-xs" htmlFor="name">Full Name</Label>
                      <Input id="name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required disabled={isLoading} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-slate-500 text-xs" htmlFor="role">Role</Label>
                        <select 
                          id="role" 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-slate-300 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={role} 
                          onChange={(e) => setRole(e.target.value as "STUDENT" | "FACULTY")}
                          disabled={isLoading}
                        >
                          <option value="STUDENT" className="bg-slate-900">Student</option>
                          <option value="FACULTY" className="bg-slate-900">Faculty</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-500 text-xs" htmlFor="phone">Phone</Label>
                        <Input id="phone" placeholder="9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isLoading} />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <Label className="text-slate-500 text-xs" htmlFor="email">Email</Label>
                  <Input id="email" placeholder="name@pes.edu" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
                </div>

                <div className="space-y-1">
                  <Label className="text-slate-500 text-xs" htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
                </div>

                {mode === "register" && role === "STUDENT" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-slate-500 text-xs" htmlFor="studentId">Student ID</Label>
                      <Input id="studentId" placeholder="PESXUGXXXXXXX" value={studentId} onChange={(e) => setStudentId(e.target.value)} required disabled={isLoading} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-500 text-xs" htmlFor="program">Program</Label>
                      <Input id="program" placeholder="B-Tech" value={program} onChange={(e) => setProgram(e.target.value)} required disabled={isLoading} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-500 text-xs" htmlFor="year">Year</Label>
                      <Input id="year" placeholder="20XX" value={year} onChange={(e) => setYear(e.target.value)} required disabled={isLoading} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-500 text-xs" htmlFor="section">Section</Label>
                      <Input id="section" placeholder="X" value={section} onChange={(e) => setSection(e.target.value)} required disabled={isLoading} />
                    </div>
                  </div>
                )}

                {mode === "register" && role === "FACULTY" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-slate-500 text-xs" htmlFor="facultyId">Faculty ID</Label>
                      <Input id="facultyId" placeholder="FAC001" value={facultyId} onChange={(e) => setFacultyId(e.target.value)} required disabled={isLoading} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-500 text-xs" htmlFor="dept">Department</Label>
                      <Input id="dept" placeholder="CS" value={department} onChange={(e) => setDepartment(e.target.value)} required disabled={isLoading} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-500 text-xs" htmlFor="office">Office</Label>
                      <Input id="office" placeholder="Block A-301" value={office} onChange={(e) => setOffice(e.target.value)} required disabled={isLoading} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-500 text-xs" htmlFor="spec">Specialization</Label>
                      <Input id="spec" placeholder="AI/ML" value={specialization} onChange={(e) => setSpecialization(e.target.value)} required disabled={isLoading} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-slate-500 text-xs" htmlFor="hours">Office Hours</Label>
                      <Input id="hours" placeholder="10 AM - 4 PM" value={officeHours} onChange={(e) => setOfficeHours(e.target.value)} required disabled={isLoading} />
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full hover:bg-slate-400 mt-4" disabled={isLoading}>
                  {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "login" ? "Sign In" : "Register"}
                </Button>

                <div className="text-center mt-4">
                  <button 
                    type="button"
                    onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
                    className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {mode === "login" ? "Don't have an account? Register" : "Already have an account? Login"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
        
        <div className="hidden md:flex flex-1 w-full max-w-[420px] flex-col items-center justify-center rounded-2xl shadow-lg overflow-hidden transition-all duration-500">
          <LoginSideCard />
        </div>
      </div>
    </div>
  )
}

