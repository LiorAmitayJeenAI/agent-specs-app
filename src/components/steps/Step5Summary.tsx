"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle,
  Send,
  ChevronRight,
  Sparkles,
  Database,
  BookOpen,
  Target,
  AlertCircle,
} from "lucide-react";
import {
  createHebrewWordBlob,
} from "@/lib/wordExport";
import { useFormStore, type ProjectStatus } from "@/store/formStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LlmDraftPreviewModal from "@/components/steps/LlmDraftPreviewModal";
import DiagramCard from "@/components/steps/DiagramCard";
import PrdDocumentPreview from "@/components/steps/PrdDocumentPreview";
import { resolveDiagramWordBlocks } from "@/lib/diagram/resolveDiagramWordBlocksClient";
import {
  applyLlmDraftSections,
  buildLlmDraftPayload,
  createLlmDraftEditableHash,
  mergeDraftSnapshotIntoPrdSource,
} from "@/lib/llm/draftPayload";
import {
  buildPrdDocumentBlocks,
  resolveDocumentBlocksForExport,
  type PrdDocumentSource,
} from "@/lib/prdDocument";
import type { WordExportBlock } from "@/lib/wordExport";
import type { DiagramType } from "@/types/diagram";
import type { LlmDraftMode, LlmDraftSectionKey, LlmDraftSections } from "@/types/llmDraft";

interface SectionSummaryProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  color: string;
  isEmpty: boolean;
}

async function resolveWordBlocksForExport(
  blocks: Parameters<typeof resolveDocumentBlocksForExport>[0],
  projectId: string | null,
  includedDiagramTypes?: DiagramType[]
): Promise<WordExportBlock[]> {
  const resolvedBlocks = await resolveDocumentBlocksForExport(blocks);
  const diagramBlocks = await resolveDiagramWordBlocks(projectId, includedDiagramTypes);
  return [...resolvedBlocks, ...diagramBlocks];
}

function SectionSummary({ icon, title, count, color, isEmpty }: SectionSummaryProps) {
  return (
    <div className={`flex items-center justify-between rounded-xl border px-3 py-2.5 shadow-sm ${isEmpty ? "border-slate-200 bg-slate-50/80" : "border-current/20 " + color}`}>
      <div className="flex items-center gap-2.5">
        <div className="shrink-0">{icon}</div>
        <div>
          <p className="text-xs font-medium text-slate-700">{title}</p>
          {isEmpty && (
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <AlertCircle size={11} /> לא הוזן מידע
            </p>
          )}
        </div>
      </div>
      <Badge variant={isEmpty ? "secondary" : "success"} className="px-2 py-0 text-[11px]">
        {isEmpty ? "ריק" : `${count} פריטים`}
      </Badge>
    </div>
  );
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "sent_to_client", label: "נשלח ללקוח" },
  { value: "client_draft", label: "טיוטת לקוח" },
  { value: "pm_review", label: "בטיפול מנהל פרויקט" },
  { value: "completed", label: "הושלם" },
];

export default function Step5Summary() {
  const {
    projectIntake,
    agentDetails,
    useCases,
    dataSources,
    concepts,
    successMetrics,
    updateProjectIntake,
    updateAgentDetails,
    updateUseCase,
    updateQAPair,
    updateFlowStep,
    updateDataSource,
    updateConcept,
    updateSuccessMetric,
    prevStep,
    getOutput,
    isAdminView,
    projectStatus,
    setProjectStatus,
    projectId,
    llmDraftSelection,
    setLlmDraftSelection,
    updateSelectedLlmDraftSnapshot,
    clearLlmDraftSelection,
  } = useFormStore();
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [llmConfigured, setLlmConfigured] = useState(false);
  const [llmMode, setLlmMode] = useState<LlmDraftMode>("formal");
  const [isLlmLoading, setIsLlmLoading] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [llmOriginal, setLlmOriginal] = useState<LlmDraftSections | null>(null);
  const [llmProposed, setLlmProposed] = useState<LlmDraftSections | null>(null);
  const [acceptedSourceHash, setAcceptedSourceHash] = useState<string | null>(null);
  const [focusedPreview, setFocusedPreview] = useState<"original" | "ai" | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [wordDiagramInclusion, setWordDiagramInclusion] = useState<Record<DiagramType, boolean>>({
    flow: true,
    architecture: true,
  });
  const previousEditableHashRef = useRef<string | null>(null);

  const output = getOutput();
  const hasUseCases = useCases.length > 0;

  useEffect(() => {
    const loadLlmStatus = () => {
      fetch("/api/llm/status")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { configured?: boolean; mode?: LlmDraftMode } | null) => {
          setLlmConfigured(Boolean(data?.configured));
          if (data?.mode === "formal" || data?.mode === "polish") setLlmMode(data.mode);
        })
        .catch(() => {
          setLlmConfigured(false);
        });
    };

    loadLlmStatus();
    window.addEventListener("focus", loadLlmStatus);
    return () => window.removeEventListener("focus", loadLlmStatus);
  }, []);

  const prdSource: PrdDocumentSource = useMemo(
    () => ({
      projectIntake,
      agentDetails,
      useCases,
      dataSources,
      concepts,
      successMetrics,
    }),
    [projectIntake, agentDetails, useCases, dataSources, concepts, successMetrics]
  );

  const llmPayload = useMemo(() => buildLlmDraftPayload(prdSource), [prdSource]);
  const editableSourceHash = useMemo(
    () => createLlmDraftEditableHash(llmPayload),
    [llmPayload]
  );
  const hasFinalSelection = Boolean(llmDraftSelection);
  const includedDiagramTypes = useMemo(
    () =>
      (["flow", "architecture"] as DiagramType[]).filter((type) => wordDiagramInclusion[type]),
    [wordDiagramInclusion]
  );
  const isComparisonNeeded = !hasFinalSelection && acceptedSourceHash !== editableSourceHash;
  const comparisonOriginalSource = useMemo(
    () => (llmOriginal ? mergeDraftSnapshotIntoPrdSource(prdSource, llmOriginal) : prdSource),
    [prdSource, llmOriginal]
  );
  const comparisonAiSource = useMemo(
    () => (llmProposed ? mergeDraftSnapshotIntoPrdSource(prdSource, llmProposed) : null),
    [prdSource, llmProposed]
  );

  const documentBlocks = useMemo(
    () =>
      buildPrdDocumentBlocks(prdSource, {
        editable: true,
        readOnlyFields: { clientName: true },
        updaters: {
          updateProjectIntake,
          updateAgentDetails,
          updateUseCase,
          updateQAPair,
          updateFlowStep,
          updateDataSource,
          updateConcept,
          updateSuccessMetric,
        },
      }),
    [
      prdSource,
      updateProjectIntake,
      updateAgentDetails,
      updateUseCase,
      updateQAPair,
      updateFlowStep,
      updateDataSource,
      updateConcept,
      updateSuccessMetric,
    ]
  );

  const originalPreviewBlocks = useMemo(
    () => buildPrdDocumentBlocks(comparisonOriginalSource, { editable: false }),
    [comparisonOriginalSource]
  );
  const aiPreviewBlocks = useMemo(
    () => (comparisonAiSource ? buildPrdDocumentBlocks(comparisonAiSource, { editable: false }) : []),
    [comparisonAiSource]
  );

  useEffect(() => {
    if (!llmDraftSelection) {
      previousEditableHashRef.current = editableSourceHash;
      return;
    }

    if (llmDraftSelection.editableSourceHash === editableSourceHash) {
      previousEditableHashRef.current = editableSourceHash;
      return;
    }

    if (previousEditableHashRef.current === null) {
      clearLlmDraftSelection();
      setAcceptedSourceHash(null);
      previousEditableHashRef.current = editableSourceHash;
      return;
    }

    setLlmDraftSelection({
      ...llmDraftSelection,
      [llmDraftSelection.selectedVersion]: llmPayload,
      editableSourceHash,
    });
    setAcceptedSourceHash(editableSourceHash);
    previousEditableHashRef.current = editableSourceHash;
  }, [
    clearLlmDraftSelection,
    editableSourceHash,
    llmDraftSelection,
    llmPayload,
    setLlmDraftSelection,
  ]);

  useEffect(() => {
    if (!isComparisonNeeded) return;

    setLlmError(null);
    setLlmOriginal(llmPayload);
    setLlmProposed(null);

    if (!llmConfigured) {
      setIsLlmLoading(false);
      setLlmError("שירות AI לא זמין כרגע ולכן לא ניתן ליצור גרסת PRD להשוואה.");
      return;
    }

    let cancelled = false;
    setIsLlmLoading(true);

    fetch("/api/llm/polish-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sections: llmPayload }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
          sections?: LlmDraftSections;
          mode?: LlmDraftMode;
        } | null;

        if (!res.ok) {
          throw new Error(data?.error ?? "לא הצלחנו ליצור גרסת AI למסמך.");
        }
        if (!data?.sections) {
          throw new Error("תשובה לא תקינה מהשרת.");
        }
        if (cancelled) return;
        if (data.mode === "formal" || data.mode === "polish") {
          setLlmMode(data.mode);
        }
        setLlmProposed(data.sections);
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setLlmError(error.message || "לא הצלחנו ליצור גרסת AI למסמך. בדוק את החיבור ונסה שוב.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLlmLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isComparisonNeeded, llmConfigured, llmPayload, retryToken]);

  const handleUseOriginal = () => {
    if (llmOriginal && llmProposed) {
      setLlmDraftSelection({
        projectId: projectId ?? null,
        original: llmOriginal,
        ai: llmProposed,
        selectedVersion: "original",
        editableSourceHash,
      });
    }
    setAcceptedSourceHash(editableSourceHash);
    setFocusedPreview(null);
    setLlmOriginal(null);
    setLlmProposed(null);
    setLlmError(null);
  };

  const handleUseAi = () => {
    if (!llmProposed) return;
    setLlmDraftSelection({
      projectId: projectId ?? null,
      original: llmOriginal ?? llmPayload,
      ai: llmProposed,
      selectedVersion: "ai",
      editableSourceHash,
    });
    setAcceptedSourceHash(editableSourceHash);
    applyLlmDraftSections(
      {
        updateAgentDetails,
        updateUseCase,
        updateQAPair,
        updateFlowStep,
        updateDataSource,
        updateConcept,
        updateSuccessMetric,
      },
      llmProposed,
      new Set<LlmDraftSectionKey>(["fullDocument"])
    );
    setFocusedPreview(null);
    setLlmOriginal(null);
    setLlmProposed(null);
    setLlmError(null);
  };

  const handleReturnToComparison = () => {
    if (!llmDraftSelection) return;

    const nextOriginal =
      llmDraftSelection.selectedVersion === "original"
        ? llmPayload
        : llmDraftSelection.original;
    const nextAi =
      llmDraftSelection.selectedVersion === "ai"
        ? llmPayload
        : llmDraftSelection.ai;

    updateSelectedLlmDraftSnapshot(llmPayload);
    setLlmOriginal(nextOriginal);
    setLlmProposed(nextAi);
    setFocusedPreview(llmDraftSelection.selectedVersion);
  };

  const clearLlmDraftCache = () => {
    setLlmOriginal(null);
    setLlmProposed(null);
    setAcceptedSourceHash(null);
    setFocusedPreview(null);
    setLlmError(null);
    clearLlmDraftSelection();
  };

  const handleWordDiagramInclusionChange = (type: DiagramType, included: boolean) => {
    setWordDiagramInclusion((current) => ({ ...current, [type]: included }));
  };

  const totalFlowSteps = useCases.reduce((sum, uc) => sum + uc.flowSteps.length, 0);
  const totalFiles = useCases.reduce(
    (sum, uc) => sum + uc.flowSteps.reduce((s, step) => s + step.files.length, 0),
    0
  );

  const handleSubmit = async () => {
    setIsLoading(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(output),
      });

      const responseBody = (await res.json().catch(() => null)) as { error?: string; projectId?: string } | null;

      if (!res.ok) {
        setSubmitError(responseBody?.error ?? "אירעה שגיאה בשליחת הטופס. נסה שוב בעוד רגע.");
        return;
      }

      const projectId = responseBody?.projectId;

      // Generate and upload DOCX summary to Azure Blob
      try {
        const summaryClientName = output.projectIntake.clientName.trim();
        const summaryAgentName = output.agentDetails.requestedAgentName.trim();
        const summaryAuthorName = output.projectIntake.documentAuthorName.trim();
        const exportBlocks = await resolveWordBlocksForExport(
          documentBlocks,
          projectId ?? null,
          includedDiagramTypes
        );
        const docxBlob = await createHebrewWordBlob(exportBlocks);
        const docxFile = new File([docxBlob], `${summaryAgentName}-${summaryAuthorName}.docx`, {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
        const formData = new FormData();
        formData.append("file", docxFile);
        formData.append("isSummary", "true");
        formData.append("fieldName", "finalSummaryDocx");
        formData.append("stepId", "summary");
        formData.append("clientName", summaryClientName);
        formData.append("requestedAgentName", summaryAgentName);
        formData.append("documentAuthorName", summaryAuthorName);
        if (projectId) formData.append("projectId", projectId);

        const uploadRes = await fetch("/api/file-upload", { method: "POST", body: formData });
        if (!uploadRes.ok) {
          const uploadBody = (await uploadRes.json().catch(() => null)) as { error?: string } | null;
          throw new Error(uploadBody?.error ?? "DOCX upload failed");
        }

        const uploadResult = (await uploadRes.json().catch(() => null)) as {
          blobPath?: string;
        } | null;

        if (uploadResult?.blobPath) {
          const parentFolder = uploadResult.blobPath.substring(
            0,
            uploadResult.blobPath.lastIndexOf("/")
          );
          const companionFolder = `${parentFolder}/Uploaded images and files`;

          const seenNames = new Map<string, number>();
          const deduplicateName = (name: string) => {
            const count = seenNames.get(name) || 0;
            seenNames.set(name, count + 1);
            if (count === 0) return name;
            const dotIdx = name.lastIndexOf(".");
            if (dotIdx > 0) {
              return `${name.substring(0, dotIdx)} (${count})${name.substring(dotIdx)}`;
            }
            return `${name} (${count})`;
          };

          const companionFiles: { sourceBlobPath: string; fileName: string }[] = [];
          for (const uc of output.useCases) {
            for (const step of uc.flowSteps) {
              for (const f of step.files) {
                if (f.uploadStatus === "uploaded" && f.blobPath) {
                  companionFiles.push({
                    sourceBlobPath: f.blobPath,
                    fileName: deduplicateName(f.name),
                  });
                }
              }
            }
          }
          for (const ds of output.dataSources) {
            for (const f of ds.files) {
              if (f.uploadStatus === "uploaded" && f.blobPath) {
                companionFiles.push({
                  sourceBlobPath: f.blobPath,
                  fileName: deduplicateName(f.name),
                });
              }
            }
          }

          if (companionFiles.length > 0) {
            try {
              await fetch("/api/copy-companion-files", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  files: companionFiles,
                  targetFolder: companionFolder,
                }),
              });
            } catch (copyErr) {
              console.error("Companion files copy error (non-blocking):", copyErr);
            }
          }
        }
      } catch (docxError) {
        console.error("DOCX upload error (non-blocking):", docxError);
      }

      useFormStore.persist.clearStorage();
      clearLlmDraftCache();
      setSubmitted(true);
    } catch (error) {
      console.error("שגיאה בשליחה");
      setSubmitError("לא הצלחנו לשלוח את הטופס. בדוק את החיבור ונסה שוב.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportWord = async () => {
    const exportBlocks = await resolveWordBlocksForExport(documentBlocks, projectId, includedDiagramTypes);
    const rtlBlob = await createHebrewWordBlob(exportBlocks);
    const url = URL.createObjectURL(rtlBlob);
    const link = document.createElement("a");
    const fileNameBase =
      agentDetails.requestedAgentName || projectIntake.clientName || "ai-agent-spec";
    link.href = url;
    link.download = `${fileNameBase.replace(/[\\/:*?"<>|]/g, "-")}.docx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in rounded-[2rem] bg-white/80 border border-white/70 shadow-xl shadow-emerald-950/[0.06]">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-6 shadow-inner">
          <CheckCircle size={40} className="text-emerald-500" strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">הטופס נשלח בהצלחה!</h2>
        <p className="text-slate-500 mb-2">
          קיבלנו את כל המידע. נחזור אליך בקרוב עם תוכנית לבניית הסוכן.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-[2rem] bg-white/75 border border-white/70 shadow-xl shadow-indigo-950/[0.04] px-6 py-6 backdrop-blur">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-2xl bg-[#EEE9FF] text-[#5B4FE8] flex items-center justify-center ring-1 ring-[#C4B8FF]/50">
            <Send size={15} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">סיכום ושליחה</h1>
        </div>
        <p className="text-slate-500 text-sm mt-2">
          בדוק שהכל מלא ולחץ שלח. אנחנו נסקור את המידע ונחזור אליך.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>פרטי המסמך והסוכן</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50/80 border border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-400">לקוח</p>
            <p className="text-sm font-semibold text-slate-800 mt-1">{projectIntake.clientName}</p>
          </div>
          <div className="rounded-2xl bg-slate-50/80 border border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-400">עורך המסמך</p>
            <p className="text-sm font-semibold text-slate-800 mt-1">
              {projectIntake.documentAuthorName}
            </p>
          </div>
          <div className="rounded-2xl bg-indigo-50/80 border border-indigo-100 px-4 py-3 sm:col-span-2">
            <p className="text-xs text-indigo-400">שם הסוכן</p>
            <p className="text-sm font-semibold text-slate-800 mt-1">
              {agentDetails.requestedAgentName}
            </p>
            <p className="text-sm text-slate-500 mt-2">
              {agentDetails.shortAgentDescription}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary overview */}
      <Card>
        <CardHeader className="px-5 py-3.5">
          <CardTitle className="text-sm">סיכום המידע שנאסף</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 px-5 py-3 sm:grid-cols-2">
          <SectionSummary
            icon={<Sparkles size={15} className="text-indigo-500" />}
            title={`תרחישי שימוש (${useCases.length})`}
            count={useCases.length}
            color="bg-indigo-50 border-indigo-200"
            isEmpty={!hasUseCases}
          />
          <SectionSummary
            icon={<Database size={15} className="text-emerald-500" />}
            title={`מקורות מידע (${dataSources.length})`}
            count={dataSources.length}
            color="bg-emerald-50 border-emerald-200"
            isEmpty={dataSources.length === 0}
          />
          <SectionSummary
            icon={<BookOpen size={15} className="text-violet-500" />}
            title={`מושגים והגדרות (${concepts.length})`}
            count={concepts.length}
            color="bg-violet-50 border-violet-200"
            isEmpty={concepts.length === 0}
          />
          <SectionSummary
            icon={<Target size={15} className="text-amber-500" />}
            title={`מדדי הצלחה (${successMetrics.length})`}
            count={successMetrics.length}
            color="bg-amber-50 border-amber-200"
            isEmpty={successMetrics.length === 0}
          />
        </CardContent>
      </Card>

      {/* Stats */}
      {hasUseCases && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "תרחישי שימוש", value: useCases.length, color: "text-indigo-600 bg-gradient-to-br from-indigo-50 to-white border-indigo-100" },
            { label: "שלבי תהליך", value: totalFlowSteps, color: "text-violet-600 bg-gradient-to-br from-violet-50 to-white border-violet-100" },
            { label: "קבצים מצורפים", value: totalFiles, color: "text-emerald-600 bg-gradient-to-br from-emerald-50 to-white border-emerald-100" },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-2xl p-4 text-center border shadow-sm ${stat.color}`}>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs mt-0.5 opacity-70">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Warning if no use cases */}
      {!hasUseCases && (
        <div className="flex items-start gap-3 bg-gradient-to-l from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-4 py-3 shadow-sm">
          <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">חסר מידע חיוני</p>
            <p className="text-xs text-amber-600 mt-0.5">
              לא הוזן אף תרחיש שימוש — זהו השדה החשוב ביותר. מומלץ לחזור ולמלא.
            </p>
          </div>
        </div>
      )}

      <section className="rounded-3xl border border-[#E0E0E0] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">
                {isComparisonNeeded ? "השוואת גרסאות PRD" : "תצוגה מקדימה של המסמך"}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {isComparisonNeeded
                  ? "גרסת ה-AI נוצרת אוטומטית. לאחר ההשוואה יש לבחור את המסמך שבו תרצה להשתמש."
                  : "זהו תוכן המסמך כפי שהוא יופיע בייצוא. אפשר לגלול, לקרוא ולבדוק את המידע לפני הורדה."}
              </p>
            </div>
            {isComparisonNeeded && (
              <Badge variant="secondary" className="shrink-0 px-3 py-1 text-[11px]">
                מצב: {llmMode === "formal" ? "אפיון רשמי" : "ליטוש"}
              </Badge>
            )}
          </div>
          {llmError && (
            <p className="mt-2 text-xs text-red-600">{llmError}</p>
          )}
        </div>

        <div className="bg-[#F7F7FB] px-3 py-3 sm:px-4">
          {isComparisonNeeded ? (
            <div className="min-h-[480px]">
              {isLlmLoading && (
                <div className="flex min-h-[480px] flex-col items-center justify-center rounded-2xl border border-dashed border-indigo-200 bg-white/80 text-center">
                  <span className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  <p className="text-sm font-semibold text-slate-800">יוצר גרסת AI למסמך...</p>
                  <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">
                    אנחנו מכינים מסמך PRD מלא להשוואה מול הגרסה המקורית.
                  </p>
                </div>
              )}

              {!isLlmLoading && llmError && (
                <div className="flex min-h-[480px] flex-col items-center justify-center rounded-2xl border border-red-100 bg-white/90 px-6 text-center">
                  <AlertCircle size={28} className="mb-3 text-red-500" />
                  <p className="text-sm font-semibold text-slate-900">לא ניתן להציג השוואה כרגע</p>
                  <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-500">{llmError}</p>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-4"
                    onClick={() => setRetryToken((value) => value + 1)}
                  >
                    נסה שוב
                  </Button>
                </div>
              )}

              {!isLlmLoading && !llmError && llmOriginal && llmProposed && (
                <div className="grid gap-4 lg:grid-cols-2">
                  {[
                    {
                      key: "original" as const,
                      title: "המסמך המקורי",
                      description: "הגרסה שנבנתה מהמידע שהוזן בטופס.",
                      actionLabel: "השתמש בגרסה המקורית",
                      blocks: originalPreviewBlocks,
                      onUse: handleUseOriginal,
                    },
                    {
                      key: "ai" as const,
                      title: "המסמך אחרי AI",
                      description: "גרסה מלאה לאחר שכתוב ושיפור מקצועי.",
                      actionLabel: "השתמש בגרסת ה-AI",
                      blocks: aiPreviewBlocks,
                      onUse: handleUseAi,
                    },
                  ].map((pane) => (
                    <div
                      key={pane.key}
                      className="flex h-[70vh] min-h-[480px] max-h-[760px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => setFocusedPreview(pane.key)}
                        className="shrink-0 border-b border-slate-100 bg-white px-4 py-3 text-right transition hover:bg-slate-50"
                      >
                        <p className="text-sm font-bold text-slate-900">{pane.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">{pane.description}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFocusedPreview(pane.key)}
                        className="min-h-0 flex-1 overflow-y-auto bg-slate-50/80 p-3 text-right"
                      >
                        <PrdDocumentPreview blocks={pane.blocks} compact interactive={false} />
                      </button>
                      <div className="z-10 flex shrink-0 justify-end border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur">
                        <Button
                          type="button"
                          size="sm"
                          variant={pane.key === "ai" ? "primary" : "outline"}
                          onClick={pane.onUse}
                          className="shrink-0"
                        >
                          {pane.actionLabel}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {hasFinalSelection && (
                <div className="mb-3 flex justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={handleReturnToComparison}>
                    חזור להשוואת גרסאות
                  </Button>
                </div>
              )}
              <div className="max-h-[480px] overflow-y-auto">
                <PrdDocumentPreview blocks={documentBlocks} className="mx-auto max-w-3xl" />
              </div>
            </>
          )}
        </div>
      </section>

      {isAdminView && (
        <Card>
          <CardHeader>
            <CardTitle>סטטוס מסמך</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={projectStatus}
              onChange={(e) => setProjectStatus(e.target.value as ProjectStatus)}
              className="flex w-full max-w-sm rounded-lg border border-[#E0E0E0] bg-white px-3.5 py-2.5 text-sm text-[#1A1A2E] shadow-sm transition focus:border-[#5B4FE8] focus:outline-none focus:shadow-[0_0_0_3px_rgba(91,79,232,0.1)]"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              שינוי סטטוס נשמר בלחיצה על &quot;שמור שינויים&quot;. יצירת תרשים תסנכרן
              סטטוס &quot;הושלם&quot; אוטומטית אם טרם נשמר.
            </p>
          </CardContent>
        </Card>
      )}

      {projectStatus === "completed" && (
        <DiagramCard
          projectId={projectId}
          isAdminView={isAdminView}
          hasUseCases={hasUseCases}
          projectStatus={projectStatus}
          wordDiagramInclusion={wordDiagramInclusion}
          onWordDiagramInclusionChange={handleWordDiagramInclusionChange}
        />
      )}

      {focusedPreview && llmOriginal && llmProposed && (
        <LlmDraftPreviewModal
          open
          initialVersion={focusedPreview}
          originalBlocks={originalPreviewBlocks}
          aiBlocks={aiPreviewBlocks}
          onUseOriginal={handleUseOriginal}
          onUseAi={handleUseAi}
          onClose={() => setFocusedPreview(null)}
        />
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-[#E0E0E0] rounded-2xl px-4 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.07)]">
        <p className="text-sm text-slate-600">
          אפשר להוריד את כל האפיון כמסמך Word מסודר.
        </p>
        <Button size="sm" onClick={handleExportWord} className="w-full sm:w-auto shrink-0">
          <span aria-hidden="true">📄</span>
          ייצוא לקובץ 
        </Button>
      </div>

      {!isAdminView && submitError && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
          <p>{submitError}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-4 border-t border-white/70">
        <Button variant="outline" onClick={prevStep}>
          <ChevronRight size={17} />
          חזור
        </Button>
        {!isAdminView && (
          <Button
            onClick={handleSubmit}
            size="lg"
            disabled={isLoading}
            className="gap-2 from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 min-w-[160px] shadow-emerald-500/20"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                שולח...
              </span>
            ) : (
              <>
                <Send size={16} />
                שלח לצוות
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
