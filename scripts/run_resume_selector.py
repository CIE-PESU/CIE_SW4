
import sys
import os
import json
import time
import warnings

# Redirect all prints and warnings to stderr except our final JSON output
warnings.filterwarnings("ignore")
os.environ['TOKENIZERS_PARALLELISM'] = 'false'
os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'

sys.path.append('/home/rohan/Desktop/cie/CIE_SW4/scripts')

from resume_selector_optimized import OptimizedResumeSelector

def main():
    try:
        # Initialize the optimized resume selector with parallel processing
        print("🚀 Initializing Optimized AI Resume Selector...", file=sys.stderr)
        sys.stderr.flush()
        
        # Use more workers for better parallelization (adjust based on your system)
        max_workers = min(8, os.cpu_count() or 4)
        selector = OptimizedResumeSelector(
            api_key="brEOgcG0gs0qtC7BniLYL9PYFXYwe8fL", 
            quiet=False,  # Keep progress updates
            max_workers=max_workers
        )
        
        # Process resumes from the project folder
        resume_folder = "/home/rohan/Desktop/cie/CIE_SW4/public/project-applications/cmmtb0yrn0000i5qsot17c927"
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
        project_desc = """Project: trial2

Description: abc

Requirements: Looking for candidates with relevant skills and experience for this project.

Expected completion: 3/19/2026"""
        
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
