"use client"

import React, { useState } from "react";
import { ProgramStage } from "@/features/programs/types/program.types";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Brain, 
  Download, 
  FileText, 
  Filter, 
  Star,
  Search,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface ShortlistTabViewProps {
  stages: ProgramStage[];
}

export function ShortlistTabView({ stages }: ShortlistTabViewProps) {
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const getDisplayName = (name: string, filename: string) => {
    if (!name || name === "Not specified" || name === "Unknown" || name.toLowerCase().includes("not specified") || name === "") {
      const withoutExt = filename?.replace(/\.(pdf|docx?)$/i, '') || '';
      // If filename has " - ", take everything after the last " - " as the name
      const parts = withoutExt.split(' - ');
      return (parts.length > 1 ? parts[parts.length - 1] : withoutExt).trim() || "Unknown Candidate";
    }
    return name;
  };

  // Aggregate all results from analyzed stages
  const allResults = stages.flatMap(stage => {
    if (!stage.analysis_results) return [];
    return stage.analysis_results.map(res => ({
      ...res,
      stageName: stage.name,
      stageId: stage.id,
      analyzedAt: stage.last_analyzed_at
    }));
  }).sort((a, b) => b.score - a.score);

  const filteredResults = allResults.filter(res => {
    const matchesStage = selectedStage === "all" || res.stageId === selectedStage;
    const matchesSearch = 
      res.file_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getDisplayName(res.ai_analysis?.name, res.file_name).toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.ai_analysis?.skills?.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesStage && matchesSearch;
  });

  const exportToCSV = () => {
    if (filteredResults.length === 0) return;

    const csvHeaders = ["Rank", "Stage", "File Name", "Candidate Name", "Score", "Top Skills", "AI Reasons"];
    
    const csvRows = filteredResults.map((candidate, index) => {
      const skills = (candidate.ai_analysis?.skills || []).join('; ').replace(/"/g, '""');
      const reasons = (candidate.ai_analysis?.reasons || []).join('; ').replace(/"/g, '""');
      const score = (candidate.score * 100).toFixed(1) + '%';
      
      return [
        index + 1,
        `"${candidate.stageName || ''}"`,
        `"${candidate.file_name || ''}"`,
        `"${getDisplayName(candidate.ai_analysis?.name, candidate.file_name)}"`,
        score,
        `"${skills}"`,
        `"${reasons}"`
      ].join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `program_shortlist_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (allResults.length === 0) {
    return (
      <Card className="border-dashed h-64 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 dark:border-slate-700">
        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
          <Brain className="h-8 w-8 text-slate-400" />
        </div>
        <CardTitle className="text-slate-600 dark:text-slate-300 mb-2">No Shortlist Available</CardTitle>
        <CardDescription className="text-center max-w-sm px-6">
          Use the **Analyze Resumes** button in the Stages tab to start ranking candidates using Mistral AI.
        </CardDescription>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-700 shadow-sm">
        <div className="flex flex-1 items-center gap-3 w-full">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by name or skill..." 
              className="pl-9 h-10 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={selectedStage} onValueChange={setSelectedStage}>
            <SelectTrigger className="w-[200px] h-10 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100">
              <Filter className="mr-2 h-4 w-4 text-slate-400" />
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
              <SelectItem value="all">All Stages</SelectItem>
              {stages.filter(s => !!s.analysis_results).map(stage => (
                <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={exportToCSV} variant="outline" className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950 h-10 shadow-sm shrink-0">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="border dark:border-slate-700 shadow-md overflow-hidden bg-white dark:bg-slate-900 rounded-2xl">
        <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
          <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-700">
            <TableHead className="w-[80px] font-bold text-slate-600 dark:text-slate-300">Rank</TableHead>
            <TableHead className="w-[150px] font-bold text-slate-600 dark:text-slate-300">Stage</TableHead>
            <TableHead className="font-bold text-slate-600 dark:text-slate-300">Candidate Information</TableHead>
            <TableHead className="w-[120px] font-bold text-slate-600 dark:text-slate-300">Match Score</TableHead>
            <TableHead className="font-bold text-slate-600 dark:text-slate-300">Top Skills</TableHead>
            <TableHead className="font-bold text-slate-600 dark:text-slate-300">AI Reasoning</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredResults.map((candidate, index) => (
            <TableRow key={`${candidate.stageId}-${candidate.file_name}-${index}`} className="group hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors border-slate-100 dark:border-slate-800">
              <TableCell className="font-bold text-slate-400 dark:text-slate-500">
                <div className="flex items-center gap-2">
                  {index < 3 && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                  #{index + 1}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium border-slate-200 dark:border-slate-600">
                  {candidate.stageName}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {getDisplayName(candidate.ai_analysis?.name, candidate.file_name)}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <FileText className="h-3 w-3" />
                    {candidate.file_url ? (
                      <a href={candidate.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400 hover:underline">
                        {candidate.file_name}
                      </a>
                    ) : (
                      <span>{candidate.file_name}</span>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <span className={`text-sm font-bold ${
                    candidate.score > 0.8 ? 'text-green-600' : 
                    candidate.score > 0.6 ? 'text-blue-600' : 'text-slate-600'
                  }`}>
                    {(candidate.score * 100).toFixed(1)}%
                  </span>
                  <div className="h-1.5 w-20 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        candidate.score > 0.8 ? 'bg-green-500' : 
                        candidate.score > 0.6 ? 'bg-blue-500' : 'bg-slate-400'
                      }`}
                      style={{ width: `${candidate.score * 100}%` }}
                    />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {candidate.ai_analysis?.skills?.slice(0, 4).map((skill: string) => (
                    <Badge 
                      key={skill} 
                      variant="secondary" 
                      className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 border-indigo-100 dark:border-indigo-800 text-[10px] px-1.5 leading-tight"
                    >
                      {skill}
                    </Badge>
                  ))}
                  {(candidate.ai_analysis?.skills?.length || 0) > 4 && (
                    <span className="text-[10px] text-slate-400">+{candidate.ai_analysis.skills.length - 4} more</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1 max-w-sm">
                  {candidate.ai_analysis?.reasons?.slice(0, 2).map((reason: string, i: number) => (
                    <div key={i} className="flex gap-1.5 items-start text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
                      {reason}
                    </div>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Card>
      
      <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-dashed dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs">
        <AlertCircle className="h-4 w-4" />
        Results are persisted in the database. You can close this page and return at any time to view the latest shortlist.
      </div>
    </div>
  );
}
