import { NextRequest, NextResponse } from "next/server"
import { getUserById } from "@/lib/auth"
import { spawn } from "child_process"
import path from "path"
import fs from "fs/promises"
import AdmZip from "adm-zip"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: { programId: string; yearId: string; stageId: string } }
) {
  const { stageId } = params;
  let tempExtractDir = "";
  let scriptPath = "";

  try {
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 })
    }

    const user = await getUserById(userId)
    if (!user || (user.role !== "FACULTY" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const formData = await request.formData();
    const zipFile = formData.get("file") as File;
    const customPrompt = formData.get("customPrompt") as string;

    if (!zipFile) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }

    // Persistent directory to save and extract the ZIP so we can link to them later
    const tempDir = path.join(process.cwd(), "public", "uploads", "resumes");
    await fs.mkdir(tempDir, { recursive: true });
    
    // Use stageId as folder name, clear existing if re-analyzing
    tempExtractDir = path.join(tempDir, stageId);
    await fs.rm(tempExtractDir, { recursive: true, force: true }).catch(() => {});
    await fs.mkdir(tempExtractDir, { recursive: true });

    const timestamp = Date.now();
    const isPdf = zipFile.name.toLowerCase().endsWith(".pdf") || zipFile.type === "application/pdf";
    const uploadPath = path.join(tempDir, `upload-${stageId}-${timestamp}${isPdf ? '.pdf' : '.zip'}`);

    // Write file to disk
    const arrayBuffer = await zipFile.arrayBuffer();
    await fs.writeFile(uploadPath, Buffer.from(arrayBuffer));

    await fs.mkdir(tempExtractDir, { recursive: true });

    if (isPdf) {
      // For single PDF, just copy it into the extraction folder
      const targetPath = path.join(tempExtractDir, zipFile.name);
      await fs.copyFile(uploadPath, targetPath);
      await fs.unlink(uploadPath).catch(() => {});
    } else {
      try {
        // Extract ZIP
        const zip = new AdmZip(uploadPath);
        zip.extractAllTo(tempExtractDir, true);
        await fs.unlink(uploadPath).catch(() => {});
      } catch (e: any) {
        await fs.unlink(uploadPath).catch(() => {});
        await fs.rm(tempExtractDir, { recursive: true, force: true }).catch(() => {});
        return NextResponse.json({ error: "Failed to parse ZIP file: " + e.message }, { status: 400 });
      }
    }

    // Ensure there are some PDFs in the folder
    async function checkPdfs(dir: string): Promise<boolean> {
      try {
        const items = await fs.readdir(dir, { withFileTypes: true });
        for (const item of items) {
          if (item.isDirectory()) {
            const hasPdf = await checkPdfs(path.join(dir, item.name));
            if (hasPdf) return true;
          } else if (item.name.toLowerCase().endsWith(".pdf")) {
            return true;
          }
        }
      } catch (e) {
        return false;
      }
      return false;
    }

    const hasResumes = await checkPdfs(tempExtractDir);
    if (!hasResumes) {
      await fs.rm(tempExtractDir, { recursive: true, force: true }).catch(() => {});
      return NextResponse.json({ 
        error: "No PDF files found inside the uploaded ZIP archive." 
      }, { status: 400 })
    }

    const mistralApiKey = process.env.MISTRAL_API_KEY || ""
    if (!mistralApiKey) {
      return NextResponse.json({ error: "Mistral API key not configured" }, { status: 500 })
    }

    // Create the optimized Python script, passing the extracted directory
    scriptPath = path.join(process.cwd(), "scripts", `run_stage_selector_${timestamp}.py`)
    
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
        
        max_workers = min(8, os.cpu_count() or 4)
        selector = OptimizedResumeSelector(
            api_key="${mistralApiKey}", 
            quiet=False,
            max_workers=max_workers
        )
        
        # Process extracted resumes
        resume_folder = "${tempExtractDir.replace(/\\/g, "\\\\")}"
        print(f"📁 Processing resumes from: {resume_folder}", file=sys.stderr)
        sys.stderr.flush()
        
        start_time = time.time()
        success = selector.process_resumes(resume_folder)
        
        if not success:
            print(json.dumps({"error": "Failed to extract text from PDFs in ZIP"}))
            return
            
        resume_count = selector.get_resume_count()
        if resume_count == 0:
            print(json.dumps({"error": "No readable PDF resumes found in the ZIP contents"}))
            return
        
        process_time = time.time() - start_time
        print(f"✅ Successfully processed {resume_count} resumes in {process_time:.1f}s", file=sys.stderr)
        
        # Format the custom prompt description
        project_desc = """${(customPrompt || "Look for general suitable candidates based on best matching skills.").replace(/\"/g, '\\"')}"""
        
        # Find candidates
        search_start = time.time()
        search_k = resume_count
        print(f"🔍 Ranking all {search_k} candidates by semantic similarity...", file=sys.stderr)
        sys.stderr.flush()
        
        candidates = selector.search_resumes(project_desc, top_k=search_k)
        search_time = time.time() - search_start
        
        if not candidates:
            print(json.dumps({"error": "No candidates scored high enough"}))
            return
            
        print(f"✅ Semantic ranking completed in {search_time:.1f}s", file=sys.stderr)
        
        # AI Summaries
        print(f"🤖 Running AI analysis on candidates in parallel...", file=sys.stderr)
        sys.stderr.flush()
        
        analysis_start = time.time()
        results = selector.generate_candidate_summary_batch(project_desc, candidates)
        analysis_time = time.time() - analysis_start
        
        # Output clean JSON
        print(json.dumps({"success": True, "candidates": results}))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
`
    // Write the script
    await fs.writeFile(scriptPath, pythonScript)

    // Execute script
    let pythonPath = process.env.PYTHON_VENV_PATH;
    if (!pythonPath) {
      const venvPaths = [
        path.join(process.cwd(), "..", ".venv", process.platform === "win32" ? "Scripts" : "bin", process.platform === "win32" ? "python.exe" : "python"),
        path.join(process.cwd(), ".venv", process.platform === "win32" ? "Scripts" : "bin", process.platform === "win32" ? "python.exe" : "python"),
        path.join(process.cwd(), "venv", process.platform === "win32" ? "Scripts" : "bin", process.platform === "win32" ? "python.exe" : "python"),
      ];
      for (const checkPath of venvPaths) {
        try {
          await fs.access(checkPath);
          pythonPath = checkPath;
          break;
        } catch {}
      }
      if (!pythonPath) {
        pythonPath = process.platform === "win32" ? "python.exe" : "python3";
      }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const pythonProcess = spawn(`"${pythonPath}"`, [`"${scriptPath}"`], {
          shell: true,
          cwd: process.cwd(),
          env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });

        let stdoutData = "";

        pythonProcess.stdout.on("data", (data) => {
          stdoutData += data.toString();
        });

        pythonProcess.stderr.on("data", (data) => {
          const str = data.toString();
          console.log("Analysis Output:", str);

          let progress = 0;
          let status = str.trim();
          
          if (str.includes("Processed")) {
            const match = str.match(/Processed (\d+)\/(\d+)/);
            if (match) {
              const current = parseInt(match[1]);
              const total = parseInt(match[2]);
              progress = Math.round((current / total) * 30); 
              status = `Extracting Resumes: ${current}/${total}`;
            }
          } else if (str.includes("candidate")) {
            const match = str.match(/candidate (\d+)\/(\d+)/);
            if (match) {
              const current = parseInt(match[1]);
              const total = parseInt(match[2]);
              progress = 40 + Math.round((current / total) * 60); 
              status = `AI Analyzing: ${current}/${total}`;
            }
          } else if (str.includes("Ranking")) {
            progress = 35;
            status = "Semantic Ranking Candidates...";
          }

          controller.enqueue(encoder.encode(JSON.stringify({ 
            type: "progress", 
            message: status,
            progress: progress
          }) + "\n"));
        });

        pythonProcess.on("close", async (code) => {
          try {
            if (code !== 0) {
              controller.enqueue(encoder.encode(JSON.stringify({ 
                type: "error", 
                message: `Python process exited with code ${code}` 
              }) + "\n"));
              controller.close();
              return;
            }

            const cleanStdout = stdoutData.trim();
            // Results might be mixed with other output, find the JSON block
            const jsonStart = cleanStdout.lastIndexOf('{"success":');
            const jsonFallback = cleanStdout.lastIndexOf('{"error":');
            const startIndex = jsonStart !== -1 ? jsonStart : jsonFallback;
            
            if (startIndex === -1) {
              if (code !== 0) {
                const logs = stderrData.split('\n').filter(Boolean);
                const lastLog = logs.length > 0 ? logs[logs.length - 1] : 'No error output';
                throw new Error(`Process failed (${code}): ${lastLog}`);
              }
              throw new Error("Could not find result JSON in output");
            }

            const result = JSON.parse(cleanStdout.substring(startIndex));

            if (result.error) {
              controller.enqueue(encoder.encode(JSON.stringify({ 
                type: "error", 
                message: result.error 
              }) + "\n"));
            } else {
              // Clean up file_path into an accessible public URL
              const candidates = result.candidates.map((c: any) => {
                if (c.file_path) {
                  // Find where 'public' folder starts, e.g., separator + public + separator
                  // Or just look for substring to be safe across OS
                  const normalizedPath = c.file_path.replace(/\\/g, '/');
                  const publicStr = '/public/';
                  const publicIdx = normalizedPath.indexOf(publicStr);
                  if (publicIdx !== -1) {
                    c.file_url = normalizedPath.substring(publicIdx + publicStr.length - 1); // keep the leading slash
                  } else {
                    // Fallback
                    const uploadsIdx = normalizedPath.indexOf("uploads/resumes");
                    if (uploadsIdx !== -1) c.file_url = "/" + normalizedPath.substring(uploadsIdx);
                  }
                }
                return c;
              });

              // Save results to database
              console.log(`💾 Saving analysis results for stage ${stageId}...`);
              await prisma.programStage.update({
                where: { id: stageId },
                data: {
                  analysis_results: candidates as any,
                  last_analyzed_at: new Date()
                }
              });

              controller.enqueue(encoder.encode(JSON.stringify({ 
                type: "complete", 
                total_resumes: candidates.length,
                shortlisted_candidates: candidates
              }) + "\n"));
            }
          } catch (e: any) {
            controller.enqueue(encoder.encode(JSON.stringify({ 
              type: "error", 
              message: "Failed to parse analysis results: " + e.message 
            }) + "\n"));
          } finally {
            // DO NOT delete the extraction directory so the user can open the PDFs later!
            await fs.unlink(scriptPath).catch(() => {});
            controller.close();
          }
        });

        // Handle client disconnect
        request.signal.addEventListener("abort", () => {
          pythonProcess.kill();
        });
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error: any) {
    console.error("Error in stage resume analysis endpoint:", error)
    if (tempExtractDir) await fs.rm(tempExtractDir, { recursive: true, force: true }).catch(e => console.error(e));
    if (scriptPath) await fs.unlink(scriptPath).catch(e => console.error(e));

    return NextResponse.json({ 
      error: error.message || "Failed to analyze resumes" 
    }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { programId: string; yearId: string; stageId: string } }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { stageId } = params;
    const data = await request.json();
    
    if (data.analysis_results === undefined) {
      return NextResponse.json({ error: "Missing analysis_results" }, { status: 400 });
    }

    await prisma.programStage.update({
      where: { id: stageId },
      data: {
        analysis_results: data.analysis_results
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating stage analysis results:", error);
    return NextResponse.json({ error: error.message || "Failed to update results" }, { status: 500 });
  }
}
