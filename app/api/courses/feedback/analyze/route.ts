import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { getUserById } from "@/lib/auth"

export async function POST(request: NextRequest) {
  console.log("[AI-SYSTEM] Starting Feedback Analysis Request")
  
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 })
    }

    const { feedbacks } = await request.json()
    const apiKey = process.env.GEMINI_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({ error: "API Key missing" }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    
    // We verified these models exist with 'curl' for this specific API key
    const modelsToTry = [
      "gemini-2.0-flash",
      "gemini-flash-latest",
      "gemini-pro-latest"
    ]

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

    for (const modelName of modelsToTry) {
      try {
        console.log(`[AI-SYSTEM] Trying model: ${modelName} (API: v1beta)...`)
        const model = genAI.getGenerativeModel(
          { model: modelName },
          { apiVersion: "v1beta" }
        )
        
        const result = await model.generateContent(prompt)
        const response = await result.response
        analysisText = response.text()
        
        if (analysisText) {
          console.log(`[AI-SYSTEM] SUCCESS with model: ${modelName}`)
          break
        }
      } catch (error: any) {
        console.error(`[AI-SYSTEM] FAILED model ${modelName}:`, error.message)
        lastError = error
        if (error.message?.includes("429")) {
          // If it's quota, we should still try the next one because different models have different quotas
          continue
        }
      }
    }

    if (!analysisText && lastError) {
      return NextResponse.json({ 
        error: lastError.message?.includes("429") ? "Quota Exceeded" : "AI Analysis Failed", 
        details: lastError.message 
      }, { status: 500 })
    }

    // Extract JSON
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("AI response did not contain valid JSON")
    }
    
    const analysis = JSON.parse(jsonMatch[0])
    return NextResponse.json({ analysis })

  } catch (error: any) {
    console.error("[AI-SYSTEM] Root Error:", error)
    return NextResponse.json({ 
      error: "AI Analysis Failed", 
      details: error.message 
    }, { status: 500 })
  }
}
