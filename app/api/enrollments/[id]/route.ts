import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserById } from "@/lib/auth"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 })
    }

    const user = await getUserById(userId)
    if (!user || (user.role !== "FACULTY" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const data = await request.json()
    const { status } = data // "ACCEPTED" or "REJECTED"

    if (!["ACCEPTED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const enrollmentId = params.id
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { course: true },
    })

    if (!enrollment) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 })
    }

    // Check if faculty has permission (e.g., created the course or is admin)
    if (user.role === "FACULTY" && enrollment.course.created_by !== userId) {
      return NextResponse.json({ error: "Access denied - you did not create this course" }, { status: 403 })
    }

    const updatedEnrollment = await prisma.$transaction(async (tx) => {
      const updated = await tx.enrollment.update({
        where: { id: enrollmentId },
        data: { status },
      })

      if (status === "ACCEPTED" && !enrollment.course.course_enrollments.includes(enrollment.student_id)) { // Note student_id is not user_id! Wait, course_enrollments uses user_id!
        // We need the user_id of the student
        const student = await tx.student.findUnique({
          where: { id: enrollment.student_id }
        })
        if (student) {
          const currentEnrollments = enrollment.course.course_enrollments
          if (!currentEnrollments.includes(student.user_id)) {
            await tx.course.update({
              where: { id: enrollment.course_id },
              data: {
                course_enrollments: {
                  set: [...currentEnrollments, student.user_id]
                }
              }
            })
          }
        }
      }

      return updated
    })

    return NextResponse.json({ enrollment: updatedEnrollment })
  } catch (error) {
    console.error("Update enrollment error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
