import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserById } from "@/lib/auth"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const requesterId = request.headers.get("x-user-id")
    if (!requesterId) {
      // For now, allow if no header, but ideally we check auth
    }

    const { id } = params
    const body = await request.json()
    const { name, email, phone, facultyId, department, office, specialization, officeHours } = body

    // Update User and Faculty in a transaction
    const updatedFaculty = await prisma.$transaction(async (tx) => {
      const faculty = await tx.faculty.findUnique({
        where: { id },
        include: { user: true }
      })

      if (!faculty) throw new Error("Faculty not found")

      // Update User
      await tx.user.update({
        where: { id: faculty.user_id },
        data: {
          name,
          email,
          phone: phone || null,
        }
      })

      // Update Faculty
      return await tx.faculty.update({
        where: { id },
        data: {
          faculty_id: facultyId,
          department,
          office,
          specialization,
          office_hours: officeHours,
        },
        include: { user: true }
      })
    })

    return NextResponse.json({ faculty: updatedFaculty })
  } catch (error) {
    console.error("Update faculty error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // 1. Find the faculty to get the user_id
    const faculty = await prisma.faculty.findUnique({
      where: { id },
      include: {
        user: true,
      }
    })

    if (!faculty) {
      return NextResponse.json({ error: "Faculty not found" }, { status: 404 })
    }

    const userId = faculty.user_id

    // 2. Clean up relations that might block deletion (Foreign Key constraints)
    await prisma.$transaction(async (tx) => {
      // Remove from Domain Coordinators
      await tx.domainCoordinator.deleteMany({ where: { faculty_id: id } })
      
      // Remove Platform Manager / Developer assignments
      await tx.platformManagerAssignment.deleteMany({ where: { faculty_id: id } })
      await tx.developerAssignment.deleteMany({ where: { faculty_id: id } })

      // Nullify or delete project requests where this faculty is assigned
      await tx.projectRequest.deleteMany({ where: { faculty_id: id } })

      // Handle Component Requests (approvals and requests)
      await tx.componentRequest.updateMany({
        where: { approved_by: id },
        data: { approved_by: null }
      })
      await tx.componentRequest.deleteMany({ where: { faculty_id: id } })

      // Handle Library Requests
      await tx.libraryRequest.deleteMany({ where: { faculty_id: id } })
      
      // Handle Location Bookings
      await tx.locationBooking.deleteMany({ where: { faculty_id: id } })

      // Handle Library Items (unassign them)
      await tx.libraryItem.updateMany({
        where: { faculty_id: id },
        data: { faculty_id: null }
      })

      // Handle Opportunities (unassign them)
      await tx.opportunity.deleteMany({
        where: { facultyInChargeId: userId }
      })

      // Finally delete the User (which cascades to Faculty)
      await tx.user.delete({
        where: { id: userId }
      })
    })

    return NextResponse.json({ message: "Faculty and associated user deleted successfully" })
  } catch (error) {
    console.error("Delete faculty error:", error)
    return NextResponse.json({ error: "Failed to delete faculty. They may have active courses or other linked records." }, { status: 500 })
  }
}
