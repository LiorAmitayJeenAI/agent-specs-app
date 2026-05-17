"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import Link from "next/link";
import {
  Lock,
  LogOut,
  FolderOpen,
  Users,
  Sparkles,
  Database,
  BookOpen,
  Target,
  Building2,
  PenLine,
  Calendar,
} from "lucide-react";
import { useAdminStore } from "@/store/adminStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProjectSummary {
  projectId: string;
  clientName: string;
  projectName: string;
  agentName: string;
  authorName: string;
  authorDepartment: string | null;
  authorPosition: string | null;
  createdAt: string;
  counts: {
    useCases: number;
    dataSources: number;
    concepts: number;
    metrics: number;
  };
}

function AdminLogin({
  onLoginSuccess,
}: {
  onLoginSuccess: (projects: ProjectSummary[]) => void;
}) {
  const { login } = useAdminStore();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setChecking(true);
    setError("");

    try {
      const res = await fetch("/api/admin/projects", {
        headers: { "x-admin-token": password },
      });

      if (res.ok) {
        const data: ProjectSummary[] = await res.json();
        login(password);
        onLoginSuccess(data);
      } else {
        setError("סיסמה שגויה");
      }
    } catch {
      setError("שגיאה בהתחברות");
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F7F7FB] flex items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-[2rem] bg-white border border-[#EEEEEE] shadow-xl px-7 py-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-3xl bg-[#EEE9FF] text-[#5B4FE8] flex items-center justify-center ring-1 ring-[#C4B8FF]/50">
            <Lock size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E]">כניסת מנהל</h1>
            <p className="text-sm text-[#6B6B8A]">לוח ניהול פרויקטים — Jeen AI</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="admin-password" required>
              <span className="flex items-center gap-1.5">
                <Lock size={14} className="text-indigo-500" />
                סיסמת מנהל
              </span>
            </Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="הזן סיסמה"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={checking || !password.trim()}>
            {checking ? "בודק..." : "כניסה"}
          </Button>
        </div>
      </form>
    </main>
  );
}

function ProjectList({
  initialData,
}: {
  initialData?: ProjectSummary[];
}) {
  const { token, logout } = useAdminStore();
  const [projects, setProjects] = useState<ProjectSummary[]>(initialData ?? []);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState("");

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/projects", {
        headers: { "x-admin-token": token },
      });

      if (res.status === 401) {
        logout();
        return;
      }

      if (!res.ok) throw new Error();

      const data = await res.json();
      setProjects(data);
    } catch {
      setError("שגיאה בטעינת הפרויקטים");
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    if (!initialData) fetchProjects();
  }, [initialData, fetchProjects]);

  const grouped = projects.reduce<Record<string, ProjectSummary[]>>(
    (acc, p) => {
      (acc[p.clientName] ??= []).push(p);
      return acc;
    },
    {}
  );

  return (
    <div className="min-h-screen bg-[#F7F7FB]">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-[#EEEEEE] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EEE9FF] flex items-center justify-center ring-1 ring-[#C4B8FF]/50">
              <span className="text-[#5B4FE8] font-bold text-sm">AI</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#1A1A2E]">לוח ניהול פרויקטים</h1>
              <p className="text-xs text-[#6B6B8A]">Jeen AI</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut size={14} />
            התנתק
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-600">{error}</p>
            <Button className="mt-4" onClick={fetchProjects}>
              נסה שוב
            </Button>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <FolderOpen size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-lg font-medium text-slate-600">אין פרויקטים עדיין</p>
            <p className="text-sm text-slate-400 mt-1">
              פרויקטים יופיעו כאן אחרי שלקוחות ישלחו את טופס האפיון
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  icon: <FolderOpen size={16} />,
                  label: "פרויקטים",
                  value: projects.length,
                  color: "text-indigo-600 bg-indigo-50 border-indigo-100",
                },
                {
                  icon: <Users size={16} />,
                  label: "לקוחות",
                  value: Object.keys(grouped).length,
                  color: "text-emerald-600 bg-emerald-50 border-emerald-100",
                },
                {
                  icon: <BookOpen size={16} />,
                  label: "ממתינים למושגים",
                  value: projects.filter((p) => p.counts.concepts === 0).length,
                  color: "text-amber-600 bg-amber-50 border-amber-100",
                },
                {
                  icon: <Target size={16} />,
                  label: "ממתינים למדדים",
                  value: projects.filter((p) => p.counts.metrics === 0).length,
                  color: "text-rose-600 bg-rose-50 border-rose-100",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-2xl border p-4 text-center shadow-sm ${stat.color}`}
                >
                  <div className="flex justify-center mb-2">{stat.icon}</div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs mt-0.5 opacity-70">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Projects by client */}
            {Object.entries(grouped).map(([clientName, clientProjects]) => (
              <section key={clientName}>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 size={16} className="text-[#5B4FE8]" />
                  <h2 className="text-lg font-bold text-[#1A1A2E]">{clientName}</h2>
                  <Badge variant="secondary" className="text-xs">
                    {clientProjects.length} פרויקטים
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {clientProjects.map((project) => (
                    <Link
                      key={project.projectId}
                      href={`/admin/project/${project.projectId}`}
                    >
                      <Card className="hover:shadow-lg hover:border-indigo-200 transition-all duration-200 cursor-pointer h-full">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-sm leading-tight">
                              {project.agentName}
                            </CardTitle>
                            <Sparkles size={14} className="text-[#5B4FE8] shrink-0 mt-0.5" />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <PenLine size={12} />
                            <span>{project.authorName}</span>
                            {project.authorDepartment && (
                              <span className="text-slate-300">• {project.authorDepartment}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Calendar size={12} />
                            <span>
                              {new Date(project.createdAt).toLocaleDateString("he-IL", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            <Badge
                              variant={project.counts.useCases > 0 ? "success" : "secondary"}
                              className="text-[10px]"
                            >
                              {project.counts.useCases} תרחישים
                            </Badge>
                            <Badge
                              variant={project.counts.dataSources > 0 ? "success" : "secondary"}
                              className="text-[10px]"
                            >
                              {project.counts.dataSources} מקורות
                            </Badge>
                            <Badge
                              variant={project.counts.concepts > 0 ? "success" : "outline"}
                              className="text-[10px]"
                            >
                              {project.counts.concepts > 0
                                ? `${project.counts.concepts} מושגים`
                                : "ממתין למושגים"}
                            </Badge>
                            <Badge
                              variant={project.counts.metrics > 0 ? "success" : "outline"}
                              className="text-[10px]"
                            >
                              {project.counts.metrics > 0
                                ? `${project.counts.metrics} מדדים`
                                : "ממתין למדדים"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminPage() {
  const { isAuthenticated } = useAdminStore();
  const [mounted, setMounted] = useState(false);
  const [initialProjects, setInitialProjects] = useState<ProjectSummary[] | undefined>();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#F7F7FB] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return isAuthenticated ? (
    <ProjectList initialData={initialProjects} />
  ) : (
    <AdminLogin onLoginSuccess={(data) => setInitialProjects(data)} />
  );
}
