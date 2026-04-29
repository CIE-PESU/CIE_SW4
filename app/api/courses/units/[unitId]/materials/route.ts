import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserById } from "@/lib/auth"
import fs from "fs/promises"
import path from "path"
import { v4 as uuidv4 } from "uuid"

type Material = {
  id: string
  type: "file" | "link"
  name: string
  url: string
  uploaded_at: string
}

// GET — return materials for a unit (all authenticated users)
export async function GET(
  request: NextRequest,
  { params }: { params: { unitId: string } }
) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })

    const unit = await prisma.courseUnit.findUnique({
      where: { id: params.unitId },
      select: { coursework_materials: true, course_id: true },
    })

    if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 })

    const materials = (unit.coursework_materials as Material[]) || []
    return NextResponse.json({ materials })
  } catch (error) {
    console.error("GET materials error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST — upload a file or add a link (admin/faculty only)
export async function POST(
  request: NextRequest,
  { params }: { params: { unitId: string } }
) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })

    const user = await getUserById(userId)
    if (!user || (user.role !== "FACULTY" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const unit = await prisma.courseUnit.findUnique({ where: { id: params.unitId } })
    if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 })

    const existingMaterials = (unit.coursework_materials as Material[]) || []

    const contentType = request.headers.get("content-type") || ""

    let newMaterial: Material

    if (contentType.includes("multipart/form-data")) {
      // File upload
      const formData = await request.formData()
      const file = formData.get("file") as File | null
      if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

      const uploadDir = path.join(process.cwd(), "public", "uploads", "course-materials", params.unitId)
      await fs.mkdir(uploadDir, { recursive: true })

      const ext = path.extname(file.name)
      const safeFileName = `${uuidv4()}${ext}`
      const filePath = path.join(uploadDir, safeFileName)

      const arrayBuffer = await file.arrayBuffer()
      await fs.writeFile(filePath, Buffer.from(arrayBuffer))

      const publicUrl = `/uploads/course-materials/${params.unitId}/${safeFileName}`

      newMaterial = {
        id: uuidv4(),
        type: "file",
        name: file.name,
        url: publicUrl,
        uploaded_at: new Date().toISOString(),
      }
    } else {
      // Link
      const body = await request.json()
      const { name, url } = body
      if (!name || !url) return NextResponse.json({ error: "Name and URL are required" }, { status: 400 })

      newMaterial = {
        id: uuidv4(),
        type: "link",
        name,
        url,
        uploaded_at: new Date().toISOString(),
      }
    }

    const updatedMaterials = [...existingMaterials, newMaterial]

    await prisma.courseUnit.update({
      where: { id: params.unitId },
      data: { coursework_materials: updatedMaterials as any },
    })

    return NextResponse.json({ material: newMaterial, materials: updatedMaterials })
  } catch (error) {
    console.error("POST materials error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE — remove a material by id (admin/faculty only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { unitId: string } }
) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })

    const user = await getUserById(userId)
    if (!user || (user.role !== "FACULTY" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { materialId } = await request.json()
    if (!materialId) return NextResponse.json({ error: "materialId is required" }, { status: 400 })

    const unit = await prisma.courseUnit.findUnique({ where: { id: params.unitId } })
    if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 })

    const existingMaterials = (unit.coursework_materials as Material[]) || []
    const toDelete = existingMaterials.find((m) => m.id === materialId)

    if (!toDelete) return NextResponse.json({ error: "Material not found" }, { status: 404 })

    // Delete physical file if it's a file upload
    if (toDelete.type === "file") {
      const filePath = path.join(process.cwd(), "public", toDelete.url)
      await fs.unlink(filePath).catch(() => {}) // ignore if already deleted
    }

    const updatedMaterials = existingMaterials.filter((m) => m.id !== materialId)

    await prisma.courseUnit.update({
      where: { id: params.unitId },
      data: { coursework_materials: updatedMaterials as any },
    })

    return NextResponse.json({ success: true, materials: updatedMaterials })
  } catch (error) {
    console.error("DELETE materials error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH — update a material's name/url (link editing, admin/faculty only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { unitId: string } }
) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 })

    const user = await getUserById(userId)
    if (!user || (user.role !== "FACULTY" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const { materialId, name, url } = await request.json()
    if (!materialId || !name) return NextResponse.json({ error: "materialId and name required" }, { status: 400 })

    const unit = await prisma.courseUnit.findUnique({ where: { id: params.unitId } })
    if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 404 })

    const existingMaterials = (unit.coursework_materials as Material[]) || []
    const updatedMaterials = existingMaterials.map((m) =>
      m.id === materialId ? { ...m, name, ...(url ? { url } : {}) } : m
    )

    await prisma.courseUnit.update({
      where: { id: params.unitId },
      data: { coursework_materials: updatedMaterials as any },
    })

    return NextResponse.json({ success: true, materials: updatedMaterials })
  } catch (error) {
    console.error("PATCH materials error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
