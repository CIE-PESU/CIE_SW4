"use client"

import React, { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"

export function ManageUsers() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("FACULTY")
  const [isSaving, setIsSaving] = useState(false)

  const handleCreate = async () => {
    if (!email || !name || !password || !role) {
      toast({ title: "Error", description: "Fill all fields", variant: "destructive" })
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
        },
        body: JSON.stringify({ email, name, password, role }),
      })
      if (res.ok) {
        toast({ title: "Success", description: "User created" })
        setEmail("")
        setName("")
        setPassword("")
      } else {
        const data = await res.json()
        toast({ title: "Error", description: data.error || "Failed", variant: "destructive" })
      }
    } catch (error) {
      console.error(error)
      toast({ title: "Error", description: "Network error", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-lg font-medium mb-4">Manage Users</h2>
      <div className="grid gap-4 max-w-md">
        <div>
          <Label>Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        </div>
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Password</Label>
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
        </div>
        <div>
          <Label>Role</Label>
          <select className="w-full rounded-md border border-input px-3 py-2" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="FACULTY">FACULTY</option>
            <option value="STUDENT">STUDENT</option>
          </select>
        </div>
        <div className="flex">
          <Button onClick={handleCreate} disabled={isSaving}>{isSaving ? "Creating…" : "Create User"}</Button>
        </div>
      </div>
    </div>
  )
}

export default ManageUsers
