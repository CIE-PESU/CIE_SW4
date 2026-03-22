import { type NextRequest, NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'
import { getUserById } from '@/lib/auth'
import { saveFile, deleteFile } from '@/lib/storage'

export async function POST(request: NextRequest) {
  try {
    // Get user from header
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 })
    }

    const user = await getUserById(userId)
    if (!user || user.role !== "FACULTY") {
      return NextResponse.json({ error: "Access denied - Faculty only" }, { status: 403 })
    }

    // Only handle multipart/form-data
    if (!request.headers.get('content-type')?.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
    }
    
    const formData = await request.formData()
    const file = formData.get('resume') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No resume file uploaded' }, { status: 400 })
    }

    // Validate file type (PDF)
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed for resumes' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 })
    }

    // Get faculty record
    const faculty = await prisma.faculty.findUnique({
      where: { user_id: userId },
    })

    if (!faculty) {
      return NextResponse.json({ error: "Faculty profile not found" }, { status: 404 })
    }

    // Delete old resume if exists locally
    if (faculty.resume_id) {
      await deleteFile(faculty.resume_id, 'resumes')
      console.log(`Deleted old local resume: ${faculty.resume_id}`)
    }

    // Save new resume file locally
    const savedFile = await saveFile(file, 'resumes')
    
    // Update faculty record with new resume info
    await prisma.faculty.update({
      where: { id: faculty.id },
      data: {
        resume_id: savedFile.key,
        resume_path: 'local',
      },
    })
    
    return NextResponse.json({ 
      success: true,
      resumeUrl: savedFile.url,
      resumeId: savedFile.key,
      message: 'Resume uploaded locally successfully'
    })
  } catch (error) {
    console.error("Resume upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get user from header
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 })
    }

    const user = await getUserById(userId)
    if (!user || user.role !== "FACULTY") {
      return NextResponse.json({ error: "Access denied - Faculty only" }, { status: 403 })
    }

    // Get faculty record
    const faculty = await prisma.faculty.findUnique({
      where: { user_id: userId },
    })

    if (!faculty) {
      return NextResponse.json({ error: "Faculty profile not found" }, { status: 404 })
    }

    if (!faculty.resume_id) {
      return NextResponse.json({ error: "No resume found to delete" }, { status: 404 })
    }

    // Delete resume file locally
    await deleteFile(faculty.resume_id, 'resumes')

    // Update faculty record to remove resume info
    await prisma.faculty.update({
      where: { id: faculty.id },
      data: {
        resume_id: null,
        resume_path: null,
      },
    })

    return NextResponse.json({ 
      success: true,
      message: 'Resume deleted locally successfully'
    })
  } catch (error) {
    console.error("Resume delete error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}