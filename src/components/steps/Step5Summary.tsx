"use client";

import { useState } from "react";
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
  resolveImageBlock,
  formatDocumentValue,
  type WordExportValue,
  type WordExportBlock,
} from "@/lib/wordExport";
import { useFormStore, type ProjectStatus } from "@/store/formStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SectionSummaryProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  color: string;
  isEmpty: boolean;
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

type DocumentValue = WordExportValue;

type DocumentBlock =
  | { kind: "title"; text: string }
  | { kind: "meta"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "subheading"; text: string }
  | { kind: "label"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "editableText"; value: string; onChange: (value: string) => void; multiline?: boolean }
  | { kind: "editableList"; value: string[]; onChange: (value: string[]) => void }
  | { kind: "editableSelect"; value: string; options: string[]; onChange: (value: string) => void }
  | { kind: "editableBoolean"; value: boolean; onChange: (value: boolean) => void }
  | { kind: "empty"; text: string }
  | { kind: "space" }
  | { kind: "imageRef"; url?: string; preview?: string };

const CUSTOMER_OPTIONS = [
  "מכבי שירותי בריאות",
  "חברת חשמל לישראל",
  "ישראכרט",
  "ביטוח ישיר",
];

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "sent_to_client", label: "נשלח ללקוח" },
  { value: "client_draft", label: "טיוטת לקוח" },
  { value: "pm_review", label: "בטיפול מנהל פרויקט" },
  { value: "completed", label: "הושלם" },
];

const SOURCE_TYPES = [
  "מסד נתונים (SQL)",
  "קובץ Excel / CSV",
  "API חיצוני",
  "מערכת ERP",
  "מערכת CRM",
  "דוא\"ל / לוח שנה",
  "מסמכים (Word/PDF)",
  "Jira",
  "אחר",
];

const fieldBlocks = (label: string, value: DocumentValue): DocumentBlock[] => [
  { kind: "label", text: label },
  { kind: "paragraph", text: formatDocumentValue(value) },
];

const editableTextBlocks = (
  label: string,
  value: string,
  onChange: (value: string) => void,
  multiline = true
): DocumentBlock[] => [
  { kind: "label", text: label },
  { kind: "editableText", value, onChange, multiline },
];

const editableListBlocks = (
  label: string,
  value: string[],
  onChange: (value: string[]) => void
): DocumentBlock[] => [
  { kind: "label", text: label },
  { kind: "editableList", value, onChange },
];

const editableSelectBlocks = (
  label: string,
  value: string,
  options: string[],
  onChange: (value: string) => void
): DocumentBlock[] => [
  { kind: "label", text: label },
  { kind: "editableSelect", value, options, onChange },
];

const editableBooleanBlocks = (
  label: string,
  value: boolean,
  onChange: (value: boolean) => void
): DocumentBlock[] => [
  { kind: "label", text: label },
  { kind: "editableBoolean", value, onChange },
];

const emptyBlocks = (text: string): DocumentBlock[] => [{ kind: "empty", text }];

async function resolveDocumentBlocksForExport(blocks: DocumentBlock[]): Promise<WordExportBlock[]> {
  const resolved: WordExportBlock[] = [];

  for (const block of blocks) {
    if (block.kind === "imageRef") {
      const imageBlock = await resolveImageBlock({ url: block.url, preview: block.preview });
      if (imageBlock) resolved.push(imageBlock);
    } else {
      resolved.push(block as WordExportBlock);
    }
  }

  return resolved;
}

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
  } = useFormStore();
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const output = getOutput();
  const hasUseCases = useCases.length > 0;

  const totalFlowSteps = useCases.reduce((sum, uc) => sum + uc.flowSteps.length, 0);
  const totalFiles = useCases.reduce(
    (sum, uc) => sum + uc.flowSteps.reduce((s, step) => s + step.files.length, 0),
    0
  );
  const documentBlocks: DocumentBlock[] = [
    { kind: "title", text: "מסמך אפיון סוכן AI" },
    { kind: "meta", text: `תאריך יצירה: ${new Date().toLocaleDateString("he-IL")}` },
    { kind: "space" },
    { kind: "heading", text: "שם הלקוח" },
    {
      kind: "editableSelect",
      value: projectIntake.clientName,
      options: CUSTOMER_OPTIONS,
      onChange: (clientName) => updateProjectIntake({ clientName }),
    },
    { kind: "space" },
    { kind: "heading", text: "עורך המסמך" },
    {
      kind: "editableText",
      value: projectIntake.documentAuthorName,
      onChange: (documentAuthorName) => updateProjectIntake({ documentAuthorName }),
      multiline: false,
    },
    { kind: "space" },
    { kind: "heading", text: "שם הסוכן" },
    {
      kind: "editableText",
      value: agentDetails.requestedAgentName,
      onChange: (requestedAgentName) => updateAgentDetails({ requestedAgentName }),
      multiline: false,
    },
    { kind: "space" },
    { kind: "heading", text: "תיאור כללי" },
    {
      kind: "editableText",
      value: agentDetails.shortAgentDescription,
      onChange: (shortAgentDescription) => updateAgentDetails({ shortAgentDescription }),
    },
    { kind: "space" },
    { kind: "heading", text: "תרחישי שימוש" },
    ...(useCases.length > 0
      ? useCases.flatMap((uc, ucIndex): DocumentBlock[] => [
          {
            kind: "subheading",
            text: `תרחיש ${ucIndex + 1}: ${uc.useCaseName || uc.qaPairs?.[0]?.question || "תרחיש ללא שם"}`,
          },
          ...editableTextBlocks("שם תרחיש השימוש", uc.useCaseName, (useCaseName) =>
            updateUseCase(uc.id, { useCaseName })
          ),
          ...editableTextBlocks("תיאור התרחיש", uc.title, (title) =>
            updateUseCase(uc.id, { title })
          ),
          { kind: "subheading", text: "התהליך הקיים כיום" },
          ...editableTextBlocks("מבצע התהליך כיום", uc.performer, (performer) =>
            updateUseCase(uc.id, { performer })
          ),
          ...editableListBlocks("מערכות מעורבות", uc.systemsInvolved, (systemsInvolved) =>
            updateUseCase(uc.id, { systemsInvolved })
          ),
          ...editableTextBlocks("הערות נוספות", uc.additionalNotes, (additionalNotes) =>
            updateUseCase(uc.id, { additionalNotes })
          ),
          { kind: "subheading", text: "דוגמאות לשאלות אפשריות, תשובות ומקורות מידע" },
          ...(uc.qaPairs ?? []).flatMap((pair, pairIndex): DocumentBlock[] => [
            { kind: "label", text: `שאלה ${pairIndex + 1}` },
            {
              kind: "editableText",
              value: pair.question,
              onChange: (question) =>
                updateQAPair(uc.id, pair.id, { question }),
            },
            { kind: "label", text: `תשובה ${pairIndex + 1}` },
            {
              kind: "editableText",
              value: pair.expectedAnswer,
              onChange: (expectedAnswer) =>
                updateQAPair(uc.id, pair.id, { expectedAnswer }),
            },
            { kind: "label", text: `מקור מידע ${pairIndex + 1}` },
            {
              kind: "editableText",
              value: pair.dataSourceRef,
              onChange: (dataSourceRef) =>
                updateQAPair(uc.id, pair.id, { dataSourceRef }),
            },
          ]),
          { kind: "subheading", text: "פירוט התהליך הקיים (Flow)" },
          ...(uc.flowSteps.length > 0
            ? uc.flowSteps.flatMap((step): DocumentBlock[] => [
                { kind: "label", text: `שלב ${step.order}` },
                {
                  kind: "editableText",
                  value: step.description,
                  onChange: (description) => updateFlowStep(uc.id, step.id, { description }),
                },
                ...editableBooleanBlocks("יש חישוב בשלב זה?", step.hasCalculation, (hasCalculation) =>
                  updateFlowStep(uc.id, step.id, {
                    hasCalculation,
                    calculationDetails: hasCalculation ? step.calculationDetails : "",
                  })
                ),
                ...(step.hasCalculation
                  ? editableTextBlocks("פירוט החישוב", step.calculationDetails, (calculationDetails) =>
                      updateFlowStep(uc.id, step.id, { calculationDetails })
                    )
                  : []),
                ...(step.files.filter((f) => f.kind === "image" && f.uploadStatus === "uploaded").length > 0
                  ? [
                      { kind: "label" as const, text: "צילומי מסך" },
                      ...step.files
                        .filter((f) => f.kind === "image" && f.uploadStatus === "uploaded")
                        .map((f): DocumentBlock => ({ kind: "imageRef", url: f.url, preview: f.preview })),
                    ]
                  : []),
                ...(step.files.filter((f) => f.kind !== "image" && f.uploadStatus === "uploaded").length > 0
                  ? [
                      { kind: "label" as const, text: "קבצים מצורפים" },
                      ...step.files
                        .filter((f) => f.kind !== "image" && f.uploadStatus === "uploaded")
                        .map((f): DocumentBlock => ({ kind: "paragraph" as const, text: `📎 ${f.name}` })),
                    ]
                  : []),
              ])
            : emptyBlocks("לא הוזנו שלבי תהליך.")),
          { kind: "space" },
        ])
      : emptyBlocks("לא הוזנו תרחישי שימוש.")),
    { kind: "space" },
    { kind: "heading", text: "מקורות מידע" },
    ...(dataSources.length > 0
      ? dataSources.flatMap((source, index): DocumentBlock[] => [
          { kind: "subheading", text: `מקור מידע ${index + 1}: ${source.name || "מקור ללא שם"}` },
          ...editableTextBlocks("שם מקור הנתונים", source.name, (name) =>
            updateDataSource(source.id, { name })
          ),
          ...editableSelectBlocks("סוג מקור", source.type, SOURCE_TYPES, (type) =>
            updateDataSource(source.id, { type })
          ),
          ...editableTextBlocks("תיאור", source.description, (description) =>
            updateDataSource(source.id, { description })
          ),
          ...(source.files.filter((f) => f.uploadStatus === "uploaded").length > 0
            ? [
                { kind: "label" as const, text: "קבצים מצורפים" },
                ...source.files
                  .filter((f) => f.uploadStatus === "uploaded")
                  .flatMap((f): DocumentBlock[] =>
                    f.kind === "image"
                      ? [{ kind: "imageRef" as const, url: f.url, preview: f.preview }]
                      : [{ kind: "paragraph" as const, text: `📎 ${f.name}` }]
                  ),
              ]
            : []),
          { kind: "space" },
        ])
      : emptyBlocks("לא הוזנו מקורות מידע.")),
    { kind: "space" },
    { kind: "heading", text: "מושגים והגדרות" },
    ...(concepts.length > 0
      ? concepts.flatMap((concept, index): DocumentBlock[] => [
          { kind: "subheading", text: `מושג ${index + 1}: ${concept.term || "מושג ללא שם"}` },
          ...editableTextBlocks("המונח", concept.term, (term) =>
            updateConcept(concept.id, { term })
          ),
          ...editableTextBlocks("הגדרה", concept.definition, (definition) =>
            updateConcept(concept.id, { definition })
          ),
          ...editableTextBlocks("דוגמאות", concept.examples, (examples) =>
            updateConcept(concept.id, { examples })
          ),
          { kind: "space" },
        ])
      : emptyBlocks("לא הוזנו מושגים והגדרות.")),
    { kind: "space" },
    { kind: "heading", text: "מדדי הצלחה" },
    ...(successMetrics.length > 0
      ? successMetrics.flatMap((metric, index): DocumentBlock[] => [
          { kind: "subheading", text: `מדד ${index + 1}: ${metric.metric || "מדד ללא שם"}` },
          ...editableTextBlocks("שם המדד", metric.metric, (metricName) =>
            updateSuccessMetric(metric.id, { metric: metricName })
          ),
          ...editableTextBlocks("יעד", metric.target, (target) =>
            updateSuccessMetric(metric.id, { target })
          ),
          ...editableTextBlocks("שיטת מדידה", metric.measurementMethod, (measurementMethod) =>
            updateSuccessMetric(metric.id, { measurementMethod })
          ),
          { kind: "space" },
        ])
      : emptyBlocks("לא הוזנו מדדי הצלחה.")),
  ];

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
        const exportBlocks = await resolveDocumentBlocksForExport(documentBlocks);
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
      setSubmitted(true);
    } catch (error) {
      console.error("שגיאה בשליחה");
      setSubmitError("לא הצלחנו לשלוח את הטופס. בדוק את החיבור ונסה שוב.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportWord = async () => {
    const exportBlocks = await resolveDocumentBlocksForExport(documentBlocks);
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
          </CardContent>
        </Card>
      )}

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
          <h2 className="text-sm font-semibold text-slate-800">תצוגה מקדימה של המסמך</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            זהו תוכן המסמך כפי שהוא יופיע בייצוא. אפשר לגלול, לקרוא ולבדוק את המידע לפני הורדה.
          </p>
        </div>

        <div className="max-h-[480px] overflow-y-auto bg-[#F7F7FB] px-3 py-3 sm:px-4">
          <article className="mx-auto max-w-3xl bg-white px-6 py-7 text-right shadow-sm sm:px-9 sm:py-8">
            {documentBlocks.map((block, index) => {
              if (block.kind === "space") {
                return <div key={index} className="h-3" />;
              }

              if (block.kind === "title") {
                return (
                  <h1 key={index} className="mb-2 text-2xl font-bold leading-tight text-slate-950">
                    {block.text}
                  </h1>
                );
              }

              if (block.kind === "meta") {
                return (
                  <p key={index} className="mb-5 text-xs leading-relaxed text-slate-400">
                    {block.text}
                  </p>
                );
              }

              if (block.kind === "heading") {
                return (
                  <h2
                    key={index}
                    className="mb-2 mt-5 border-b border-slate-200 pb-1.5 text-lg font-bold leading-tight text-slate-900"
                  >
                    {block.text}
                  </h2>
                );
              }

              if (block.kind === "subheading") {
                return (
                  <h3 key={index} className="mb-1.5 mt-4 text-sm font-bold leading-tight text-slate-800">
                    {block.text}
                  </h3>
                );
              }

              if (block.kind === "label") {
                return (
                  <p key={index} className="mt-3 text-xs font-semibold leading-relaxed text-slate-700">
                    {block.text}:
                  </p>
                );
              }

              if (block.kind === "empty") {
                return (
                  <p key={index} className="whitespace-pre-wrap text-xs italic leading-6 text-slate-400">
                    {block.text}
                  </p>
                );
              }

              if (block.kind === "editableText") {
                return (
                  <textarea
                    key={index}
                    value={block.value}
                    rows={
                      block.multiline === false
                        ? 1
                        : Math.min(6, Math.max(2, block.value.split("\n").length))
                    }
                    placeholder="-"
                    onChange={(event) => block.onChange(event.target.value)}
                    className="block w-full resize-none rounded-md border border-transparent bg-transparent px-0 py-0 text-xs leading-6 text-slate-700 outline-none transition-colors placeholder:text-slate-300 hover:bg-slate-50 focus:border-indigo-100 focus:bg-indigo-50/40 focus:px-2 focus:py-1"
                  />
                );
              }

              if (block.kind === "editableList") {
                return (
                  <textarea
                    key={index}
                    value={block.value.join("\n")}
                    rows={Math.min(6, Math.max(2, block.value.length))}
                    placeholder="-"
                    onChange={(event) =>
                      block.onChange(
                        event.target.value
                          .split("\n")
                          .map((item) => item.trim())
                          .filter(Boolean)
                      )
                    }
                    className="block w-full resize-none rounded-md border border-transparent bg-transparent px-0 py-0 text-xs leading-6 text-slate-700 outline-none transition-colors placeholder:text-slate-300 hover:bg-slate-50 focus:border-indigo-100 focus:bg-indigo-50/40 focus:px-2 focus:py-1"
                  />
                );
              }

              if (block.kind === "editableSelect") {
                return (
                  <select
                    key={index}
                    value={block.value}
                    onChange={(event) => block.onChange(event.target.value)}
                    className="block w-full appearance-none rounded-md border border-transparent bg-transparent px-0 py-0 text-xs leading-6 text-slate-700 outline-none transition-colors hover:bg-slate-50 focus:border-indigo-100 focus:bg-indigo-50/40 focus:px-2 focus:py-1"
                  >
                    <option value="">-</option>
                    {block.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                );
              }

              if (block.kind === "editableBoolean") {
                return (
                  <select
                    key={index}
                    value={block.value ? "true" : "false"}
                    onChange={(event) => block.onChange(event.target.value === "true")}
                    className="block w-full appearance-none rounded-md border border-transparent bg-transparent px-0 py-0 text-xs leading-6 text-slate-700 outline-none transition-colors hover:bg-slate-50 focus:border-indigo-100 focus:bg-indigo-50/40 focus:px-2 focus:py-1"
                  >
                    <option value="true">כן</option>
                    <option value="false">לא</option>
                  </select>
                );
              }

              if (block.kind === "imageRef") {
                const src = block.preview || block.url;
                if (!src) return null;
                return (
                  <img
                    key={index}
                    src={src}
                    alt="צילום מסך"
                    className="my-2 max-w-full rounded-lg border border-slate-200 shadow-sm"
                  />
                );
              }

              return (
                <p key={index} className="whitespace-pre-wrap text-xs leading-6 text-slate-700">
                  {block.text}
                </p>
              );
            })}
          </article>
        </div>
      </section>

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
