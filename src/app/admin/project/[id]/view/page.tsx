"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  Loader2,
  AlertCircle,
  Save,
  CheckCircle,
} from "lucide-react";
import { useFormStore, type AdminProjectData } from "@/store/formStore";
import {
  createHebrewWordBlob,
  formatDocumentValue,
  type WordExportBlock,
} from "@/lib/wordExport";
import Sidebar from "@/components/layout/Sidebar";
import StepAgentDetails from "@/components/steps/StepAgentDetails";
import Step1UseCases from "@/components/steps/Step1UseCases";
import Step2DataSources from "@/components/steps/Step2DataSources";
import Step3Concepts from "@/components/steps/Step3Concepts";
import Step4Metrics from "@/components/steps/Step4Metrics";
import Step5Summary from "@/components/steps/Step5Summary";
import { Button } from "@/components/ui/button";

const STEP_COMPONENTS: Record<number, React.ComponentType> = {
  1: StepAgentDetails,
  2: Step1UseCases,
  3: Step2DataSources,
  4: Step3Concepts,
  5: Step4Metrics,
  6: Step5Summary,
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "גבוה",
  medium: "בינוני",
  low: "נמוך",
};

const textBlock = (
  label: string,
  value: string | string[] | boolean | number | null | undefined
): WordExportBlock[] => [
  { kind: "label", text: label },
  { kind: "paragraph", text: formatDocumentValue(value ?? undefined) },
];

function buildWordBlocks(store: ReturnType<typeof useFormStore.getState>): WordExportBlock[] {
  const { projectIntake, agentDetails, useCases, dataSources, concepts, successMetrics } = store;
  const blocks: WordExportBlock[] = [
    { kind: "title", text: "מסמך אפיון סוכן AI" },
    { kind: "meta", text: `תאריך יצירה: ${new Date().toLocaleDateString("he-IL")}` },
    { kind: "space" },
    { kind: "heading", text: "שם הלקוח" },
    ...textBlock("לקוח", projectIntake.clientName),
    { kind: "space" },
    { kind: "heading", text: "עורך המסמך" },
    ...textBlock("שם", projectIntake.documentAuthorName),
    ...textBlock("מחלקה", projectIntake.department),
    ...textBlock("תפקיד", projectIntake.position),
    { kind: "space" },
    { kind: "heading", text: "שם הסוכן" },
    ...textBlock("שם הסוכן", agentDetails.requestedAgentName),
    ...textBlock("תיאור כללי", agentDetails.shortAgentDescription),
    { kind: "space" },
    { kind: "heading", text: "תרחישי שימוש" },
  ];

  if (useCases.length === 0) {
    blocks.push({ kind: "empty", text: "לא הוזנו תרחישי שימוש." });
  } else {
    useCases.forEach((uc, ucIndex) => {
      blocks.push({
        kind: "subheading",
        text: `תרחיש ${ucIndex + 1}: ${uc.useCaseName || uc.qaPairs[0]?.question || "תרחיש ללא שם"}`,
      });
      blocks.push(...textBlock("שם תרחיש השימוש", uc.useCaseName));
      blocks.push(...textBlock("תיאור התרחיש", uc.title));
      blocks.push(...textBlock("מבצע התהליך כיום", uc.performer));
      blocks.push(...textBlock("מערכות מעורבות", uc.systemsInvolved));
      blocks.push(...textBlock("הערות נוספות", uc.additionalNotes));
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
  if (dataSources.length === 0) {
    blocks.push({ kind: "empty", text: "לא הוזנו מקורות מידע." });
  } else {
    dataSources.forEach((source, index) => {
      blocks.push({ kind: "subheading", text: `מקור מידע ${index + 1}: ${source.name || "מקור ללא שם"}` });
      blocks.push(...textBlock("שם מקור הנתונים", source.name));
      blocks.push(...textBlock("סוג מקור", source.type));
      blocks.push(...textBlock("תיאור", source.description));
      blocks.push(...textBlock("שיטת גישה", source.accessMethod));
      blocks.push({ kind: "space" });
    });
  }

  blocks.push({ kind: "heading", text: "מושגים והגדרות" });
  if (concepts.length === 0) {
    blocks.push({ kind: "empty", text: "לא הוזנו מושגים והגדרות." });
  } else {
    concepts.forEach((concept, index) => {
      blocks.push({ kind: "subheading", text: `מושג ${index + 1}: ${concept.term || "מושג ללא שם"}` });
      blocks.push(...textBlock("המונח", concept.term));
      blocks.push(...textBlock("הגדרה", concept.definition));
      blocks.push(...textBlock("דוגמאות", concept.examples));
      blocks.push({ kind: "space" });
    });
  }

  blocks.push({ kind: "heading", text: "מדדי הצלחה" });
  if (successMetrics.length === 0) {
    blocks.push({ kind: "empty", text: "לא הוזנו מדדי הצלחה." });
  } else {
    successMetrics.forEach((metric, index) => {
      blocks.push({ kind: "subheading", text: `מדד ${index + 1}: ${metric.metric || "מדד ללא שם"}` });
      blocks.push(...textBlock("שם המדד", metric.metric));
      blocks.push(...textBlock("יעד", metric.target));
      blocks.push(...textBlock("שיטת מדידה", metric.measurementMethod));
      blocks.push(...textBlock("עדיפות", PRIORITY_LABELS[metric.priority] ?? metric.priority));
      blocks.push({ kind: "space" });
    });
  }

  return blocks;
}

export default function AdminProjectViewPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { currentStep, hydrateFromProject, backupState, restoreBackup } =
    useFormStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "partial" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const backedUp = useRef(false);

  const fetchAndHydrate = useCallback(async () => {
    if (!backedUp.current) {
      backupState();
      backedUp.current = true;
    }

    try {
      const res = await fetch(`/api/admin/projects/${projectId}`);
      if (!res.ok) throw new Error();
      const data: AdminProjectData = await res.json();
      hydrateFromProject(data);
    } catch {
      setError("שגיאה בטעינת הפרויקט");
    } finally {
      setLoading(false);
    }
  }, [projectId, hydrateFromProject, backupState]);

  useEffect(() => {
    fetchAndHydrate();

    return () => {
      restoreBackup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveStatus("idle");
    setSaveError("");

    try {
      const store = useFormStore.getState();
      const { projectIntake, agentDetails, useCases, dataSources, concepts, successMetrics, projectStatus } = store;

      const payload = {
        clientName: projectIntake.clientName,
        projectName: agentDetails.requestedAgentName,
        authorName: projectIntake.documentAuthorName,
        status: projectStatus,
        authorDepartment: projectIntake.department || null,
        authorPosition: projectIntake.position || null,
        agentName: agentDetails.requestedAgentName,
        agentDescription: agentDetails.shortAgentDescription,
        useCases: useCases.map((uc) => ({
          name: uc.useCaseName,
          title: uc.title || null,
          performedBy: uc.performer || null,
          systems: uc.systemsInvolved,
          notes: uc.additionalNotes || null,
          qaPairs: uc.qaPairs.map((qa) => ({
            question: qa.question,
            expectedAnswer: qa.expectedAnswer,
            dataSourceRef: qa.dataSourceRef || null,
          })),
          flowSteps: uc.flowSteps.map((fs) => ({
            order: fs.order,
            description: fs.description,
            hasCalculation: fs.hasCalculation,
            calculationDetails: fs.calculationDetails || null,
          })),
        })),
        dataSources: dataSources.map((ds) => ({
          name: ds.name,
          type: ds.type || null,
          description: ds.description || null,
          accessMethod: ds.accessMethod || null,
        })),
        concepts: concepts.map((c) => ({
          term: c.term,
          definition: c.definition || null,
          examples: c.examples || null,
        })),
        metrics: successMetrics.map((m) => ({
          name: m.metric,
          target: m.target || null,
          measurementMethod: m.measurementMethod || null,
          priority: m.priority,
        })),
      };

      // 1. Save to database
      const dbRes = await fetch(`/api/admin/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!dbRes.ok) {
        const body = (await dbRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "שגיאה בשמירה למסד הנתונים");
      }

      // 2. Generate Word document and upload to blob
      let wordUploadError: string | null = null;
      try {
        const wordBlocks = buildWordBlocks(store);
        const docxBlob = await createHebrewWordBlob(wordBlocks);

        const clientName = projectIntake.clientName.trim();
        const agentName = agentDetails.requestedAgentName.trim();
        const authorName = projectIntake.documentAuthorName.trim();

        const docxFile = new File(
          [docxBlob],
          `${agentName}-${authorName}.docx`,
          { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
        );

        const formData = new FormData();
        formData.append("file", docxFile);
        formData.append("isSummary", "true");
        formData.append("fieldName", "finalSummaryDocx");
        formData.append("stepId", "summary");
        formData.append("clientName", clientName);
        formData.append("requestedAgentName", agentName);
        formData.append("documentAuthorName", authorName);
        formData.append("projectId", projectId);

        const uploadRes = await fetch("/api/file-upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const uploadBody = (await uploadRes.json().catch(() => null)) as { error?: string } | null;
          throw new Error(uploadBody?.error ?? "שגיאה בעדכון קובץ ה-Word בענן");
        }
      } catch (docxErr) {
        console.error("DOCX generation/upload error (non-blocking):", docxErr);
        wordUploadError =
          docxErr instanceof Error
            ? docxErr.message
            : "שגיאה בעדכון קובץ ה-Word בענן";
      }

      if (wordUploadError) {
        setSaveStatus("partial");
        setSaveError(`השינויים נשמרו, אך קובץ ה-Word לא עודכן: ${wordUploadError}`);
        setTimeout(() => setSaveStatus("idle"), 8000);
      } else {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 4000);
      }
    } catch (err) {
      setSaveStatus("error");
      setSaveError(err instanceof Error ? err.message : "שגיאה בשמירת השינויים");
    } finally {
      setSaving(false);
    }
  }, [projectId]);

  const StepComponent = STEP_COMPONENTS[currentStep] ?? StepAgentDetails;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7FB] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F7F7FB] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={40} className="mx-auto mb-3 text-red-400" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => router.push("/admin")}>חזרה ללוח הניהול</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F7F7FB]">
      <Sidebar />

      <main className="flex-1 overflow-y-auto pb-20">
        <img
          src="/JEEN_logo.png"
          alt="Jeen"
          className="fixed -top-4 left-4 h-[8.5rem] w-auto z-10"
        />

        {/* Admin navigation bar */}
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-[#EEEEEE] bg-white/90 backdrop-blur px-6 py-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin")}
            className="gap-1.5"
          >
            <ArrowRight size={15} />
            חזרה ללוח הניהול
          </Button>
          <div className="h-4 w-px bg-slate-200" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/admin/project/${projectId}`)}
            className="gap-1.5"
          >
            מעבר לעריכת האפיון
          </Button>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-10 lg:py-12">
          <StepComponent />
        </div>
      </main>

      {/* Floating save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#EEEEEE] bg-white/95 backdrop-blur shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-8 py-3">
          <div className="flex items-center gap-2 text-sm">
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium animate-fade-in">
                <CheckCircle size={15} />
                השינויים נשמרו וקובץ ה-Word עודכן
              </span>
            )}
            {saveStatus === "partial" && (
              <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                <AlertCircle size={15} />
                {saveError}
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1.5 text-red-600 font-medium">
                <AlertCircle size={15} />
                {saveError}
              </span>
            )}
            {saving && (
              <span className="text-slate-500">
                שומר את האפיון ומעדכן את קובץ ה-Word בענן...
              </span>
            )}
            {saveStatus === "idle" && !saving && (
              <span className="text-slate-500">
                שמירה תעדכן את האפיון ואת קובץ ה-Word האחרון בענן
              </span>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="gap-2 min-w-[140px]"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            {saving ? "שומר..." : "שמור שינויים"}
          </Button>
        </div>
      </div>
    </div>
  );
}
