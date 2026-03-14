import os
import sys
import json
import uuid
import time
from pathlib import Path
from typing import List, Dict, Any
import logging
import numpy as np
import faiss
import pdfplumber
from sentence_transformers import SentenceTransformer
from mistralai.client import Mistral
import concurrent.futures
import threading
from functools import partial

class OptimizedResumeSelector:
    """
    Optimized resume selector with parallel processing capabilities.
    """

    def __init__(self, api_key: str, embedding_model: str = "BAAI/bge-base-en-v1.5", quiet: bool = False, max_workers: int = 4):
        """
        Initialize the optimized resume selector.

        Args:
            api_key (str): Mistral API key for LLM operations
            embedding_model (str): HuggingFace embedding model name
            quiet (bool): If True, suppress all console output
            max_workers (int): Maximum number of parallel workers
        """
        # Suppress PDF extraction warnings
        logging.getLogger("pdfminer").setLevel(logging.ERROR)

        self.quiet = quiet
        self.max_workers = max_workers

        # Initialize Mistral client
        self.mistral_client = Mistral(api_key=api_key)

        # Initialize embedding model
        if not self.quiet:
            print("Loading embedding model...", file=sys.stderr)
            sys.stderr.flush()
        self.embedding_model = SentenceTransformer(embedding_model)
        self.embedding_dim = self.embedding_model.get_sentence_embedding_dimension()

        # Initialize storage
        self.index = None
        self.resumes: List[str] = []
        self.file_paths: List[str] = []
        self.resume_metadata: Dict[str, Any] = {}

        # Thread lock for thread-safe operations
        self.lock = threading.Lock()

        if not self.quiet:
            print("✅ Optimized Resume Selector initialized!", file=sys.stderr)
            sys.stderr.flush()

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text content from a PDF file with timeout."""
        text = ""
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text(
                        x_tolerance=1,
                        y_tolerance=1,
                        keep_blank_chars=False,
                        use_text_flow=True
                    )
                    if page_text:
                        text += page_text + "\n\n"
        except Exception as e:
            if not self.quiet:
                print(f"❌ Error extracting text from {pdf_path}: {e}", file=sys.stderr)
        return text

    def process_single_resume(self, file_path: str) -> tuple:
        """Process a single resume file and return (text, file_path, success)."""
        try:
            text = self.extract_text_from_pdf(file_path)
            if text.strip():
                return (text, file_path, True)
            else:
                if not self.quiet:
                    print(f"⚠️ No text extracted from {file_path}", file=sys.stderr)
                return ("", file_path, False)
        except Exception as e:
            if not self.quiet:
                print(f"❌ Error processing {file_path}: {e}", file=sys.stderr)
            return ("", file_path, False)

    def process_resumes(self, folder_path: str) -> bool:
        """Process all PDF resumes in the given folder with parallel processing."""
        folder = Path(folder_path)
        if not folder.exists():
            if not self.quiet:
                print(f"❌ Folder not found: {folder_path}", file=sys.stderr)
            return False

        # Find all PDF files
        pdf_files = list(folder.glob("*.pdf"))
        if not pdf_files:
            if not self.quiet:
                print(f"❌ No PDF files found in {folder_path}", file=sys.stderr)
            return False

        if not self.quiet:
            print(f"📄 Found {len(pdf_files)} PDF files. Processing with {self.max_workers} workers...", file=sys.stderr)
            sys.stderr.flush()

        # Process PDFs in parallel
        valid_resumes = []
        valid_paths = []
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_file = {executor.submit(self.process_single_resume, str(pdf_file)): pdf_file for pdf_file in pdf_files}
            
            # Collect results as they complete
            for i, future in enumerate(concurrent.futures.as_completed(future_to_file), 1):
                file_path = future_to_file[future]
                try:
                    text, path, success = future.result(timeout=120)  # 30 second timeout per file
                    if success and text.strip():
                        valid_resumes.append(text)
                        valid_paths.append(path)
                    
                    if not self.quiet and i % 10 == 0:  # Progress update every 10 files
                        print(f"📄 Processed {i}/{len(pdf_files)} files...", file=sys.stderr)
                        sys.stderr.flush()
                        
                except Exception as e:
                    if not self.quiet:
                        print(f"❌ Timeout/Error processing {file_path}: {e}", file=sys.stderr)

        if not valid_resumes:
            if not self.quiet:
                print("❌ No valid resumes found after processing", file=sys.stderr)
            return False

        self.resumes = valid_resumes
        self.file_paths = valid_paths

        if not self.quiet:
            print(f"✅ Successfully processed {len(valid_resumes)} valid resumes", file=sys.stderr)
            sys.stderr.flush()

        # Create embeddings in batches for efficiency
        if not self.quiet:
            print("🔄 Creating embeddings...", file=sys.stderr)
            sys.stderr.flush()

        try:
            # Process embeddings in batches
            batch_size = 32
            all_embeddings = []
            
            for i in range(0, len(self.resumes), batch_size):
                batch = self.resumes[i:i + batch_size]
                batch_embeddings = self.embedding_model.encode(batch, show_progress_bar=False)
                all_embeddings.extend(batch_embeddings)
                
                if not self.quiet and i % (batch_size * 2) == 0:
                    print(f"🔄 Embedding batch {i//batch_size + 1}/{(len(self.resumes) + batch_size - 1)//batch_size}...", file=sys.stderr)
                    sys.stderr.flush()

            embeddings_array = np.array(all_embeddings).astype('float32')
            
            # Create FAISS index
            self.index = faiss.IndexFlatIP(self.embedding_dim)
            faiss.normalize_L2(embeddings_array)
            self.index.add(embeddings_array)

            if not self.quiet:
                print("✅ Embeddings created and indexed successfully", file=sys.stderr)
                sys.stderr.flush()

            return True

        except Exception as e:
            if not self.quiet:
                print(f"❌ Error creating embeddings: {e}", file=sys.stderr)
            return False

    def search_resumes(self, query: str, top_k: int = 10) -> List[Dict[str, Any]]:
        """Search for the most relevant resumes using vector similarity."""
        if self.index is None or not self.resumes:
            return []

        try:
            # Create query embedding
            query_embedding = self.embedding_model.encode([query])
            query_embedding = query_embedding.astype('float32')
            faiss.normalize_L2(query_embedding)

            # Search
            scores, indices = self.index.search(query_embedding, min(top_k, len(self.resumes)))

            # Prepare results
            results = []
            for score, idx in zip(scores[0], indices[0]):
                if idx < len(self.file_paths):
                    results.append({
                        "file_name": Path(self.file_paths[idx]).name,
                        "file_path": self.file_paths[idx],
                        "score": float(score),
                        "resume_text": self.resumes[idx][:1000] + "..." if len(self.resumes[idx]) > 1000 else self.resumes[idx]
                    })

            return results

        except Exception as e:
            if not self.quiet:
                print(f"❌ Error searching resumes: {e}", file=sys.stderr)
            return []

    def generate_candidate_summary_batch(self, project_desc: str, candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate summaries for multiple candidates in parallel with detailed logging."""
        if not candidates:
            return []

        if not self.quiet:
            print(f"🔄 Starting batch AI analysis for {len(candidates)} candidates...", file=sys.stderr)
            sys.stderr.flush()

        def process_single_candidate(candidate_data):
            candidate, index = candidate_data
            start_time = time.time()
            candidate_name = candidate["file_name"]
            
            if not self.quiet:
                print(f"  📝 Processing candidate {index+1}/{len(candidates)}: {candidate_name}", file=sys.stderr)
                sys.stderr.flush()
            
            try:
                summary = self.generate_candidate_summary(project_desc, candidate)
                processing_time = time.time() - start_time
                
                if not self.quiet:
                    print(f"  ✅ Completed {candidate_name} in {processing_time:.1f}s", file=sys.stderr)
                    sys.stderr.flush()
                
                return {
                    "file_name": candidate["file_name"],
                    "file_path": candidate["file_path"],
                    "score": candidate["score"],
                    "name": summary.get("name", "Unknown"),
                    "skills": summary.get("skills", []),
                    "reasons": summary.get("reasons", []),
                    "metadata": candidate.get("metadata", {}),
                    "processing_time": processing_time,
                    "status": "success"
                }
            except Exception as e:
                processing_time = time.time() - start_time
                error_msg = str(e)
                
                if not self.quiet:
                    print(f"  ❌ FAILED {candidate_name} after {processing_time:.1f}s: {error_msg}", file=sys.stderr)
                    sys.stderr.flush()
                
                return {
                    "file_name": candidate["file_name"],
                    "file_path": candidate["file_path"],
                    "score": candidate["score"],
                    "name": "Analysis Error",
                    "skills": [],
                    "reasons": [f"AI analysis failed: {error_msg[:100]}..."],
                    "metadata": candidate.get("metadata", {}),
                    "processing_time": processing_time,
                    "status": "failed",
                    "error": error_msg
                }

        # Prepare candidate data with indices for logging
        candidate_data = [(candidate, i) for i, candidate in enumerate(candidates)]
        
        results = []
        success_count = 0
        failed_count = 0
        total_processing_time = 0
        
        # Use smaller batches to avoid overwhelming the API
        batch_size = min(self.max_workers, 4)  # Limit concurrent API calls
        with concurrent.futures.ThreadPoolExecutor(max_workers=batch_size) as executor:
            future_to_data = {
                executor.submit(process_single_candidate, data): data 
                for data in candidate_data
            }
            
            for future in concurrent.futures.as_completed(future_to_data):
                try:
                    result = future.result(timeout=120)  # 2 minute timeout per candidate
                    results.append(result)
                    total_processing_time += result.get("processing_time", 0)
                    
                    if result.get("status") == "success":
                        success_count += 1
                    else:
                        failed_count += 1
                        
                except concurrent.futures.TimeoutError:
                    data = future_to_data[future]
                    candidate, index = data
                    failed_count += 1
                    
                    if not self.quiet:
                        print(f"  ⏰ TIMEOUT: {candidate['file_name']} exceeded 2 minute limit", file=sys.stderr)
                        sys.stderr.flush()
                    
                    results.append({
                        "file_name": candidate["file_name"],
                        "file_path": candidate["file_path"],
                        "score": candidate["score"],
                        "name": "Timeout Error",
                        "skills": [],
                        "reasons": ["AI analysis timed out after 2 minutes"],
                        "metadata": candidate.get("metadata", {}),
                        "processing_time": 120,
                        "status": "timeout"
                    })
                except Exception as e:
                    data = future_to_data[future]
                    candidate, index = data
                    failed_count += 1
                    
                    if not self.quiet:
                        print(f"  💥 EXCEPTION: {candidate['file_name']}: {str(e)}", file=sys.stderr)
                        sys.stderr.flush()
                    
                    results.append({
                        "file_name": candidate["file_name"],
                        "file_path": candidate["file_path"],
                        "score": candidate["score"],
                        "name": "Exception Error",
                        "skills": [],
                        "reasons": [f"Unexpected error: {str(e)[:100]}..."],
                        "metadata": candidate.get("metadata", {}),
                        "processing_time": 0,
                        "status": "exception",
                        "error": str(e)
                    })

        # Log final statistics
        avg_time = total_processing_time / len(results) if results else 0
        if not self.quiet:
            print(f"📊 Batch Analysis Complete:", file=sys.stderr)
            print(f"   ✅ Successful: {success_count}", file=sys.stderr)
            print(f"   ❌ Failed: {failed_count}", file=sys.stderr)
            print(f"   ⏱️  Average time per candidate: {avg_time:.1f}s", file=sys.stderr)
            print(f"   🕒 Total processing time: {total_processing_time:.1f}s", file=sys.stderr)
            sys.stderr.flush()

        # Sort results by score (highest first)
        results.sort(key=lambda x: x["score"], reverse=True)
        return results

    def generate_candidate_summary(self, project_desc: str, candidate: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a summary for a single candidate using LLM with retries."""
        max_retries = 2
        base_delay = 1
        
        for attempt in range(max_retries + 1):
            try:
                resume_text = candidate.get("resume_text", "")
                if not resume_text:
                    return {"name": "Unknown", "skills": [], "reasons": ["No resume text available"]}

                # Truncate resume text to avoid token limits
                max_resume_length = 1500
                truncated_text = resume_text[:max_resume_length]
                if len(resume_text) > max_resume_length:
                    truncated_text += "... [resume truncated]"

                prompt = f"""Analyze this resume for the given project. Be concise and specific.

PROJECT DESCRIPTION:
{project_desc[:500]}

RESUME:
{truncated_text}

Please respond with ONLY a JSON object containing:
- "name": candidate's full name from resume
- "skills": array of 3-5 most relevant technical skills
- "reasons": array of 2-3 specific reasons why this candidate fits the project

JSON Response:"""

                # Add exponential backoff delay for retries
                if attempt > 0:
                    delay = base_delay * (2 ** (attempt - 1))
                    time.sleep(delay)
                    if not self.quiet:
                        print(f"    🔄 Retry {attempt} for {candidate.get('file_name', 'unknown')} after {delay}s delay", file=sys.stderr)

                response = self.mistral_client.chat.complete(
                    model="mistral-small-latest",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=400,
                    temperature=0.3
                )

                content = response.choices[0].message.content.strip()
                
                # Try to extract JSON from the response
                try:
                    # Clean up common JSON formatting issues
                    if content.startswith('```json'):
                        content = content.split('```json')[1].split('```')[0].strip()
                    elif content.startswith('```'):
                        content = content.split('```')[1].split('```')[0].strip()
                    
                    # Remove any leading/trailing text that isn't JSON
                    start_idx = content.find('{')
                    end_idx = content.rfind('}') + 1
                    if start_idx >= 0 and end_idx > start_idx:
                        content = content[start_idx:end_idx]
                    
                    result = json.loads(content)
                    
                    # Validate required fields
                    if not isinstance(result.get("name"), str):
                        result["name"] = "Unknown"
                    if not isinstance(result.get("skills"), list):
                        result["skills"] = []
                    if not isinstance(result.get("reasons"), list):
                        result["reasons"] = ["Analysis completed"]
                    
                    return result
                    
                except json.JSONDecodeError as json_error:
                    if attempt == max_retries:
                        # Last attempt - return fallback
                        return {
                            "name": "JSON Parse Error",
                            "skills": ["Could not parse AI response"],
                            "reasons": [f"JSON parsing failed: {str(json_error)[:50]}..."]
                        }
                    else:
                        # Retry on JSON error
                        if not self.quiet:
                            print(f"    ⚠️ JSON parse error for {candidate.get('file_name', 'unknown')}, retrying...", file=sys.stderr)
                        continue

            except Exception as e:
                error_msg = str(e)
                if attempt == max_retries:
                    # Last attempt - return error result
                    if not self.quiet:
                        print(f"    ❌ Final attempt failed for {candidate.get('file_name', 'unknown')}: {error_msg}", file=sys.stderr)
                    return {
                        "name": "API Error", 
                        "skills": [], 
                        "reasons": [f"API call failed: {error_msg[:50]}..."]
                    }
                else:
                    # Retry on API error
                    if not self.quiet:
                        print(f"    ⚠️ API error for {candidate.get('file_name', 'unknown')}: {error_msg}, retrying...", file=sys.stderr)
                    continue
        
        # Should never reach here, but just in case
        return {"name": "Unexpected Error", "skills": [], "reasons": ["Unexpected processing error"]}

    def get_resume_count(self) -> int:
        """Get the number of processed resumes."""
        return len(self.resumes)
