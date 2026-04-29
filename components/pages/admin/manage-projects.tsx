"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FolderOpen,
  Calendar,
  Users,
  RefreshCw,
  Search,
  Filter,
  Info,
  User,
  Mail,
  FileText,
  ClipboardList,

} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider";

interface Project {
  id: string;
  name: string;
  description: string;
  course_id?: string;
  components_needed: string[];
  expected_completion_date: string;
  created_by: string;
  modified_by?: string;
  created_date: string;
  modified_date: string;
  accepted_by?: string;
  status: string;
  type: string;
  enrollment_status: string;
  enrollment_cap?: number;
  enrollment_start_date?: string;
  enrollment_end_date?: string;
  faculty_creator?: {
    id: string;
    user: {
      name: string;
      email: string;
    };
    department: string;
  };
  components_needed_details?: Array<{
    id: string;
    component_name: string;
    component_category: string;
  }>;
  submissions?: ProjectSubmission[];
  project_requests?: ProjectRequest[];
}

interface ProjectSubmission {
  id: string;
  projectId: string;
  studentId: string;
  student: {
    user: {
      name: string;
    };
  };
  content: string;
  attachments: string[];
  marks: number | null;
  feedback: string | null;
  status: string;
  submissionDate: string;
}

interface ProjectRequest {
  id: string;
  project_id: string;
  student_id: string;
  faculty_id: string;
  request_date: string;
  status: string;
  student_notes?: string;
  faculty_notes?: string;
  student: {
    user: {
      name: string;
    };
  };
  faculty: {
    user: {
      name: string;
    };
  };
}

export function ManageProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/projects", {
        headers: {
          "x-user-id": user?.id || "",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      } else {
        throw new Error("Failed to fetch projects");
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "APPROVED":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "ONGOING":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "COMPLETED":
        return "bg-emerald-100 text-emerald-800";
      case "OVERDUE":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "REJECTED":
        return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100";
    }
  };

  const getTypeLabel = (type: string) => {
    return type === "FACULTY_ASSIGNED" ? "Faculty Assigned" : "Student Proposed";
  };

  const getTypeColor = (type: string) => {
    return type === "FACULTY_ASSIGNED"
      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
      : "bg-indigo-100 text-indigo-800";
  };

  const getEnrollmentStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "CLOSED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "NOT_STARTED":
        return "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400";
    }
  };

  const getSubmissionStatusColor = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "GRADED":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100";
    }
  };

  // Filtering logic
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(search.toLowerCase()) ||
      project.description.toLowerCase().includes(search.toLowerCase()) ||
      (project.faculty_creator?.user.name || "")
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;
    const matchesType = typeFilter === "all" || project.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });


  const statusOptions = [
    "PENDING",
    "APPROVED",
    "ONGOING",
    "COMPLETED",
    "OVERDUE",
    "REJECTED",
  ];

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const openDetail = (project: Project) => {
    setSelectedProject(project);
    setIsDetailOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="w-full p-0 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="admin-page-title">Projects</h2>
        <Button onClick={fetchProjects} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>


      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:gap-4 gap-2">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <Filter className="h-5 w-5 text-gray-400 mx-2 hidden md:inline-block" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="FACULTY_ASSIGNED">Faculty Assigned</option>
          <option value="STUDENT_PROPOSED">Student Proposed</option>
        </select>
        <span className="text-sm text-muted-foreground ml-auto">
          Showing {filteredProjects.length} of {projects.length} projects
        </span>
      </div>

      {/* Project Cards Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <div className="text-lg font-medium mb-2">No projects found</div>
          <p className="text-sm">
            {search || statusFilter !== "all" || typeFilter !== "all"
              ? "Try adjusting your search or filters."
              : "No projects have been created yet."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => openDetail(project)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2 flex-1 min-w-0">
                    <FolderOpen className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="truncate">{project.name}</span>
                  </CardTitle>
                  <Badge className={`${getStatusColor(project.status)} text-xs flex-shrink-0`}>
                    {project.status}
                  </Badge>
                </div>
                <Badge
                  variant="outline"
                  className={`${getTypeColor(project.type)} text-xs w-fit`}
                >
                  {getTypeLabel(project.type)}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Description */}
                <p
                  className="text-sm text-gray-600 dark:text-gray-400 overflow-hidden"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical" as const,
                    overflow: "hidden",
                  }}
                >
                  {project.description || "No description provided."}
                </p>

                {/* Faculty Creator */}
                {project.faculty_creator && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <User className="h-3.5 w-3.5" />
                    <span>
                      {project.faculty_creator.user.name}
                    </span>
                  </div>
                )}

                {/* Due Date */}
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Calendar className="mr-2 h-3.5 w-3.5" />
                  <span>Due: {formatDate(project.expected_completion_date)}</span>
                </div>

                {/* Enrollment */}
                <div className="flex items-center gap-2 text-sm">
                  <Badge
                    variant="outline"
                    className={`${getEnrollmentStatusColor(project.enrollment_status)} text-xs`}
                  >
                    Enrollment: {project.enrollment_status.replace("_", " ")}
                  </Badge>
                  {project.enrollment_cap && (
                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                      Cap: {project.enrollment_cap}
                    </span>
                  )}
                </div>

                {/* Summary stats */}
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-1 border-t">
                  <div className="flex items-center gap-1">
                    <ClipboardList className="h-3.5 w-3.5" />
                    {project.project_requests?.length || 0} Applications
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {project.submissions?.length || 0} Submissions
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <FolderOpen className="h-5 w-5 text-blue-600" />
                  {selectedProject.name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-2">
                {/* Status & Type Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={getStatusColor(selectedProject.status)}>
                    {selectedProject.status}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={getTypeColor(selectedProject.type)}
                  >
                    {getTypeLabel(selectedProject.type)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={getEnrollmentStatusColor(
                      selectedProject.enrollment_status
                    )}
                  >
                    Enrollment: {selectedProject.enrollment_status.replace("_", " ")}
                  </Badge>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {selectedProject.description || "No description provided."}
                  </p>
                </div>

                {/* Project Details Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedProject.faculty_creator && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Created By</span>
                      <div className="flex items-center gap-1 mt-1 text-gray-600 dark:text-gray-400">
                        <User className="h-3.5 w-3.5" />
                        {selectedProject.faculty_creator.user.name}
                      </div>
                      <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs">
                        <Mail className="h-3 w-3" />
                        {selectedProject.faculty_creator.user.email}
                      </div>
                      {selectedProject.faculty_creator.department && (
                        <div className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                          Dept: {selectedProject.faculty_creator.department}
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Due Date</span>
                    <div className="flex items-center gap-1 mt-1 text-gray-600 dark:text-gray-400">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(selectedProject.expected_completion_date)}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Created</span>
                    <div className="text-gray-600 dark:text-gray-400 mt-1">
                      {formatDate(selectedProject.created_date)}
                    </div>
                  </div>
                  {selectedProject.enrollment_cap && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Enrollment Cap
                      </span>
                      <div className="text-gray-600 dark:text-gray-400 mt-1">
                        {selectedProject.enrollment_cap} students
                      </div>
                    </div>
                  )}
                </div>

                {/* Components Needed */}
                {selectedProject.components_needed_details &&
                  selectedProject.components_needed_details.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Components Needed
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProject.components_needed_details.map(
                          (comp) => (
                            <Badge key={comp.id} variant="outline" className="text-xs">
                              {comp.component_name}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* Applications / Project Requests */}
                {selectedProject.project_requests &&
                  selectedProject.project_requests.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Student Applications ({selectedProject.project_requests.length})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {selectedProject.project_requests.map((req) => (
                          <div
                            key={req.id}
                            className="flex items-center justify-between p-2 rounded-md bg-gray-50 dark:bg-slate-800 dark:bg-gray-800 border text-sm"
                          >
                            <div>
                              <span className="font-medium">
                                {req.student?.user?.name || "Unknown"}
                              </span>
                              <span className="text-gray-400 text-xs ml-2">
                                {formatDate(req.request_date)}
                              </span>
                            </div>
                            <Badge
                              className={`text-xs ${
                                req.status === "APPROVED"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                  : req.status === "REJECTED"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                              }`}
                            >
                              {req.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Submissions */}
                {selectedProject.submissions &&
                  selectedProject.submissions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        Submissions ({selectedProject.submissions.length})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {selectedProject.submissions.map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between p-2 rounded-md bg-gray-50 dark:bg-slate-800 dark:bg-gray-800 border text-sm"
                          >
                            <div>
                              <span className="font-medium">
                                {sub.student?.user?.name || "Unknown"}
                              </span>
                              <span className="text-gray-400 text-xs ml-2">
                                {formatDate(sub.submissionDate)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {sub.marks !== null && (
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                  {sub.marks} marks
                                </span>
                              )}
                              <Badge
                                className={`text-xs ${getSubmissionStatusColor(sub.status)}`}
                              >
                                {sub.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Empty states for no applications/submissions */}
                {(!selectedProject.project_requests ||
                  selectedProject.project_requests.length === 0) &&
                  (!selectedProject.submissions ||
                    selectedProject.submissions.length === 0) && (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      No student applications or submissions yet.
                    </div>
                  )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
