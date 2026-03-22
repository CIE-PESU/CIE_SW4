import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, role, phone, ...roleData } = body

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: "Name, email, password, and role are required" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 })
    }

    const hashedPassword = await hashPassword(password)

    // Create user with role-specific data
    const userData: any = {
      email,
      name,
      password: hashedPassword,
      role,
      phone,
    }

    if (role === "STUDENT") {
      const { studentId, program, year, section } = roleData
      if (!studentId || !program || !year || !section) {
        return NextResponse.json({ error: "All student details (ID, Program, Year, Section) are required" }, { status: 400 })
      }
      
      // Check if student ID is unique
      const existingStudent = await prisma.student.findUnique({
        where: { student_id: studentId }
      })
      if (existingStudent) {
        return NextResponse.json({ error: "A student with this ID already exists" }, { status: 400 })
      }

      userData.student = {
        create: {
          student_id: studentId,
          program,
          year,
          section,
        }
      }
    } else if (role === "FACULTY") {
      const { facultyId, department, office, specialization, officeHours } = roleData
      if (!facultyId || !department || !office || !specialization || !officeHours) {
        return NextResponse.json({ error: "All faculty details (ID, Department, Office, Specialization, Office Hours) are required" }, { status: 400 })
      }

      // Check if faculty ID is unique
      const existingFaculty = await prisma.faculty.findUnique({
        where: { faculty_id: facultyId }
      })
      if (existingFaculty) {
        return NextResponse.json({ error: "A faculty with this ID already exists" }, { status: 400 })
      }

      userData.faculty = {
        create: {
          faculty_id: facultyId,
          department,
          office,
          specialization,
          office_hours: officeHours,
        }
      }
    } else if (role === "ADMIN") {
      const { department, office, workingHours } = roleData
      if (!department || !office || !workingHours) {
        return NextResponse.json({ error: "All admin details (Department, Office, Working Hours) are required" }, { status: 400 })
      }
      userData.admin = {
        create: {
          department,
          office,
          working_hours: workingHours,
          permissions: ["MANAGE_USERS"], // Default permission
        }
      }
    }

    const user = await prisma.user.create({
      data: userData,
      include: {
        admin: true,
        faculty: true,
        student: true,
      }
    })

    // Return user without password
    const { password: _, ...userWithoutPassword } = user
    return NextResponse.json({ user: userWithoutPassword }, { status: 201 })

  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
