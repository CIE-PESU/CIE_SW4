import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserById } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 })
    }

    const user = await getUserById(userId)
    if (!user || user.role !== "STUDENT") {
      return NextResponse.json({ error: "Access denied - Students only" }, { status: 403 })
    }

    // Get student record
    const student = await prisma.student.findUnique({
      where: { user_id: userId },
    })

    if (!student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 })
    }

    const { project_id, faculty_id, student_notes } = await request.json()
    
    if (!project_id || !faculty_id) {
      return NextResponse.json({ 
        error: "Project ID and Faculty ID are required" 
      }, { status: 400 })
    }

    if (!student.resume_id) {
       return NextResponse.json({ 
        error: "No resume found. Please upload a resume to your profile before applying." 
      }, { status: 400 })
    }

    // Check if the project exists and enrollment is open
    const project = await prisma.project.findUnique({
      where: { id: project_id },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // For faculty-assigned projects, check enrollment status
    if (project.type === "FACULTY_ASSIGNED") {
      if (project.status !== "APPROVED") {
        return NextResponse.json({ 
          error: "Project must be approved before students can apply" 
        }, { status: 400 })
      }

      if (project.enrollment_status !== "OPEN") {
        return NextResponse.json({ 
          error: "Enrollment is not open for this project" 
        }, { status: 400 })
      }
    }

    // Check if student has already applied
    const existingRequest = await prisma.projectRequest.findUnique({
      where: {
        project_id_student_id: {
          project_id: project_id,
          student_id: student.id
        }
      }
    })

    if (existingRequest) {
      return NextResponse.json({ 
        error: "You have already applied for this project" 
      }, { status: 400 })
    }

    const projectRequest = await prisma.projectRequest.create({
      data: {
        project_id,
        student_id: student.id,
        faculty_id,
        request_date: new Date(),
        status: "PENDING",
        student_notes: student_notes || null,
        resume_id: student.resume_id,
        resume_path: student.resume_path,
      },
      include: {
        project: true,
        student: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        faculty: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ 
      projectRequest,
      message: "Application submitted successfully with resume"
    })

  } catch (error) {
    console.error("Error creating project application:", error)
    return NextResponse.json({ 
      error: "Failed to submit application" 
    }, { status: 500 })
  }
}
