import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProgramStage } from "../types/program.types";
import { Progress } from "@/components/ui/progress";
import { Brain, FileCode, CheckCircle, AlertCircle, RefreshCw, Upload, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider";

interface ResumeAnalysisModalProps {
  programId: string;
  yearId: string;
  stageId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages?: ProgramStage[]; // Added to allow lookups
}

export function ResumeAnalysisModal({ programId, yearId, stageId, open, onOpenChange, stages = [] }: ResumeAnalysisModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [file, setFile] = useState<File | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [results, setResults] = useState<any[] | null>(null);

  // Initialize from existing results if available
  useEffect(() => {
    if (open && stageId && stages.length > 0) {
      const currentStage = stages.find(s => s.id === stageId);
      if (currentStage?.analysis_results) {
        setResults(currentStage.analysis_results);
      }
    }
  }, [open, stageId, stages]);

  // Handle modal reset when closing
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      if (!isAnalyzing) {
        setResults(null);
        setFile(null);
        setCustomPrompt("");
        setProgress(0);
        setStatusMessage("");
      } else {
        toast({
          title: "Analysis in progress",
          description: "Please wait for the AI analysis to complete.",
          variant: "destructive"
        });
        return; // Prevent closing while analyzing
      }
    }
    onOpenChange(isOpen);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      const name = selected.name.toLowerCase();
      const isZip = name.endsWith(".zip") || selected.type === "application/zip" || selected.type === "application/x-zip-compressed";
      const isPdf = name.endsWith(".pdf") || selected.type === "application/pdf";
      
      if (!isZip && !isPdf) {
        toast({
          title: "Invalid file type",
          description: "Please upload a ZIP file containing resumes or a single PDF resume.",
          variant: "destructive",
        });
        return;
      }
      setFile(selected);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      toast({
        title: "Missing ZIP file",
        description: "Please upload a ZIP file of resumes to analyze.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setResults(null);
    setProgress(0);
    setStatusMessage("Starting AI Analysis...");
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (customPrompt.trim()) {
        formData.append("customPrompt", customPrompt);
      }

      const url = `/api/programs/${programId}/years/${yearId}/stages/${stageId}/analyze?t=${Date.now()}`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "x-user-id": user?.id || "",
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to analyze resumes");
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            
            let event;
            try {
              event = JSON.parse(line);
            } catch (e) {
              console.error("Error parsing stream event JSON:", e, line);
              continue;
            }

            if (event.type === "progress") {
              setProgress(event.progress);
              setStatusMessage(event.message);
            } else if (event.type === "complete") {
              setResults(event.shortlisted_candidates);
              toast({
                title: "Analysis Complete!",
                description: `Successfully analyzed ${event.total_resumes} candidates.`,
              });
            } else if (event.type === "error") {
              throw new Error(event.message || "Unknown analysis error");
            }
          }
        }

        if (done) {
          if (buffer.trim()) {
            try {
              const event = JSON.parse(buffer);
              if (event.type === "complete") {
                setResults(event.shortlisted_candidates);
                toast({ title: "Analysis Complete!" });
              }
            } catch (e) {
              console.error("Failed to parse remainder buffer", e);
            }
          }
          break;
        }
      }
    } catch (error: any) {
      console.error("Error analyzing resumes:", error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Something went wrong during the analysis.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRemoveCandidate = async (indexToRemove: number) => {
    if (!results) return;
    const updatedResults = results.filter((_, idx) => idx !== indexToRemove);
    setResults(updatedResults);
    
    // Also save the updated list to the database
    try {
      await fetch(`/api/programs/${programId}/years/${yearId}/stages/${stageId}/analyze`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis_results: updatedResults })
      });
    } catch (e) {
      console.error("Failed to update database after removal", e);
    }
  };

  const exportToCSV = () => {
    if (!results || results.length === 0) return;

    const csvHeaders = ["Rank", "Candidate File", "Candidate Name", "Match Score", "Top Skills", "AI Reasons"];
    
    const csvRows = results.map((candidate, index) => {
      const skills = (candidate.skills || []).join('; ').replace(/"/g, '""');
      const reasons = (candidate.reasons || []).join('; ').replace(/"/g, '""');
      const score = (candidate.score * 100).toFixed(1) + '%';
      
      let candidateName = candidate.name;
      if (!candidateName || candidateName.toLowerCase() === "unknown" || candidateName.toLowerCase() === "not specified") {
        candidateName = candidate.file_name ? candidate.file_name.replace(/\.[^/.]+$/, "").split(" - ").pop() : "Unknown Candidate";
      }
      
      return [
        index + 1,
        `"${candidate.file_name || ''}"`,
        `"${candidateName}"`,
        `"${score}"`,
        `"${skills}"`,
        `"${reasons}"`
      ].join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Stage_Resume_Analysis_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-auto max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Brain className="h-5 w-5 text-blue-600" />
            </div>
            <DialogTitle className="text-xl">Resume AI Analysis</DialogTitle>
          </div>
          <DialogDescription>
            Bulk upload an archive of PDF resumes. Mistral AI will extract them, read the contents, and rank them against your custom parameters indicating the top students.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 flex-1 overflow-y-auto pr-2 space-y-6">
          {!results ? (
            <>
              {/* Upload Section */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Step 1: Upload Resumes (ZIP or PDF)
                </Label>
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    file ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50 bg-gray-50'
                  }`}
                >
                  <Input 
                    type="file" 
                    accept=".zip,.pdf" 
                    className="hidden" 
                    id="resume-upload"
                    onChange={handleFileChange}
                    disabled={isAnalyzing}
                  />
                  <Label htmlFor="resume-upload" className="cursor-pointer flex flex-col items-center gap-3">
                    <div className={`p-4 rounded-full ${file ? 'bg-primary text-primary-foreground' : 'bg-white shadow-sm'}`}>
                      {file ? <FileCode className="h-6 w-6" /> : <Upload className="h-6 w-6 text-gray-400" />}
                    </div>
                    {file ? (
                      <div className="space-y-1 text-center">
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-500">Supports ZIP archives or single PDF resumes</p>
                      </div>
                    )}
                  </Label>
                </div>
              </div>

              {/* Parameters Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="customPrompt" className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                    Step 2: Analysis Parameters
                  </Label>
                </div>
                <Textarea
                  id="customPrompt"
                  placeholder="E.g., Look for students with strong React and Node.js skills, and previous hackathon experience..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  disabled={isAnalyzing}
                  rows={4}
                  className="resize-none font-medium placeholder:font-normal"
                />
                <p className="text-xs text-gray-500">
                  Describe what the AI should look for when ranking these resumes. If left blank, it will rank based on general skill matching.
                </p>
              </div>

              {/* Action Button & Progress */}
              <div className="pt-2 space-y-4">
                {isAnalyzing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium text-blue-700">
                      <span>{statusMessage}</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-blue-100" />
                  </div>
                )}
                
                <Button 
                  onClick={handleAnalyze} 
                  disabled={!file || isAnalyzing}
                  className="w-full h-12 text-base font-semibold transition-all"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                      Mistral AI is Processing...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-5 w-5" />
                      Run AI Analysis
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Results View */}
              <div className="space-y-4">
                <div className="flex items-center justify-between sticky top-0 bg-white pb-2 border-b z-10">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Analysis Completed
                    </h3>
                    <p className="text-sm text-gray-500">Ranked {results.length} resumes from {file?.name}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setResults(null)}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Analyze New File
                    </Button>
                    <Button size="sm" onClick={exportToCSV}>
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {results.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed">
                      <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="font-medium text-gray-700">No matching candidates found</p>
                      <p className="text-sm text-gray-500">Try adjusting your custom prompt.</p>
                    </div>
                  ) : (
                    results.map((candidate, index) => {
                          let displayName = candidate.name;
                          if (!displayName || displayName.toLowerCase() === "unknown" || displayName.toLowerCase() === "not specified" || displayName === "") {
                            const withoutExt = candidate.file_name?.replace(/\.(pdf|docx?)$/i, '') || '';
                            // If filename has " - ", take everything after the last " - " as the name
                            const parts = withoutExt.split(' - ');
                            displayName = (parts.length > 1 ? parts[parts.length - 1] : withoutExt).trim() || "Unknown Candidate";
                          }

                          return (
                            <div key={index} className="bg-white border rounded-xl p-4 shadow-sm relative overflow-hidden group">
                              {/* Rank Badge */}
                              <div className="absolute top-0 right-0 bg-blue-500 text-white rounded-bl-xl px-4 py-1.5 font-bold shadow-sm">
                                #{index + 1}
                              </div>
                              
                              <div className="flex items-start gap-4 pr-16 mt-1">
                                <div className="flex-1 space-y-3">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-bold text-gray-900 text-lg">{displayName}</h4>
                                      <Badge variant={candidate.score >= 0.8 ? "default" : candidate.score >= 0.6 ? "secondary" : "outline"}>
                                        {(candidate.score * 100).toFixed(1)}% Match
                                      </Badge>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-1"
                                  onClick={() => handleRemoveCandidate(index)}
                                  title="Remove candidate from list"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                                <div className="text-xs font-mono text-gray-500 flex items-center gap-1.5">
                                  <FileCode className="h-3.5 w-3.5" />
                                  {candidate.file_url ? (
                                    <a 
                                      href={candidate.file_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-500 hover:text-blue-700 hover:underline inline-flex items-center"
                                      onClick={(e) => e.stopPropagation()}
                                      title="Open PDF"
                                    >
                                      {candidate.file_name}
                                    </a>
                                  ) : (
                                    <span>{candidate.file_name}</span>
                                  )}
                                </div>
                            </div>

                            {candidate.skills?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {candidate.skills.slice(0, 5).map((skill: string, i: number) => (
                                  <span key={i} className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                                    {skill}
                                  </span>
                                ))}
                                {candidate.skills.length > 5 && (
                                  <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 text-xs font-medium border">
                                    +{candidate.skills.length - 5}
                                  </span>
                                )}
                              </div>
                            )}

                            {candidate.reasons?.length > 0 && (
                              <div className="bg-slate-50 p-3 rounded-lg border text-sm text-slate-700">
                                <span className="font-semibold block mb-1">AI Reasoning:</span>
                                <ul className="space-y-1 list-disc list-inside">
                                  {candidate.reasons.slice(0, 3).map((reason: string, i: number) => (
                                    <li key={i} className="text-xs">{reason}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
