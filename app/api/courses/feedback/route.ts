import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserById } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")
    const unitId = searchParams.get("unitId")
    const userId = request.headers.get("x-user-id")

    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 })
    }

    const user = await getUserById(userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 })
    }

    // Fetch latest summary for this context
    const normalizedUnitId = unitId === "all" ? null : unitId;
    const latestSummary = await prisma.aISummary.findFirst({
      where: {
        course_id: courseId,
        unit_id: normalizedUnitId
      },
      include: {
        feedbacks: {
          select: { id: true }
        }
      },
      orderBy: {
        created_at: "desc"
      }
    });

    const usedFeedbackIds = new Set(latestSummary?.feedbacks?.map((f: { id: string }) => f.id) || []);

    const feedbacks = await prisma.courseFeedback.findMany({
      where: {
        course_id: courseId,
        ...(unitId && unitId !== "all" ? { unit_id: unitId } : {}),
        ...(user.role === "STUDENT" ? { student_id: user.profileData.id } : {})
      },
      include: {
        student: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        },
        unit: {
          select: { unit_number: true, unit_name: true }
        }
      } as any,
      orderBy: {
        created_at: "desc"
      }
    })

    // Also fetch all suggestions for this unit (publicly visible ideas for next session)
    const allSuggestions = await prisma.courseFeedback.findMany({
      where: {
        course_id: courseId,
        ...(unitId && unitId !== "all" ? { unit_id: unitId } : {}),
        NOT: { suggestions: null },
        suggestions: { not: "" }
      },
      select: {
        id: true,
        suggestions: true,
        created_at: true,
        student: {
          select: {
            user: {
              select: { name: true }
            }
          }
        }
      }
    })

    // Process feedbacks to add "is_used" flag and sort unused ones to the top
    const processedFeedbacks = feedbacks.map((f: any) => ({
      ...f,
      is_used: usedFeedbackIds.has(f.id)
    })).sort((a, b) => {
      if (a.is_used === b.is_used) return 0;
      return a.is_used ? 1 : -1; // unused first
    });

    return NextResponse.json({ 
      feedbacks: processedFeedbacks,
      allSuggestions, // Return suggestions separately so they can be shown to everyone
      latestSummary: latestSummary ? {
        summary: latestSummary.summary,
        sentiment: latestSummary.sentiment,
        insights: latestSummary.insights,
        created_at: latestSummary.created_at
      } : null
    })
  } catch (error) {
    console.error("Get feedback error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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

    const data = await request.json()
    const { courseId, unitId, rating, comment, suggestions } = data

    if (!courseId || !unitId || rating === undefined || rating === null || !comment) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const studentId = user.profileData.id

    // Check if student is enrolled in the course
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { course_enrollments: true }
    })

    if (!course || !course.course_enrollments.includes(userId)) {
      return NextResponse.json({ error: "You must be enrolled in the course to give feedback" }, { status: 403 })
    }

    // Upsert feedback
    const feedback = await prisma.courseFeedback.upsert({
      where: {
        student_id_unit_id: {
          student_id: studentId,
          unit_id: unitId
        }
      },
      update: {
        rating,
        comment,
        suggestions,
        updated_at: new Date()
      },
      create: {
        course_id: courseId,
        student_id: studentId,
        unit_id: unitId,
        rating,
        comment,
        suggestions
      }
    })

    return NextResponse.json({ 
      message: "Feedback submitted successfully", 
      feedback 
    })
  } catch (error) {
    console.error("Post feedback error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      data: { 
        courseId: request.headers.get("x-course-id"), // Just for logging if available
        userId: request.headers.get("x-user-id")
      }
    })
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}
