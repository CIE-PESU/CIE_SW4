import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserById } from "@/lib/auth"
import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs/promises"
import { readEncryptedFile } from "@/lib/storage"

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 })
    }

    const user = await getUserById(userId)
    if (!user || user.role !== "FACULTY") {
      return NextResponse.json({ error: "Access denied - Faculty only" }, { status: 403 })
    }

    const body = await request.json()
    const { project_id, top_k = 3, custom_prompt = null, export_format = null } = body

    if (!project_id) {
      return NextResponse.json({ 
        error: "Project ID is required" 
      }, { status: 400 })
    }

    // Get project details
    const project = await prisma.project.findUnique({
      where: { id: project_id },
      include: {
        project_requests: {
          where: { status: "PENDING" },
          include: {
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
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    if (project.created_by !== userId) {
      return NextResponse.json({ 
        error: "Access denied - You can only shortlist for your own projects" 
      }, { status: 403 })
    }

    if (!project.project_requests || project.project_requests.length === 0) {
      return NextResponse.json({ 
        error: "No pending applications found for this project" 
      }, { status: 400 })
    }

    // Check if resumes folder exists and collect resumes from students
    const resumesFolder = path.join(process.cwd(), "public", "project-applications", project_id)
    
    try {
      // Ensure the directory exists
      await fs.mkdir(resumesFolder, { recursive: true })
      
      console.log(`Gathering resumes for project ${project_id} in ${resumesFolder}`)
      
      // Decrypt and copy resumes from student profiles if they are not already in the project folder
      for (const req of project.project_requests) {
        if (req.resume_id) {
          const targetPath = path.join(resumesFolder, req.resume_id)
          
          // Check if it already exists to avoid redundant processing
          try {
            await fs.access(targetPath)
            console.log(`Resume ${req.resume_id} already exists in project folder`)
          } catch {
            // Document not found in target folder, decrypt and copy it
            try {
              console.log(`Decrypting and copying resume ${req.resume_id} for student ${req.student_id}`)
              const decryptedBuffer = await readEncryptedFile(req.resume_id, 'resumes')
              await fs.writeFile(targetPath, decryptedBuffer)
            } catch (err) {
              console.error(`Error decrypting resume ${req.resume_id} for request ${req.id}:`, err)
              // If decryption fails, skip this one
            }
          }
        }
      }
      
      // Verify folder still contains some resumes after processing
      const files = await fs.readdir(resumesFolder)
      if (files.filter(f => f.endsWith('.pdf')).length === 0) {
        return NextResponse.json({ 
          error: "No readable resumes found for any of the applicants" 
        }, { status: 400 })
      }
    } catch (error) {
      console.error("Error preparing resumes folder:", error)
      return NextResponse.json({ 
        error: "Failed to prepare resumes for analysis" 
      }, { status: 500 })
    }

    // Prepare project description for the selector
    const defaultProjectDescription = `
Project: ${project.name}

Description: ${project.description}

Requirements: Looking for candidates with relevant skills and experience for this project.

Expected completion: ${new Date(project.expected_completion_date).toLocaleDateString()}
    `.trim()

    // Use custom prompt if provided, otherwise use default
    const projectDescription = custom_prompt && custom_prompt.trim() 
      ? custom_prompt.trim()
      : project.ai_prompt_custom && project.ai_prompt_custom.trim()
        ? project.ai_prompt_custom.trim()
        : defaultProjectDescription

    // Create a temporary Python script to run the resume selector
    const scriptPath = path.join(process.cwd(), "scripts", "run_resume_selector.py")
    const mistralApiKey = process.env.MISTRAL_API_KEY || ""

    if (!mistralApiKey) {
      return NextResponse.json({ 
        error: "Mistral API key not configured" 
      }, { status: 500 })
    }

    // Create the optimized Python script
    const pythonScript = `
import sys
import os
import json
import time
import warnings

# Redirect all prints and warnings to stderr except our final JSON output
warnings.filterwarnings("ignore")
os.environ['TOKENIZERS_PARALLELISM'] = 'false'
os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'

sys.path.append('${path.join(process.cwd(), "scripts").replace(/\\/g, "\\\\")}')

from resume_selector_optimized import OptimizedResumeSelector

def main():
    try:
        # Initialize the optimized resume selector with parallel processing
        print("🚀 Initializing Optimized AI Resume Selector...", file=sys.stderr)
        sys.stderr.flush()
        
        # Use more workers for better parallelization (adjust based on your system)
        max_workers = min(8, os.cpu_count() or 4)
        selector = OptimizedResumeSelector(
            api_key="${mistralApiKey}", 
            quiet=False,  # Keep progress updates
            max_workers=max_workers
        )
        
        # Process resumes from the project folder
        resume_folder = "${resumesFolder.replace(/\\/g, "\\\\")}"
        print(f"📁 Processing resumes from: {resume_folder}", file=sys.stderr)
        print(f"⚡ Using {max_workers} parallel workers", file=sys.stderr)
        sys.stderr.flush()
        
        start_time = time.time()
        success = selector.process_resumes(resume_folder)
        
        if not success:
            print(json.dumps({"error": "Failed to process resumes"}))
            return
        
        process_time = time.time() - start_time
        print(f"✅ Successfully processed {selector.get_resume_count()} resumes in {process_time:.1f}s", file=sys.stderr)
        sys.stderr.flush()
        
        # Project description
        project_desc = """${projectDescription.replace(/\"/g, '\\"')}"""
        
        # Search for top candidates (get all candidates for ranking)
        search_start = time.time()
        search_k = selector.get_resume_count()  # Get ALL resumes
        print(f"🔍 Ranking all {search_k} candidates by semantic similarity...", file=sys.stderr)
        sys.stderr.flush()
        
        candidates = selector.search_resumes(project_desc, top_k=search_k)
        search_time = time.time() - search_start
        
        if not candidates:
            print(json.dumps({"error": "No suitable candidates found"}))
            return
        
        print(f"✅ Semantic ranking completed in {search_time:.1f}s", file=sys.stderr)
        
        # Generate summaries for ALL candidates using batch processing
        print(f"🤖 Running AI analysis on all {len(candidates)} candidates in parallel...", file=sys.stderr)
        print(f"📊 Batch size: {min(4, len(candidates))} concurrent API calls", file=sys.stderr)
        sys.stderr.flush()
        
        analysis_start = time.time()
        results = selector.generate_candidate_summary_batch(project_desc, candidates)
        analysis_time = time.time() - analysis_start
        
        # Return ALL results (no limit - let faculty choose)
        final_results = results  # Don't limit to top_k, show all ranked
        
        total_time = time.time() - start_time
        print(f"", file=sys.stderr)
        print(f"🎯 FINAL SUMMARY:", file=sys.stderr)
        print(f"   📄 PDF Processing: {process_time:.1f}s", file=sys.stderr)
        print(f"   🔍 Semantic Ranking: {search_time:.1f}s", file=sys.stderr)
        print(f"   🤖 AI Analysis: {analysis_time:.1f}s", file=sys.stderr)
        print(f"   ⏱️  Total Time: {total_time:.1f}s", file=sys.stderr)
        print(f"   📊 Results: {len(final_results)} candidates ranked from best to worst", file=sys.stderr)
        
        # Count successful vs failed analyses
        successful = sum(1 for r in final_results if r.get('name') not in ['Analysis Error', 'Timeout Error', 'Exception Error', 'JSON Parse Error', 'API Error'])
        failed = len(final_results) - successful
        print(f"   ✅ Successful AI analyses: {successful}", file=sys.stderr)
        print(f"   ❌ Failed AI analyses: {failed}", file=sys.stderr)
        sys.stderr.flush()
        
        # Only print JSON to stdout
        print(json.dumps({"success": True, "candidates": final_results}))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
`

    // Write the script
    await fs.writeFile(scriptPath, pythonScript)

    try {
      // Get Python path from environment or use dynamic detection
      let pythonPath = process.env.PYTHON_VENV_PATH;
      
      if (!pythonPath) {
        // Try to detect virtual environment automatically
        const venvPaths = [
          path.join(process.cwd(), "..", ".venv", process.platform === "win32" ? "Scripts" : "bin", process.platform === "win32" ? "python.exe" : "python"),
          path.join(process.cwd(), ".venv", process.platform === "win32" ? "Scripts" : "bin", process.platform === "win32" ? "python.exe" : "python"),
          path.join(process.env.HOME || process.env.USERPROFILE || "", ".venv", process.platform === "win32" ? "Scripts" : "bin", process.platform === "win32" ? "python.exe" : "python"),
        ];
        
        // Check which python path exists
        for (const checkPath of venvPaths) {
          try {
            await fs.access(checkPath);
            pythonPath = checkPath;
            break;
          } catch {
            // Continue to next path
          }
        }
        
        // Fallback to system python
        if (!pythonPath) {
          pythonPath = process.platform === "win32" ? "python.exe" : "python3";
          console.warn("Virtual environment not found, using system Python");
        }
      }
      
      console.log("Using Python path:", pythonPath);
      const { stdout, stderr } = await execAsync(`"${pythonPath}" "${scriptPath}"`, {
        cwd: process.cwd(),
        timeout: 1800000, // 30 minutes timeout - should be much faster now with parallel processing
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      })

      if (stderr) {
        console.error("Python script stderr:", stderr)
      }

      // Parse the result
      const result = JSON.parse(stdout.trim())

      if (result.error) {
        return NextResponse.json({ 
          error: result.error 
        }, { status: 500 })
      }

      // Map results to include student information from database
      const shortlistedCandidates = []
      for (const candidate of result.candidates) {
        // Find the corresponding project request by matching either resume_id or checking if resume_id is part of the file_name
        const projectRequest = project.project_requests.find(req => 
          req.resume_id === candidate.file_name || 
          (req.resume_id && candidate.file_name.includes(req.resume_id))
        )

        if (projectRequest) {
          shortlistedCandidates.push({
            request_id: projectRequest.id,
            student_id: projectRequest.student_id,
            student_name: projectRequest.student.user.name,
            student_email: projectRequest.student.user.email,
            file_name: candidate.file_name,
            file_path: candidate.file_path,
            score: candidate.score,
            ai_analysis: {
              name: candidate.name,
              skills: candidate.skills,
              reasons: candidate.reasons,
              metadata: candidate.metadata
            }
          })
        }
      }

      // Clean up the temporary script
      try {
        await fs.unlink(scriptPath)
      } catch (error) {
        console.log("Could not delete temporary script:", error)
      }

      // Handle CSV export if requested
      if (export_format === 'csv') {
        const csvHeaders = [
          'Rank',
          'Student Name', 
          'Student Email',
          'Match Score (%)',
          'Top Skills',
          'AI Reasons',
          'Resume File'
        ].join(',')

        const csvRows = shortlistedCandidates.map((candidate, index) => {
          const rank = index + 1
          const name = candidate.student_name.replace(/"/g, '""') // Escape quotes
          const email = candidate.student_email.replace(/"/g, '""')
          const score = Math.round(candidate.score * 100)
          const skills = candidate.ai_analysis.skills.slice(0, 3).join('; ').replace(/"/g, '""')
          const reasons = candidate.ai_analysis.reasons.slice(0, 2).join('; ').replace(/"/g, '""')
          const resumeFile = candidate.file_name.replace(/"/g, '""')
          
          return `${rank},"${name}","${email}",${score},"${skills}","${reasons}","${resumeFile}"`
        })

        const csvContent = [csvHeaders, ...csvRows].join('\n')
        
        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="ai-shortlist-${project.name.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.csv"`
          }
        })
      }

      return NextResponse.json({ 
        success: true,
        project: {
          id: project.id,
          name: project.name,
          description: project.description
        },
        total_applications: project.project_requests.length,
        shortlisted_candidates: shortlistedCandidates,
        prompt_used: projectDescription
      })

    } catch (error) {
      console.error("Error running Python script:", error)
      
      // Clean up the temporary script
      try {
        await fs.unlink(scriptPath)
      } catch (cleanupError) {
        console.log("Could not delete temporary script:", cleanupError)
      }

      return NextResponse.json({ 
        error: "Failed to process resumes with AI" 
      }, { status: 500 })
    }

  } catch (error) {
    console.error("Error in shortlist endpoint:", error)
    return NextResponse.json({ 
      error: "Failed to shortlist candidates" 
    }, { status: 500 })
  }
}
