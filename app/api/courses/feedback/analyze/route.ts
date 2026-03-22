import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserById } from "@/lib/auth"

export async function POST(request: NextRequest) {
  console.log("[AI-SYSTEM] Starting Feedback Analysis Request")
  
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 })
    }

    const { feedbacks, courseId, unitId } = await request.json()
    const apiKey = process.env.MISTRAL_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({ error: "Mistral API Key missing" }, { status: 500 })
    }

    const feedbackText = feedbacks
      .map((f: any) => `Rating: ${f.rating}/5, Comment: ${f.comment}`)
      .join("\n")

    const prompt = `
      You are an expert academic analyst. Analyze the following student feedback:
      
      ${feedbackText}

      Return ONLY a JSON object:
      {
        "summary": "3-4 sentence summary of themes",
        "sentiment": "Very Positive/Mostly Positive/Neutral/Mostly Negative/Very Negative",
        "insights": ["Insight 1", "Insight 2", "Insight 3"]
      }
    `

    let analysisText = ""
    let lastError: any = null

    try {
      console.log(`[AI-SYSTEM] Trying Mistral API...`)
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "mistral-large-latest",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Mistral API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      analysisText = data.choices[0].message.content;

      if (analysisText) {
        console.log(`[AI-SYSTEM] SUCCESS with Mistral model: mistral-large-latest`)
      }
    } catch (error: any) {
      console.error(`[AI-SYSTEM] FAILED Mistral API:`, error.message)
      lastError = error
    }

    if (!analysisText && lastError) {
      return NextResponse.json({ 
        error: "AI Analysis Failed", 
        details: lastError.message 
      }, { status: 500 })
    }

    // Extract JSON
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("AI response did not contain valid JSON")
    }
    
    const analysis = JSON.parse(jsonMatch[0])

    // Save Summary and Link Feedbacks
    if (courseId) {
      const normalizedUnitId = unitId === "all" ? null : unitId;
      
      // We use a transaction to ensure atomic overwrite
      await prisma.$transaction(async (tx) => {
        // Delete existing summaries for this exact context to "overwrite"
        // Wait, the user said "overwrite this saved one", usually means keep only one.
        // If we want to keep history we wouldn't delete, but user said overwrite.
        await tx.aISummary.deleteMany({
          where: {
            course_id: courseId,
            unit_id: normalizedUnitId
          }
        });

        const feedbackIds = feedbacks.map((f: any) => f.id).filter(Boolean);

        await tx.aISummary.create({
          data: {
            course_id: courseId,
            unit_id: normalizedUnitId,
            summary: analysis.summary,
            sentiment: analysis.sentiment,
            insights: analysis.insights,
            feedbacks: {
              connect: feedbackIds.map((id: string) => ({ id }))
            }
          }
        });
      });
    }

    return NextResponse.json({ analysis })

  } catch (error: any) {
    console.error("[AI-SYSTEM] Root Error:", error)
    return NextResponse.json({ 
      error: "AI Analysis Failed", 
      details: error.message 
    }, { status: 500 })
  }
}
