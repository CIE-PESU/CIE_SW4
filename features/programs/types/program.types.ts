export type ProgramStatus = "active" | "archived";
export type YearStatus = "upcoming" | "ongoing" | "completed";

export interface BaseProgram {
  id: string;
  name: string;
  description: string;
  status: ProgramStatus;
  createdAt: string;
  createdBy: string;
  yearCount?: number;
}

export type StageStatus = "upcoming" | "ongoing" | "completed";

export interface ProgramStage {
  id: string;
  yearId: string;             // parent ProgramYear
  programId: string;          // grandparent BaseProgram (for convenience)
  name: string;               // fully user-defined, free text, e.g. "Week 3 - Branding"
  description?: string;
  order: number;              // integer, 1-based, controls display sequence
  startDate?: string;         // optional ISO date
  endDate?: string;           // optional ISO date
  status: StageStatus;        // default: "upcoming"
  createdAt: string;
  createdBy: string;          // user ID ref
  analysis_results?: any[];   // JSON from AI analysis
  last_analyzed_at?: string;  // ISO date
}

export interface ProgramYear {
  id: string;
  programId: string;
  year: number;
  label: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: YearStatus;
  createdAt: string;
  createdBy: string;
  stageCount?: number;        // derived, for display on year cards
}

