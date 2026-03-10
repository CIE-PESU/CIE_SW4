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
      src="/logo.png"
      alt="Logo"
      className="h-16 w-auto"
      {...props}
    />
  ),
  spinner: Loader2
}

export function LoginForm() {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const { login } = useAuth()

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault()
    setIsLoading(true)
    setError("")

    const success = await login(email, password)
    if (!success) {
      setError("Invalid email or password")
    }

    setIsLoading(false)
  }

  return (
    <div className="dark min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated background video full screen */}
      <video
        src="/login_background_animation.mp4"
        className="absolute inset-0 w-full h-full object-cover z-0"
        autoPlay
        loop
        muted
        playsInline
        style={{ pointerEvents: 'none', userSelect: 'none', opacity: 1 }}
      />
      {/* Split card layout */}
      <div className="w-full z-10 flex flex-row items-stretch justify-center gap-6 md:gap-10 max-w-5xl h-[550px] px-6 py-4">
        {/* Login form card */}
        <div className="flex-1 w-full max-w-[420px] rounded-2xl flex flex-col items-center justify-center p-0 bg-gradient-to-b from-[rgba(0,0,0,0.25)] to-[rgba(255,255,255,0.05)]
        backdrop-blur-3xl shadow-lg border border-slate-800/90 overflow-hidden">
          <Card className="bg-transparent border-none shadow-none p-0 rounded-2xl w-full backdrop-blur-2xl">
            <CardContent className="p-8 flex flex-col items-center">
              <Icons.logo className="h-20 w-auto mb-5" />
              <h1 className="text-3xl text-slate-400 tracking-tight mb-2 mt-0" style={{ fontFamily: 'Gotham, Helvetica, Arial, sans-serif', fontWeight: 'normal' }}>Welcome back</h1>
              <p className="text-base text-slate-500 text-muted-foreground mb-6">
                Enter your email to sign in to your account
              </p>
              <form onSubmit={onSubmit} className="space-y-6 w-full max-w-md">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label className="text-slate-500" htmlFor="email" >Email</Label>
                  <Input className=''
                    id="email"
                    placeholder="name@example.com"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled={isLoading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-500" htmlFor="password">Password</Label>
                  </div>
                  <Input
                    id="password"
                    placeholder="Enter your password"
                    type="password"
                    autoComplete="current-password"
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full hover:bg-slate-400" disabled={isLoading}>
                  {isLoading ? (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Sign In
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        {/* Side illustration card */}
        <div className="hidden md:flex flex-1 w-full max-w-[420px] flex-col items-center justify-center rounded-2xl shadow-lg overflow-hidden">
          <LoginSideCard />
        </div>
      </div>
    </div>
  )
}
