"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FolderOpen,
  Users,
  Clock,
  Search,
  ExternalLink,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  ChevronDown,
  UserCircle,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAdminStore } from "@/store/adminStore";
import NewSpecDialog from "@/components/admin/NewSpecDialog";

interface ProjectSummary {
  projectId: string;
  clientName: string;
  projectName: string;
  projectManagerName: string | null;
  agentName: string;
  authorName: string;
  authorDepartment: string | null;
  authorPosition: string | null;
  status?: string | null;
  createdAt: string;
  updatedAt: string;
  counts: {
    useCases: number;
    dataSources: number;
    concepts: number;
    metrics: number;
  };
}

type ProjectStatus =
  | "sent_to_client"
  | "client_draft"
  | "pm_review"
  | "completed";

const STATUS_CONFIG: Record<
  ProjectStatus,
  { label: string; variant: "success" | "warning" | "default" | "secondary" }
> = {
  sent_to_client: { label: "נשלח ללקוח", variant: "default" },
  client_draft: { label: "טיוטת לקוח", variant: "secondary" },
  pm_review: { label: "בטיפול מנהל פרויקט", variant: "warning" },
  completed: { label: "הושלם", variant: "success" },
};

function normalizeProjectStatus(status: string | null | undefined): ProjectStatus {
  if (
    status === "sent_to_client" ||
    status === "client_draft" ||
    status === "pm_review" ||
    status === "completed"
  ) {
    return status;
  }
  return "client_draft";
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return "הרגע";
  if (diffMinutes < 60) return `לפני ${diffMinutes} דקות`;
  if (diffHours < 24) return `לפני ${diffHours} שעות`;
  if (diffDays < 7) return `לפני ${diffDays} ימים`;

  return date.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminDashboard() {
  const { adminRole } = useAdminStore();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/projects");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProjects(data);
    } catch {
      setError("שגיאה בטעינת הפרויקטים");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/projects/${deleteTarget.projectId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setDeleteTarget(null);
      fetchProjects();
    } catch {
      setError("שגיאה במחיקת הפרויקט");
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, fetchProjects]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const uniqueClients = Array.from(new Set(projects.map((p) => p.clientName))).sort();

  const filtered = projects.filter((p) => {
    if (selectedClient && p.clientName !== selectedClient) return false;
    if (selectedStatus && normalizeProjectStatus(p.status) !== selectedStatus)
      return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.clientName.toLowerCase().includes(q) ||
      p.projectName.toLowerCase().includes(q) ||
      (p.projectManagerName?.toLowerCase().includes(q) ?? false) ||
      p.agentName.toLowerCase().includes(q) ||
      p.authorName.toLowerCase().includes(q)
    );
  });

  const clientCount = new Set(projects.map((p) => p.clientName)).size;
  const completedCount = projects.filter(
    (p) => normalizeProjectStatus(p.status) === "completed"
  ).length;
  const pmReviewCount = projects.filter(
    (p) => normalizeProjectStatus(p.status) === "pm_review"
  ).length;

  return (
    <div className="min-h-screen bg-[#F7F7FB]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[#EEEEEE] bg-white/80 backdrop-blur">
        <div className="flex h-16 w-full items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <UserCircle size={22} />
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[#1A1A2E]">{adminRole}</p>
            </div>
          </div>
          <img
            src="/JEEN_logo.png"
            alt="Jeen"
            className="h-[7.5rem] w-auto"
          />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-8 py-8">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1A1A2E]">
            לוח ניהול מסמכי איפיון
          </h1>
          <p className="mt-0.5 text-sm text-[#6B6B8A]">
            ניהול מרכזי של כל מסמכי האפיון ללקוחות
          </p>
        </div>
        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              icon: <FolderOpen size={18} />,
              label: "סה״כ אפיונים",
              value: projects.length,
              color:
                "text-indigo-600 bg-indigo-50 border-indigo-100 ring-indigo-50",
            },
            {
              icon: <Users size={18} />,
              label: "לקוחות",
              value: clientCount,
              color:
                "text-emerald-600 bg-emerald-50 border-emerald-100 ring-emerald-50",
            },
            {
              icon: <CheckCircle2 size={18} />,
              label: "הושלמו",
              value: completedCount,
              color: "text-sky-600 bg-sky-50 border-sky-100 ring-sky-50",
            },
            {
              icon: <Clock size={18} />,
              label: "בטיפול מנהל פרויקט",
              value: pmReviewCount,
              color:
                "text-amber-600 bg-amber-50 border-amber-100 ring-amber-50",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={cn(
                "flex items-center gap-4 rounded-2xl border p-5 shadow-sm ring-1",
                stat.color
              )}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{stat.value}</p>
                <p className="mt-1 text-xs opacity-80">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters & Actions */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative max-w-xs flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש לפי שם לקוח, פרויקט או ממלא..."
              className="pr-10"
            />
          </div>

          <div className="relative">
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="appearance-none rounded-xl border border-[#E0E0E0] bg-white py-2.5 pl-9 pr-4 text-sm text-[#1A1A2E] shadow-sm transition focus:border-[#5B4FE8] focus:outline-none focus:shadow-[0_0_0_3px_rgba(91,79,232,0.1)]"
            >
              <option value="">כל הלקוחות</option>
              {uniqueClients.map((client) => (
                <option key={client} value={client}>
                  {client}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="appearance-none rounded-xl border border-[#E0E0E0] bg-white py-2.5 pl-9 pr-4 text-sm text-[#1A1A2E] shadow-sm transition focus:border-[#5B4FE8] focus:outline-none focus:shadow-[0_0_0_3px_rgba(91,79,232,0.1)]"
            >
              <option value="">כל הסטטוסים</option>
              {(Object.entries(STATUS_CONFIG) as [ProjectStatus, typeof STATUS_CONFIG[ProjectStatus]][]).map(
                ([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                )
              )}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <button
            onClick={() => setDialogOpen(true)}
            className="mr-auto inline-flex items-center gap-2 rounded-xl bg-[#5B4FE8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4A3ED6] hover:shadow-md"
          >
            <Plus size={16} />
            אפיון חדש
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2
              size={32}
              className="animate-spin text-indigo-500"
            />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24">
            <AlertCircle size={40} className="mb-3 text-red-400" />
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchProjects}
              className="mt-4 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
            >
              נסה שוב
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <FolderOpen size={48} className="mb-4 text-slate-300" />
            <p className="text-lg font-medium text-slate-600">
              {searchQuery ? "לא נמצאו תוצאות" : "אין אפיונים עדיין"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {searchQuery
                ? "נסו לחפש במילים אחרות"
                : "אפיונים יופיעו כאן לאחר שלקוחות ישלחו את הטופס"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#EEEEEE] bg-white shadow-sm">
            <table className="w-full min-w-[1120px] text-sm">
              <thead>
                <tr className="border-b border-[#F0EFF5] bg-[#FAFAFD]">
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-[#6B6B8A]">
                    שם לקוח
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-[#6B6B8A]">
                    פרויקט / אפיון
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-[#6B6B8A]">
                    ממלא המסמך
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-[#6B6B8A]">
                    מנהל הפרויקט
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-[#6B6B8A]">
                    תאריך יצירה
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-[#6B6B8A]">
                    עודכן לאחרונה
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-[#6B6B8A]">
                    סטטוס
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-[#6B6B8A]">
                    <span className="sr-only">פעולות</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((project, idx) => {
                  const status = normalizeProjectStatus(project.status);
                  const statusCfg = STATUS_CONFIG[status];

                  return (
                    <tr
                      key={project.projectId}
                      className={cn(
                        "group transition-colors hover:bg-indigo-50/40",
                        idx < filtered.length - 1 &&
                          "border-b border-[#F0EFF5]"
                      )}
                    >
                      <td className="px-5 py-4">
                        <span className="font-semibold text-[#1A1A2E]">
                          {project.clientName}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <FileText
                            size={14}
                            className="shrink-0 text-indigo-400"
                          />
                          <span className="text-[#1A1A2E]">
                            {project.agentName || project.projectName || "טרם הוגדר"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[#4B4B68]">
                        {project.authorName}
                      </td>
                      <td className="px-5 py-4 text-[#4B4B68]">
                        {project.projectManagerName || "לא הוגדר"}
                      </td>
                      <td className="px-5 py-4 text-[#6B6B8A]">
                        {formatShortDate(project.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-[#6B6B8A]">
                        {formatRelativeDate(project.updatedAt)}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={statusCfg.variant}>
                          {statusCfg.label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-left">
                        <div className="flex items-center justify-end gap-4">
                          <Link
                            href={`/admin/project/${project.projectId}/view`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#5B4FE8] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#4A3ED6] hover:shadow-md"
                          >
                            פתח אפיון
                            <ExternalLink size={13} />
                          </Link>
                          <button
                            onClick={() => setDeleteTarget(project)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                            title="מחק אפיון"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <NewSpecDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={fetchProjects}
      />

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md animate-fade-in rounded-2xl border border-[#EEEEEE] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
                <Trash2 size={28} />
              </div>
              <div>
                <p className="text-base font-bold text-[#1A1A2E]">
                  מחיקת אפיון
                </p>
                <p className="mt-2 text-sm text-[#6B6B8A]">
                  האם אתה בטוח שברצונך למחוק את האפיון{" "}
                  <span className="font-semibold text-[#1A1A2E]">
                    {deleteTarget.agentName || deleteTarget.projectName}
                  </span>{" "}
                  של הלקוח{" "}
                  <span className="font-semibold text-[#1A1A2E]">
                    {deleteTarget.clientName}
                  </span>
                  ?
                </p>
                <p className="mt-1 text-xs text-red-500">
                  פעולה זו תמחק את כל הנתונים והקבצים לצמיתות ולא ניתן לשחזר אותם.
                </p>
              </div>
            </div>
            <div className="border-t border-[#F0EFF5] px-6 py-4 flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-xl border border-[#E0E0E0] bg-white px-5 py-2.5 text-sm font-semibold text-[#1A1A2E] shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting && <Loader2 size={15} className="animate-spin" />}
                {deleting ? "מוחק..." : "כן, מחק"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
