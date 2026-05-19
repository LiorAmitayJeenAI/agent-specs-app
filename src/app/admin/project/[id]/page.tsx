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
  Download,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  createHebrewWordBlob,
  formatDocumentValue,
  type WordExportBlock,
} from "@/lib/wordExport";
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

function EditableTextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function EditableTextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  );
}

const textBlock = (label: string, value: string | string[] | boolean | number | null | undefined): WordExportBlock[] => [
  { kind: "label", text: label },
  { kind: "paragraph", text: formatDocumentValue(value ?? undefined) },
];

function buildAdminDocumentBlocks(project: ProjectDetail): WordExportBlock[] {
  const blocks: WordExportBlock[] = [
    { kind: "title", text: "מסמך אפיון סוכן AI" },
    { kind: "meta", text: `תאריך יצירה: ${new Date().toLocaleDateString("he-IL")}` },
    { kind: "space" },
    { kind: "heading", text: "שם הלקוח" },
    ...textBlock("לקוח", project.clientName),
    { kind: "space" },
    { kind: "heading", text: "עורך המסמך" },
    ...textBlock("שם", project.authorName),
    ...textBlock("מחלקה", project.authorDepartment),
    ...textBlock("תפקיד", project.authorPosition),
    { kind: "space" },
    { kind: "heading", text: "שם הסוכן" },
    ...textBlock("שם הסוכן", project.agentName),
    ...textBlock("תיאור כללי", project.agentDescription),
    { kind: "space" },
    { kind: "heading", text: "תרחישי שימוש" },
  ];

  if (project.useCases.length === 0) {
    blocks.push({ kind: "empty", text: "לא הוזנו תרחישי שימוש." });
  } else {
    project.useCases.forEach((uc, ucIndex) => {
      blocks.push({
        kind: "subheading",
        text: `תרחיש ${ucIndex + 1}: ${uc.name || uc.qaPairs[0]?.question || "תרחיש ללא שם"}`,
      });
      blocks.push(...textBlock("שם תרחיש השימוש", uc.name));
      blocks.push(...textBlock("תיאור התרחיש", uc.title));
      blocks.push(...textBlock("מבצע התהליך כיום", uc.performedBy));
      blocks.push(...textBlock("מערכות מעורבות", uc.systems));
      blocks.push(...textBlock("הערות נוספות", uc.notes));
      blocks.push({ kind: "subheading", text: "שאלות אפשריות, תשובות ומקורות מידע" });

      if (uc.qaPairs.length === 0) {
        blocks.push({ kind: "empty", text: "לא הוזנו שאלות ותשובות." });
      } else {
        uc.qaPairs.forEach((qa, qaIndex) => {
          blocks.push(...textBlock(`שאלה ${qaIndex + 1}`, qa.question));
          blocks.push(...textBlock(`תשובה ${qaIndex + 1}`, qa.expectedAnswer));
          blocks.push(...textBlock(`מקור מידע ${qaIndex + 1}`, qa.dataSourceRef));
        });
      }

      blocks.push({ kind: "subheading", text: "פירוט התהליך הקיים (Flow)" });
      if (uc.flowSteps.length === 0) {
        blocks.push({ kind: "empty", text: "לא הוזנו שלבי תהליך." });
      } else {
        uc.flowSteps.forEach((step, stepIndex) => {
          blocks.push(...textBlock(`שלב ${stepIndex + 1}`, step.description));
          blocks.push(...textBlock("יש חישוב בשלב זה?", step.hasCalculation));
          if (step.hasCalculation) {
            blocks.push(...textBlock("פירוט החישוב", step.calculationDetails));
          }
        });
      }
      blocks.push({ kind: "space" });
    });
  }

  blocks.push({ kind: "heading", text: "מקורות מידע" });
  if (project.dataSources.length === 0) {
    blocks.push({ kind: "empty", text: "לא הוזנו מקורות מידע." });
  } else {
    project.dataSources.forEach((source, index) => {
      blocks.push({ kind: "subheading", text: `מקור מידע ${index + 1}: ${source.name || "מקור ללא שם"}` });
      blocks.push(...textBlock("שם מקור הנתונים", source.name));
      blocks.push(...textBlock("סוג מקור", source.type));
      blocks.push(...textBlock("תיאור", source.description));
      blocks.push(...textBlock("שיטת גישה", source.accessMethod));
      blocks.push({ kind: "space" });
    });
  }

  blocks.push({ kind: "heading", text: "מושגים והגדרות" });
  if (project.concepts.length === 0) {
    blocks.push({ kind: "empty", text: "לא הוזנו מושגים והגדרות." });
  } else {
    project.concepts.forEach((concept, index) => {
      blocks.push({ kind: "subheading", text: `מושג ${index + 1}: ${concept.term || "מושג ללא שם"}` });
      blocks.push(...textBlock("המונח", concept.term));
      blocks.push(...textBlock("הגדרה", concept.definition));
      blocks.push(...textBlock("דוגמאות", concept.examples));
      blocks.push({ kind: "space" });
    });
  }

  blocks.push({ kind: "heading", text: "מדדי הצלחה" });
  if (project.metrics.length === 0) {
    blocks.push({ kind: "empty", text: "לא הוזנו מדדי הצלחה." });
  } else {
    project.metrics.forEach((metric, index) => {
      blocks.push({ kind: "subheading", text: `מדד ${index + 1}: ${metric.name || "מדד ללא שם"}` });
      blocks.push(...textBlock("שם המדד", metric.name));
      blocks.push(...textBlock("יעד", metric.target));
      blocks.push(...textBlock("שיטת מדידה", metric.measurementMethod));
      blocks.push(...textBlock("עדיפות", PRIORITY_OPTIONS.find((p) => p.value === metric.priority)?.label ?? metric.priority));
      blocks.push({ kind: "space" });
    });
  }

  return blocks;
}

// ─── Editable Concepts ──────────────────────────────────────────────────────────

function EditableConcepts({
  initial,
  projectId,
}: {
  initial: ConceptItem[];
  projectId: string;
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
        headers: { "Content-Type": "application/json" },
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
}: {
  initial: MetricItem[];
  projectId: string;
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
        headers: { "Content-Type": "application/json" },
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
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/projects/${projectId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProject(data);
    } catch {
      setError("שגיאה בטעינת הפרויקט");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const updateProject = (patch: Partial<ProjectDetail>) => {
    setProject((current) => (current ? { ...current, ...patch } : current));
    setSaved(false);
    setSaveError("");
  };

  const updateUseCase = (index: number, patch: Partial<UseCase>) => {
    setProject((current) =>
      current
        ? {
            ...current,
            useCases: current.useCases.map((uc, i) =>
              i === index ? { ...uc, ...patch } : uc
            ),
          }
        : current
    );
    setSaved(false);
    setSaveError("");
  };

  const updateQAPair = (
    useCaseIndex: number,
    qaIndex: number,
    patch: Partial<QAPair>
  ) => {
    setProject((current) =>
      current
        ? {
            ...current,
            useCases: current.useCases.map((uc, i) =>
              i === useCaseIndex
                ? {
                    ...uc,
                    qaPairs: uc.qaPairs.map((qa, j) =>
                      j === qaIndex ? { ...qa, ...patch } : qa
                    ),
                  }
                : uc
            ),
          }
        : current
    );
    setSaved(false);
    setSaveError("");
  };

  const updateFlowStep = (
    useCaseIndex: number,
    stepIndex: number,
    patch: Partial<FlowStep>
  ) => {
    setProject((current) =>
      current
        ? {
            ...current,
            useCases: current.useCases.map((uc, i) =>
              i === useCaseIndex
                ? {
                    ...uc,
                    flowSteps: uc.flowSteps.map((step, j) =>
                      j === stepIndex ? { ...step, ...patch } : step
                    ),
                  }
                : uc
            ),
          }
        : current
    );
    setSaved(false);
    setSaveError("");
  };

  const updateDataSource = (index: number, patch: Partial<DataSourceItem>) => {
    setProject((current) =>
      current
        ? {
            ...current,
            dataSources: current.dataSources.map((ds, i) =>
              i === index ? { ...ds, ...patch } : ds
            ),
          }
        : current
    );
    setSaved(false);
    setSaveError("");
  };

  const updateConcept = (index: number, patch: Partial<ConceptItem>) => {
    setProject((current) =>
      current
        ? {
            ...current,
            concepts: current.concepts.map((concept, i) =>
              i === index ? { ...concept, ...patch } : concept
            ),
          }
        : current
    );
    setSaved(false);
    setSaveError("");
  };

  const updateMetric = (index: number, patch: Partial<MetricItem>) => {
    setProject((current) =>
      current
        ? {
            ...current,
            metrics: current.metrics.map((metric, i) =>
              i === index ? { ...metric, ...patch } : metric
            ),
          }
        : current
    );
    setSaved(false);
    setSaveError("");
  };

  const saveProject = async () => {
    if (!project) return;

    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/admin/projects/${project.projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "שגיאה בשמירת הפרויקט");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "שגיאה בשמירת הפרויקט");
    } finally {
      setSaving(false);
    }
  };

  const exportProject = async () => {
    if (!project) return;

    const docxBlob = await createHebrewWordBlob(buildAdminDocumentBlocks(project));
    const url = URL.createObjectURL(docxBlob);
    const link = document.createElement("a");
    const fileNameBase = project.agentName || project.clientName || "ai-agent-spec";
    link.href = url;
    link.download = `${fileNameBase.replace(/[\\/:*?"<>|]/g, "-")}.docx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7FB] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
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
      {/* Jeen logo */}
      <img
        src="/JEEN_logo.png"
        alt="Jeen"
        className="fixed -top-4 left-4 z-50 h-[8.5rem] w-auto"
      />

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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportProject}>
              <Download size={14} />
              ייצוא ל־DOC
            </Button>
            <Button size="sm" onClick={saveProject} disabled={saving}>
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {saving ? "שומר..." : "שמור שינויים"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {(saved || saveError) && (
          <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
              saved
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {saved ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {saved ? "השינויים נשמרו בהצלחה" : saveError}
          </div>
        )}

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
            <div className="flex items-start gap-2">
              <Network size={14} className="text-indigo-500 mt-1 shrink-0" />
              <ReadOnlyField label="מחלקה" value={project.authorDepartment} />
            </div>
            <div className="flex items-start gap-2">
              <Briefcase size={14} className="text-indigo-500 mt-1 shrink-0" />
              <ReadOnlyField label="תפקיד" value={project.authorPosition} />
            </div>
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

        {/* Step 1: Agent details — READ ONLY */}
        <Section
          icon={<Sparkles size={16} className="text-[#5B4FE8]" />}
          title="אפיון הצורך העסקי"
          badge={
            <Badge variant="secondary" className="text-[10px]">
              שלב 1
            </Badge>
          }
          defaultOpen={false}
        >
          <div className="space-y-3">
            <ReadOnlyField label="שם התהליך או המשימה" value={project.agentName} />
            <ReadOnlyField label="תיאור קצר של התהליך או המשימה" value={project.agentDescription} />
          </div>
        </Section>

        {/* Step 2: Use cases — READ ONLY */}
        <Section
          icon={<Sparkles size={16} className="text-[#2ABFAB]" />}
          title="תרחישי שימוש"
          badge={
            <Badge variant="secondary" className="text-[10px]">
              שלב 2 — {project.useCases.length} תרחישים
            </Badge>
          }
          defaultOpen={false}
        >
          <div className="space-y-6">
            {project.useCases.length === 0 && (
              <p className="text-sm text-slate-400 italic">לא הוזנו תרחישי שימוש</p>
            )}

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
                <ReadOnlyField label="מערכות מעורבות" value={uc.systems.join(", ")} />
                <ReadOnlyField label="הערות נוספות" value={uc.notes} />

                {uc.qaPairs.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-600">
                      שאלות אפשריות, תשובות ומקורות מידע
                    </p>
                    {uc.qaPairs.map((qa, qi) => (
                      <div
                        key={qa.id}
                        className="rounded-lg bg-slate-50 border border-slate-100 p-3 space-y-2"
                      >
                        <p className="text-xs font-semibold text-slate-500">
                          שאלה {qi + 1}
                        </p>
                        <ReadOnlyField label="שאלה" value={qa.question} />
                        <ReadOnlyField label="תשובה" value={qa.expectedAnswer} />
                        <ReadOnlyField label="מקור מידע" value={qa.dataSourceRef} />
                      </div>
                    ))}
                  </div>
                )}

                {uc.flowSteps.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-600">
                      תהליך קיים ({uc.flowSteps.length} שלבים)
                    </p>
                    {uc.flowSteps.map((fs, fi) => (
                      <div
                        key={fs.id}
                        className="rounded-lg bg-slate-50 border border-slate-100 p-3 space-y-2"
                      >
                        <p className="text-xs font-semibold text-slate-500">
                          שלב {fi + 1}
                        </p>
                        <ReadOnlyField label="תיאור השלב" value={fs.description} />
                        <ReadOnlyField
                          label="חישוב או לוגיקה עסקית"
                          value={fs.hasCalculation ? "כן" : "לא"}
                        />
                        {fs.hasCalculation && (
                          <ReadOnlyField label="פירוט חישוב" value={fs.calculationDetails} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Step 3: Data sources — READ ONLY */}
        <Section
          icon={<Database size={16} className="text-[#F5A623]" />}
          title="מקורות מידע"
          badge={
            <Badge variant="secondary" className="text-[10px]">
              שלב 3 — {project.dataSources.length} מקורות
            </Badge>
          }
          defaultOpen={false}
        >
          <div className="space-y-4">
            {project.dataSources.length === 0 && (
              <p className="text-sm text-slate-400 italic">לא הוזנו מקורות מידע</p>
            )}
            {project.dataSources.map((ds, i) => (
              <div
                key={ds.id}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
              >
                <p className="text-xs font-semibold text-slate-500">מקור {i + 1}</p>
                <ReadOnlyField label="שם" value={ds.name} />
                <ReadOnlyField label="סוג" value={ds.type} />
                <ReadOnlyField label="תיאור" value={ds.description} />
                <ReadOnlyField label="שיטת גישה" value={ds.accessMethod} />
              </div>
            ))}
          </div>
        </Section>

        {/* Step 4: Concepts — EDITABLE (open) */}
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
          defaultOpen={true}
        >
          <div className="space-y-4">
            {project.concepts.length === 0 && (
              <p className="text-sm text-slate-400 italic">לא הוזנו מושגים עדיין. הוסף מושגים מהפגישה.</p>
            )}
            {project.concepts.map((concept, i) => (
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
                    onClick={() =>
                      updateProject({
                        concepts: project.concepts.filter((_, index) => index !== i),
                      })
                    }
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
                <EditableTextField
                  label="המונח"
                  value={concept.term}
                  onChange={(term) => updateConcept(i, { term })}
                  placeholder="לדוגמה: SLA"
                />
                <EditableTextAreaField
                  label="הגדרה"
                  value={concept.definition}
                  onChange={(definition) => updateConcept(i, { definition })}
                  placeholder="הסבר קצר על המונח"
                  rows={2}
                />
                <EditableTextAreaField
                  label="דוגמאות"
                  value={concept.examples}
                  onChange={(examples) => updateConcept(i, { examples })}
                  placeholder="דוגמאות שימוש"
                  rows={2}
                />
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                updateProject({
                  concepts: [
                    ...project.concepts,
                    {
                      id: crypto.randomUUID(),
                      term: "",
                      definition: "",
                      examples: "",
                    },
                  ],
                })
              }
            >
              <Plus size={14} />
              הוסף מושג
            </Button>
          </div>
        </Section>

        {/* Step 5: Metrics — EDITABLE (open) */}
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
          defaultOpen={true}
        >
          <div className="space-y-4">
            {project.metrics.length === 0 && (
              <p className="text-sm text-slate-400 italic">לא הוזנו מדדי הצלחה עדיין. הוסף מדדים מהפגישה.</p>
            )}
            {project.metrics.map((metric, i) => (
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
                    onClick={() =>
                      updateProject({
                        metrics: project.metrics.filter((_, index) => index !== i),
                      })
                    }
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
                <EditableTextField
                  label="שם המדד"
                  value={metric.name}
                  onChange={(name) => updateMetric(i, { name })}
                  placeholder='לדוגמה: "דיוק תשובות"'
                />
                <EditableTextField
                  label="יעד"
                  value={metric.target}
                  onChange={(target) => updateMetric(i, { target })}
                  placeholder='לדוגמה: "95% דיוק"'
                />
                <EditableTextAreaField
                  label="שיטת מדידה"
                  value={metric.measurementMethod}
                  onChange={(measurementMethod) =>
                    updateMetric(i, { measurementMethod })
                  }
                  placeholder="כיצד נמדוד מדד זה?"
                  rows={2}
                />
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
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                updateProject({
                  metrics: [
                    ...project.metrics,
                    {
                      id: crypto.randomUUID(),
                      name: "",
                      target: "",
                      measurementMethod: "",
                      priority: "medium",
                    },
                  ],
                })
              }
            >
              <Plus size={14} />
              הוסף מדד
            </Button>
          </div>
        </Section>

        <div className="flex items-center justify-between rounded-2xl border border-[#E0E0E0] bg-white px-4 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.07)]">
          <p className="text-sm text-slate-600">
            לאחר העריכה אפשר לשמור את השינויים ולהוריד את האפיון כקובץ Word.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportProject}>
              <Download size={14} />
              ייצוא ל־DOC
            </Button>
            <Button size="sm" onClick={saveProject} disabled={saving}>
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {saving ? "שומר..." : "שמור שינויים"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
