import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserById } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: { programId: string; yearId: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { yearId } = params;

    const stages = await prisma.programStage.findMany({
      where: { year_id: yearId },
      orderBy: { order: "asc" }
    });

    const mappedStages = stages.map(s => ({
      id: s.id,
      yearId: s.year_id,
      programId: s.program_id,
      name: s.name,
      description: s.description || undefined,
      order: s.order,
      startDate: s.start_date?.toISOString(),
      endDate: s.end_date?.toISOString(),
      status: s.status as any,
      createdAt: s.created_at.toISOString(),
      createdBy: s.created_by,
      analysis_results: s.analysis_results as any[] | undefined,
      last_analyzed_at: s.last_analyzed_at?.toISOString()
    }));

    return NextResponse.json({ stages: mappedStages });
  } catch (error) {
    console.error("Error fetching program stages:", error);
    return NextResponse.json({ error: "Failed to fetch program stages" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { programId: string; yearId: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const user = await getUserById(userId);
    if (!user || (user.role !== "ADMIN" && user.role !== "FACULTY")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { programId, yearId } = params;
    const data = await request.json();
    const { name, description, startDate, endDate, status } = data;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Get max order
    const lastStage = await prisma.programStage.findFirst({
      where: { year_id: yearId },
      orderBy: { order: "desc" }
    });

    const nextOrder = (lastStage?.order || 0) + 1;

    const s = await prisma.programStage.create({
      data: {
        program_id: programId,
        year_id: yearId,
        name,
        description,
        order: nextOrder,
        start_date: startDate ? new Date(startDate) : null,
        end_date: endDate ? new Date(endDate) : null,
        status: status || "upcoming",
        created_by: userId
      }
    });

    const mappedStage = {
      id: s.id,
      yearId: s.year_id,
      programId: s.program_id,
      name: s.name,
      description: s.description || undefined,
      order: s.order,
      startDate: s.start_date?.toISOString(),
      endDate: s.end_date?.toISOString(),
      status: s.status as any,
      createdAt: s.created_at.toISOString(),
      createdBy: s.created_by,
      analysis_results: s.analysis_results as any[] | undefined,
      last_analyzed_at: s.last_analyzed_at?.toISOString()
    };

    return NextResponse.json({ stage: mappedStage });
  } catch (error: any) {
    console.error("Error creating program stage:", error);
    return NextResponse.json({ error: error.message || "Failed to create program stage" }, { status: 500 });
  }
}

