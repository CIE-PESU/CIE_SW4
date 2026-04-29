"use client"

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/components/auth-provider";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { programsService } from "@/features/programs/services/programs.service";
import { ProgramYear, BaseProgram, ProgramStage } from "@/features/programs/types/program.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  ChevronLeft,
  Calendar,
  Clock,
  Edit,
  Archive,
  GraduationCap,
  Home,
  Users,
  Award,
  Briefcase,
  BookOpen,
  MapPin,
  Wrench,
  FolderOpen,
  Brain,
  ClipboardCheck,
  BarChart3
} from "lucide-react";
import { useProgramStages } from "@/features/programs/hooks/useProgramStages";
import { useStageMutations } from "@/features/programs/hooks/useStageMutations";
import { StageList } from "@/features/programs/components/StageList";
import { CreateStageModal } from "@/features/programs/components/CreateStageModal";
import { EditStageModal } from "@/features/programs/components/EditStageModal";
import { ArchiveStageModal } from "@/features/programs/components/ArchiveStageModal";
import { ResumeAnalysisModal } from "@/features/programs/components/ResumeAnalysisModal";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShortlistTabView } from "@/features/programs/components/ShortlistTabView";

export default function YearDetailPage() {
  const params = useParams();
  const programId = params?.programId as string;
  const yearId = params?.yearId as string;

  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [program, setProgram] = useState<BaseProgram | null>(null);
  const [year, setYear] = useState<ProgramYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { stages, setStages, loading: stagesLoading, refresh: refreshStages } = useProgramStages(programId, yearId);
  const { createStage, updateStage, deleteStage, reorderStages, isMutating } = useStageMutations(programId, yearId, refreshStages);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<ProgramStage | null>(null);
  const [deletingStage, setDeletingStage] = useState<ProgramStage | null>(null);
  const [analyzingStage, setAnalyzingStage] = useState<ProgramStage | null>(null);

  const isAdmin = user?.role === "ADMIN";
  const isAdminOrFaculty = user?.role === "ADMIN" || user?.role === "FACULTY";

  useEffect(() => {
    const loadData = async () => {
      if (!user || !programId || !yearId) return;

      try {
        setLoading(true);
        setError(null);
        const [progData, yearData] = await Promise.all([
          programsService.getProgram(user.id, programId),
          programsService.getProgramYear(user.id, programId, yearId)
        ]);
        setProgram(progData);
        setYear(yearData);
      } catch (err: any) {
        console.error("Error loading year details:", err);
        setError(err.message || "Failed to load program details");
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      loadData();
    }
  }, [user, authLoading, programId, yearId]);

  const handlePageChange = useCallback((pageId: string) => {
    router.push(`/?page=${pageId}`);
  }, [router]);

  const menuItems = useMemo(() => {
    if (user?.role === "ADMIN") {
      return [
        { id: "home", label: "Dashboard", icon: Home },
        { id: "domains", label: "Coordinators", icon: Award },
        { id: "users", label: "Users", icon: Users },
        { id: "faculty", label: "Faculty", icon: Briefcase },
        { id: "students", label: "Students", icon: Users },
        { id: "courses", label: "Courses", icon: BookOpen },
        { id: "locations", label: "Room Bookings", icon: MapPin },
        { id: "lab-components", label: "Lab Components", icon: Wrench },
        { id: "library", label: "Library", icon: BookOpen },
        { id: "projects", label: "Projects", icon: FolderOpen },
        { id: "programs", label: "Programs", icon: GraduationCap },
        { id: "opportunities", label: "Opportunities", icon: Briefcase },
        { id: "schedules", label: "Class Schedules", icon: Calendar, disabled: true },
      ];
    } else if (user?.role === "FACULTY") {
      return [
        { id: "home", label: "Dashboard", icon: Home },
        { id: "courses", label: "Courses", icon: Users },
        { id: "locations", label: "Book Rooms", icon: MapPin },
        { id: "projects", label: "Projects", icon: FolderOpen },
        { id: "programs", label: "Programs", icon: GraduationCap },
        { id: "lab-components", label: "Lab Components", icon: Wrench },
        { id: "library", label: "Library", icon: BookOpen },
        { id: "opportunities", label: "Opportunities", icon: Briefcase },
        { id: "feedbacks", label: "Feedbacks", icon: BarChart3 },
        { id: "attendance", label: "Attendance", icon: ClipboardCheck, disabled: true },
        { id: "calendar", label: "Calendar", icon: Calendar, disabled: true },
      ];
    } else {
      return [
        { id: "home", label: "Dashboard", icon: Home },
        { id: "calendar", label: "Calendar", icon: Calendar },
        { id: "courses", label: "Courses", icon: BookOpen },
        { id: "projects", label: "Projects", icon: FolderOpen },
        { id: "programs", label: "Programs", icon: GraduationCap },
        { id: "lab-components", label: "Lab Components", icon: Wrench },
        { id: "library", label: "Library", icon: BookOpen },
        { id: "opportunities", label: "Opportunities", icon: Briefcase },
        { id: "attendance", label: "Attendance", icon: ClipboardCheck, disabled: true },
        { id: "locations", label: "Class Locations", icon: MapPin, disabled: true },
      ];
    }
  }, [user?.role]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming": return "bg-blue-100 text-blue-800";
      case "ongoing": return "bg-orange-100 text-orange-800";
      case "completed": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleReorder = useCallback(async (newOrderedIds: string[]) => {
    const reorderedStages = [...stages].sort((a, b) => {
      return newOrderedIds.indexOf(a.id) - newOrderedIds.indexOf(b.id);
    }).map((s, i) => ({ ...s, order: i + 1 }));

    setStages(reorderedStages);

    try {
      await reorderStages(newOrderedIds);
    } catch (error) {
      // Refresh on error handled in hook
    }
  }, [stages, setStages, reorderStages]);


  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !program || !year) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">Something went wrong</h2>
          <p className="text-muted-foreground">{error || "Program or Year not found"}</p>
        </div>
        <Button onClick={() => router.push("/")}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <DashboardLayout
      currentPage="programs"
      onPageChange={handlePageChange}
      menuItems={menuItems}
    >

      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => router.push("/?page=programs")} className="cursor-pointer">
                Programs
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{program.name}</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-blue-600">{year.label}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border dark:border-slate-700 shadow-sm">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{year.label}</h1>
              <Badge className={getStatusColor(year.status)}>
                {year.status}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-sm text-gray-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="font-medium">
                  {new Date(year.startDate).toLocaleDateString()} - {new Date(year.endDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="font-medium">Academic Year {year.year}</span>
              </div>
            </div>

            {year.description && (
              <p className="text-gray-600 dark:text-slate-400 max-w-4xl text-sm leading-relaxed border-t dark:border-slate-700 pt-3 mt-2">
                {year.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/?page=programs")}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="stages" className="space-y-6">
          <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-11 border dark:border-slate-700">
            <TabsTrigger value="stages" className="rounded-lg px-6 font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:text-white">
              Stages
            </TabsTrigger>
            <TabsTrigger value="shortlist" className="rounded-lg px-6 font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm dark:text-slate-300 dark:data-[state=active]:text-white">
              Shortlist
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stages" className="space-y-6 outline-none">
            {/* Stages Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Programs</h2>
                  <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                    {stages.length}
                  </Badge>
                </div>
                {isAdminOrFaculty && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => stages.length > 0 && setAnalyzingStage(stages[0])}
                      disabled={stages.length === 0}
                      className="shadow-sm border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                      <Brain className="mr-2 h-4 w-4" />
                      Analyze Resumes
                    </Button>
                    <Button size="sm" onClick={() => setIsCreateOpen(true)} className="shadow-sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Stage
                    </Button>
                  </div>
                )}
              </div>

              {stagesLoading ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 w-full bg-gray-100 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : (
                <StageList
                  stages={stages}
                  onReorder={handleReorder}
                  onEdit={setEditingStage}
                  onDelete={setDeletingStage}
                  onAnalyze={setAnalyzingStage}
                  onAddClick={() => setIsCreateOpen(true)}
                  isAdmin={isAdmin}
                  isAdminOrFaculty={isAdminOrFaculty}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="shortlist" className="outline-none">
            <ShortlistTabView stages={stages} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <CreateStageModal
        year={year}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={createStage}
        loading={isMutating}
      />

      <EditStageModal
        stage={editingStage}
        open={!!editingStage}
        onOpenChange={(open) => !open && setEditingStage(null)}
        onSubmit={updateStage}
        loading={isMutating}
      />

      <ArchiveStageModal
        stage={deletingStage}
        open={!!deletingStage}
        onOpenChange={(open) => !open && setDeletingStage(null)}
        onConfirm={deleteStage}
        loading={isMutating}
      />

      <ResumeAnalysisModal
        programId={programId}
        yearId={yearId}
        stageId={analyzingStage?.id || ""}
        open={!!analyzingStage}
        onOpenChange={(open) => !open && setAnalyzingStage(null)}
        stages={stages}
      />
    </DashboardLayout>
  );
}
