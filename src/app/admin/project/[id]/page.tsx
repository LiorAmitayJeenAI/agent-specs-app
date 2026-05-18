"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  Sparkles,
  Database,
  BookOpen,
  Target,
  Building2,
  PenLine,
  Calendar,
  Network,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAdminStore } from "@/store/adminStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface QAPair {
  id: string;
  order: number;
  question: string;
  expectedAnswer: string;
  dataSourceRef: string | null;
}

interface FlowStep {
  id: string;
  order: number;
  description: string;
  hasCalculation: boolean;
  calculationDetails: string | null;
}

interface UseCase {
  id: string;
  name: string;
  title: string | null;
  performedBy: string | null;
  systems: string[];
  notes: string | null;
  qaPairs: QAPair[];
  flowSteps: FlowStep[];
}

interface DataSourceItem {
  id: string;
  name: string;
  type: string | null;
  description: string | null;
  accessMethod: string | null;
}

interface ConceptItem {
  id: string;
  term: string;
  definition: string | null;
  examples: string | null;
}

interface MetricItem {
  id: string;
  name: string;
  target: string | null;
  measurementMethod: string | null;
  priority: string;
}

interface ProjectDetail {
  projectId: string;
  clientName: string;
  projectName: string;
  authorName: string;
  authorDepartment: string | null;
  authorPosition: string | null;
  agentName: string;
  agentDescription: string;
  createdAt: string;
  useCases: UseCase[];
  dataSources: DataSourceItem[];
  concepts: ConceptItem[];
  metrics: MetricItem[];
}

// ─── Section Wrapper ────────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  badge,
  children,
  defaultOpen = true,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-base">{title}</CardTitle>
            {badge}
          </div>
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </CardHeader>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}

// ─── Read-only field ────────────────────────────────────────────────────────────

function ReadOnlyField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className="text-sm text-slate-800 whitespace-pre-wrap">
        {value?.trim() || <span className="text-slate-300 italic">לא הוזן</span>}
      </p>
    </div>
  );
}

// ─── Editable Concepts ──────────────────────────────────────────────────────────

function EditableConcepts({
  initial,
  projectId,
  token,
}: {
  initial: ConceptItem[];
  projectId: string;
  token: string;
}) {
  const [concepts, setConcepts] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const addConcept = () => {
    setConcepts([
      ...concepts,
      { id: crypto.randomUUID(), term: "", definition: "", examples: "" },
    ]);
    setSaved(false);
  };

  const updateConcept = (index: number, patch: Partial<ConceptItem>) => {
    setConcepts(concepts.map((c, i) => (i === index ? { ...c, ...patch } : c)));
    setSaved(false);
  };

  const removeConcept = (index: number) => {
    setConcepts(concepts.filter((_, i) => i !== index));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/concepts`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({
          concepts: concepts
            .filter((c) => c.term.trim())
            .map((c) => ({
              term: c.term,
              definition: c.definition,
              examples: c.examples,
            })),
        }),
      });

      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("שגיאה בשמירת המושגים");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {concepts.length === 0 ? (
        <p className="text-sm text-slate-400 italic">לא הוזנו מושגים עדיין. הוסף מושגים מהפגישה.</p>
      ) : (
        concepts.map((concept, i) => (
          <div
            key={concept.id}
            className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                מושג {i + 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                onClick={() => removeConcept(i)}
              >
                <Trash2 size={13} />
              </Button>
            </div>

            <div>
              <Label>המונח</Label>
              <Input
                value={concept.term}
                onChange={(e) => updateConcept(i, { term: e.target.value })}
                placeholder="לדוגמה: SLA"
              />
            </div>
            <div>
              <Label>הגדרה</Label>
              <Textarea
                value={concept.definition ?? ""}
                onChange={(e) => updateConcept(i, { definition: e.target.value })}
                placeholder="הסבר קצר על המונח"
                rows={2}
              />
            </div>
            <div>
              <Label>דוגמאות</Label>
              <Textarea
                value={concept.examples ?? ""}
                onChange={(e) => updateConcept(i, { examples: e.target.value })}
                placeholder="דוגמאות שימוש"
                rows={2}
              />
            </div>
          </div>
        ))
      )}

      <Button variant="outline" size="sm" onClick={addConcept}>
        <Plus size={14} />
        הוסף מושג
      </Button>

      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          {saving ? "שומר..." : "שמור מושגים"}
        </Button>
        {saved && (
          <span className="text-sm text-emerald-600 flex items-center gap-1">
            <CheckCircle size={14} />
            נשמר בהצלחה
          </span>
        )}
        {error && (
          <span className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle size={14} />
            {error}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Editable Metrics ───────────────────────────────────────────────────────────

const PRIORITY_OPTIONS = [
  { value: "high", label: "גבוה" },
  { value: "medium", label: "בינוני" },
  { value: "low", label: "נמוך" },
];

function EditableMetrics({
  initial,
  projectId,
  token,
}: {
  initial: MetricItem[];
  projectId: string;
  token: string;
}) {
  const [metrics, setMetrics] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const addMetric = () => {
    setMetrics([
      ...metrics,
      {
        id: crypto.randomUUID(),
        name: "",
        target: "",
        measurementMethod: "",
        priority: "medium",
      },
    ]);
    setSaved(false);
  };

  const updateMetric = (index: number, patch: Partial<MetricItem>) => {
    setMetrics(metrics.map((m, i) => (i === index ? { ...m, ...patch } : m)));
    setSaved(false);
  };

  const removeMetric = (index: number) => {
    setMetrics(metrics.filter((_, i) => i !== index));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/metrics`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({
          metrics: metrics
            .filter((m) => m.name.trim())
            .map((m) => ({
              name: m.name,
              target: m.target,
              measurementMethod: m.measurementMethod,
              priority: m.priority,
            })),
        }),
      });

      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("שגיאה בשמירת המדדים");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {metrics.length === 0 ? (
        <p className="text-sm text-slate-400 italic">לא הוזנו מדדי הצלחה עדיין. הוסף מדדים מהפגישה.</p>
      ) : (
        metrics.map((metric, i) => (
          <div
            key={metric.id}
            className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                מדד {i + 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                onClick={() => removeMetric(i)}
              >
                <Trash2 size={13} />
              </Button>
            </div>

            <div>
              <Label>שם המדד</Label>
              <Input
                value={metric.name}
                onChange={(e) => updateMetric(i, { name: e.target.value })}
                placeholder='לדוגמה: "דיוק תשובות"'
              />
            </div>
            <div>
              <Label>יעד</Label>
              <Input
                value={metric.target ?? ""}
                onChange={(e) => updateMetric(i, { target: e.target.value })}
                placeholder='לדוגמה: "95% דיוק"'
              />
            </div>
            <div>
              <Label>שיטת מדידה</Label>
              <Textarea
                value={metric.measurementMethod ?? ""}
                onChange={(e) =>
                  updateMetric(i, { measurementMethod: e.target.value })
                }
                placeholder="כיצד נמדוד מדד זה?"
                rows={2}
              />
            </div>
            <div>
              <Label>עדיפות</Label>
              <select
                value={metric.priority}
                onChange={(e) => updateMetric(i, { priority: e.target.value })}
                className="flex w-full rounded-lg border border-[#E0E0E0] bg-white px-3.5 py-2.5 text-sm text-[#1A1A2E] shadow-sm transition focus:outline-none focus:border-[#5B4FE8] focus:shadow-[0_0_0_3px_rgba(91,79,232,0.1)]"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))
      )}

      <Button variant="outline" size="sm" onClick={addMetric}>
        <Plus size={14} />
        הוסף מדד
      </Button>

      <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
        <Button onClick={save} disabled={saving} size="sm">
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          {saving ? "שומר..." : "שמור מדדים"}
        </Button>
        {saved && (
          <span className="text-sm text-emerald-600 flex items-center gap-1">
            <CheckCircle size={14} />
            נשמר בהצלחה
          </span>
        )}
        {error && (
          <span className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle size={14} />
            {error}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token, isAuthenticated, logout } = useAdminStore();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/projects/${projectId}`, {
        headers: { "x-admin-token": token },
      });

      if (res.status === 401) {
        logout();
        return;
      }

      if (!res.ok) throw new Error();

      const data = await res.json();
      setProject(data);
    } catch {
      setError("שגיאה בטעינת הפרויקט");
    } finally {
      setLoading(false);
    }
  }, [projectId, token, logout]);

  useEffect(() => {
    if (mounted && isAuthenticated) fetchProject();
  }, [mounted, isAuthenticated, fetchProject]);

  if (!mounted) return null;

  if (!isAuthenticated) {
    router.push("/admin");
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7FB] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-[#F7F7FB] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "הפרויקט לא נמצא"}</p>
          <Button onClick={() => router.push("/admin")}>חזרה לרשימה</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7FB]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-[#EEEEEE] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/admin")}
            >
              <ArrowRight size={16} />
              חזרה
            </Button>
            <div className="h-5 w-px bg-slate-200" />
            <div>
              <h1 className="text-lg font-bold text-[#1A1A2E]">
                {project.agentName}
              </h1>
              <p className="text-xs text-[#6B6B8A]">{project.clientName}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Project info card */}
        <Card>
          <CardHeader>
            <CardTitle>פרטי הפרויקט</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Building2 size={14} className="text-indigo-500 mt-1 shrink-0" />
              <ReadOnlyField label="לקוח" value={project.clientName} />
            </div>
            <div className="flex items-start gap-2">
              <PenLine size={14} className="text-indigo-500 mt-1 shrink-0" />
              <ReadOnlyField label="עורך המסמך" value={project.authorName} />
            </div>
            {project.authorDepartment && (
              <div className="flex items-start gap-2">
                <Network size={14} className="text-indigo-500 mt-1 shrink-0" />
                <ReadOnlyField label="מחלקה" value={project.authorDepartment} />
              </div>
            )}
            {project.authorPosition && (
              <div className="flex items-start gap-2">
                <Briefcase size={14} className="text-indigo-500 mt-1 shrink-0" />
                <ReadOnlyField label="תפקיד" value={project.authorPosition} />
              </div>
            )}
            <div className="flex items-start gap-2">
              <Calendar size={14} className="text-slate-400 mt-1 shrink-0" />
              <ReadOnlyField
                label="תאריך שליחה"
                value={new Date(project.createdAt).toLocaleDateString("he-IL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Agent details */}
        <Section
          icon={<Sparkles size={16} className="text-[#5B4FE8]" />}
          title="פרטי הסוכן"
          badge={
            <Badge variant="secondary" className="text-[10px]">
              שלב 1
            </Badge>
          }
        >
          <div className="space-y-3">
            <ReadOnlyField label="שם הסוכן" value={project.agentName} />
            <ReadOnlyField label="תיאור כללי" value={project.agentDescription} />
          </div>
        </Section>

        {/* Step 2: Use cases */}
        <Section
          icon={<Sparkles size={16} className="text-[#2ABFAB]" />}
          title="תרחישי שימוש"
          badge={
            <Badge variant="secondary" className="text-[10px]">
              שלב 2 — {project.useCases.length} תרחישים
            </Badge>
          }
        >
          {project.useCases.length === 0 ? (
            <p className="text-sm text-slate-400 italic">לא הוזנו תרחישי שימוש</p>
          ) : (
            <div className="space-y-6">
              {project.useCases.map((uc, ucIndex) => (
                <div
                  key={uc.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4"
                >
                  <h3 className="text-sm font-bold text-slate-800">
                    תרחיש {ucIndex + 1}: {uc.name || uc.qaPairs[0]?.question || "ללא שם"}
                  </h3>

                  <ReadOnlyField label="שם התרחיש" value={uc.name} />
                  <ReadOnlyField label="תיאור התרחיש" value={uc.title} />

                  <ReadOnlyField label="מבצע התהליך כיום" value={uc.performedBy} />

                  {uc.systems.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">מערכות מעורבות</p>
                      <div className="flex flex-wrap gap-1.5">
                        {uc.systems.map((sys) => (
                          <Badge key={sys} variant="secondary" className="text-xs">
                            {sys}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <ReadOnlyField label="הערות נוספות" value={uc.notes} />

                  {/* QA Pairs */}
                  {uc.qaPairs.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-slate-600">שאלות אפשריות, תשובות ומקורות מידע</p>
                      {uc.qaPairs.map((qa, qi) => (
                        <div
                          key={qa.id}
                          className="rounded-lg bg-slate-50 border border-slate-100 p-3 space-y-2"
                        >
                          <ReadOnlyField
                            label={`שאלה ${qi + 1}`}
                            value={qa.question}
                          />
                          <ReadOnlyField
                            label={`תשובה ${qi + 1}`}
                            value={qa.expectedAnswer}
                          />
                          {qa.dataSourceRef && (
                            <ReadOnlyField
                              label="מקור מידע"
                              value={qa.dataSourceRef}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Flow steps */}
                  {uc.flowSteps.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-600">
                        תהליך קיים ({uc.flowSteps.length} שלבים)
                      </p>
                      {uc.flowSteps.map((fs) => (
                        <div
                          key={fs.id}
                          className="rounded-lg bg-slate-50 border border-slate-100 p-3 space-y-1"
                        >
                          <p className="text-xs font-semibold text-slate-500">
                            שלב {fs.order}
                          </p>
                          <p className="text-sm text-slate-800 whitespace-pre-wrap">
                            {fs.description}
                          </p>
                          {fs.hasCalculation && (
                            <ReadOnlyField
                              label="פירוט חישוב"
                              value={fs.calculationDetails}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Step 3: Data sources */}
        <Section
          icon={<Database size={16} className="text-[#F5A623]" />}
          title="מקורות מידע"
          badge={
            <Badge variant="secondary" className="text-[10px]">
              שלב 3 — {project.dataSources.length} מקורות
            </Badge>
          }
        >
          {project.dataSources.length === 0 ? (
            <p className="text-sm text-slate-400 italic">לא הוזנו מקורות מידע</p>
          ) : (
            <div className="space-y-4">
              {project.dataSources.map((ds, i) => (
                <div
                  key={ds.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2"
                >
                  <p className="text-xs font-semibold text-slate-500">
                    מקור {i + 1}
                  </p>
                  <ReadOnlyField label="שם" value={ds.name} />
                  <ReadOnlyField label="סוג" value={ds.type} />
                  <ReadOnlyField label="תיאור" value={ds.description} />
                  {ds.accessMethod && (
                    <ReadOnlyField label="שיטת גישה" value={ds.accessMethod} />
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Step 4: Concepts — EDITABLE */}
        <Section
          icon={<BookOpen size={16} className="text-[#9B59B6]" />}
          title="מושגים והגדרות"
          badge={
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px]">
                שלב 4
              </Badge>
              <Badge className="text-[10px] bg-indigo-100 text-indigo-700 border-indigo-200">
                ניתן לעריכה
              </Badge>
            </div>
          }
        >
          <EditableConcepts
            initial={project.concepts}
            projectId={project.projectId}
            token={token}
          />
        </Section>

        {/* Step 5: Metrics — EDITABLE */}
        <Section
          icon={<Target size={16} className="text-[#E8607A]" />}
          title="מדדי הצלחה"
          badge={
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px]">
                שלב 5
              </Badge>
              <Badge className="text-[10px] bg-indigo-100 text-indigo-700 border-indigo-200">
                ניתן לעריכה
              </Badge>
            </div>
          }
        >
          <EditableMetrics
            initial={project.metrics}
            projectId={project.projectId}
            token={token}
          />
        </Section>
      </main>
    </div>
  );
}
