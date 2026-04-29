import { ProgramStage } from "../types/program.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GripVertical, Edit, Trash2, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface StageCardProps {
  stage: ProgramStage;
  onEdit: (stage: ProgramStage) => void;
  onDelete: (stage: ProgramStage) => void;
  isAdmin: boolean;
  isAdminOrFaculty: boolean;
  isDragging?: boolean;
  dragHandleProps?: any;
  onAnalyze?: (stage: ProgramStage) => void;
}

export function StageCard({ 
  stage, 
  onEdit, 
  onDelete, 
  isAdmin, 
  isAdminOrFaculty, 
  isDragging,
  dragHandleProps,
  onAnalyze
}: StageCardProps) {
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "ongoing":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDateLabel = (start?: string, end?: string) => {
    if (!start && !end) return null;
    if (start && end) {
      return `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`;
    }
    return new Date(start || end!).toLocaleDateString();
  };

  return (
    <div 
      className={cn(
        "group relative flex items-center gap-4 bg-white p-4 rounded-xl border shadow-sm transition-all duration-200",
        isDragging ? "shadow-lg scale-[1.02] border-blue-300 z-50 ring-2 ring-blue-50" : "hover:shadow-md hover:border-blue-200"
      )}
    >
      {/* Drag Handle */}
      {isAdminOrFaculty && (
        <div 
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
        >
          <GripVertical className="h-5 w-5" />
        </div>
      )}

      {/* Order Number Row */}
      <div className="flex-shrink-0">
        <span className="text-xs font-mono font-medium text-gray-400">
          {stage.order.toString().padStart(2, '0')}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <h4 className="text-base font-semibold text-gray-900 truncate">
              {stage.name}
            </h4>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 h-5 font-medium uppercase tracking-wider", getStatusColor(stage.status))}>
              {stage.status}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isAdminOrFaculty && onAnalyze && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50"
                onClick={() => onAnalyze(stage)}
                title="Analyze Resumes"
              >
                <Brain className="h-4 w-4" />
              </Button>
            )}
            {isAdminOrFaculty && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                onClick={() => onEdit(stage)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {isAdmin && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                onClick={() => onDelete(stage)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {stage.description && (
          <p className="text-sm text-gray-500 line-clamp-1 max-w-2xl">
            {stage.description}
          </p>
        )}

        {formatDateLabel(stage.startDate, stage.endDate) && (
          <div className="text-[11px] font-medium text-gray-400 uppercase tracking-tight">
            {formatDateLabel(stage.startDate, stage.endDate)}
          </div>
        )}
      </div>
    </div>
  );
}
