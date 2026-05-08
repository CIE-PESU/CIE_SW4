import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserById } from "@/lib/auth"
import { hash } from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const requesterId = request.headers.get("x-user-id")
    if (!requesterId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const requester = await getUserById(requesterId)
    if (!requester || requester.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { email, name, password, role } = body

    if (!email || !name || !password || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (role === "ADMIN") {
      return NextResponse.json({ error: "Admins can only create Faculty or Student accounts" }, { status: 400 })
    }

    // ensure user doesn't already exist
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 })
    }

    const hashed = await hash(password, 10)

    const data: any = {
      email,
      name,
      password: hashed,
      role,
      phone: null,
    }

    // Create role-specific records for minimal compatibility
    if (role === "ADMIN") {
      data.admin = { create: { department: "IT", office: "Admin", permissions: [] , working_hours: "9-5" } }
    } else if (role === "FACULTY") {
      data.faculty = { create: { faculty_id: `FAC${Math.floor(Math.random()*10000)}`, department: "General", office: "Main", specialization: "General", office_hours: "9-5" } }
    } else if (role === "STUDENT") {
      data.student = { create: { student_id: `STU${Math.floor(Math.random()*100000)}`, program: "UG", year: "1", section: "A" } }
    }

    const user = await prisma.user.create({ data, include: { admin: true, faculty: true, student: true } })

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
