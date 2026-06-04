import type { WordExportBlock, WordExportValue } from "./wordExport";
import type {
  AgentDetails,
  Concept,
  DataSource,
  FileAttachment,
  ProjectIntake,
  SuccessMetric,
  UseCase,
} from "@/types";

export type DocumentValue = WordExportValue;

export const formatDocumentValue = (value: WordExportValue) => {
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "-";
  if (typeof value === "boolean") return value ? "כן" : "לא";
  if (typeof value === "number") return String(value);
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "-";
};

export type DocumentBlock =
  | { kind: "title"; text: string }
  | { kind: "meta"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "subheading"; text: string }
  | { kind: "label"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "editableText"; value: string; onChange?: (value: string) => void; multiline?: boolean }
  | { kind: "editableList"; value: string[]; onChange?: (value: string[]) => void }
  | { kind: "editableSelect"; value: string; options: string[]; onChange?: (value: string) => void }
  | { kind: "editableBoolean"; value: boolean; onChange?: (value: boolean) => void }
  | { kind: "empty"; text: string }
  | { kind: "space" }
  | { kind: "imageRef"; url?: string; preview?: string };

export interface PrdDocumentSource {
  projectIntake: ProjectIntake;
  agentDetails: AgentDetails;
  useCases: UseCase[];
  dataSources: DataSource[];
  concepts: Concept[];
  successMetrics: SuccessMetric[];
}

export interface PrdDocumentUpdaters {
  updateProjectIntake?: (patch: Partial<ProjectIntake>) => void;
  updateAgentDetails?: (patch: Partial<AgentDetails>) => void;
  updateUseCase?: (id: string, patch: Partial<UseCase>) => void;
  updateQAPair?: (
    useCaseId: string,
    qaId: string,
    patch: Partial<{ question: string; expectedAnswer: string; dataSourceRef: string }>
  ) => void;
  updateFlowStep?: (
    useCaseId: string,
    stepId: string,
    patch: Partial<UseCase["flowSteps"][number]>
  ) => void;
  updateDataSource?: (id: string, patch: Partial<DataSource>) => void;
  updateConcept?: (id: string, patch: Partial<Concept>) => void;
  updateSuccessMetric?: (id: string, patch: Partial<SuccessMetric>) => void;
}

export interface BuildPrdDocumentOptions {
  editable?: boolean;
  dateText?: string;
  updaters?: PrdDocumentUpdaters;
  readOnlyFields?: {
    clientName?: boolean;
  };
}

export const CUSTOMER_OPTIONS = [
  "מכבי שירותי בריאות",
  "חברת חשמל לישראל",
  "ישראכרט",
  "ביטוח ישיר",
];

export const SOURCE_TYPES = [
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

const readOnlyBlocks = (label: string, value: DocumentValue): DocumentBlock[] => [
  { kind: "label", text: label },
  { kind: "paragraph", text: formatDocumentValue(value) },
];

const textBlocks = (
  label: string,
  value: string,
  editable: boolean,
  onChange?: (value: string) => void,
  multiline = true
): DocumentBlock[] => [
  { kind: "label", text: label },
  editable && onChange
    ? { kind: "editableText", value, onChange, multiline }
    : { kind: "paragraph", text: formatDocumentValue(value) },
];

const listBlocks = (
  label: string,
  value: string[],
  editable: boolean,
  onChange?: (value: string[]) => void
): DocumentBlock[] => [
  { kind: "label", text: label },
  editable && onChange
    ? { kind: "editableList", value, onChange }
    : { kind: "paragraph", text: formatDocumentValue(value) },
];

const selectBlocks = (
  label: string,
  value: string,
  options: string[],
  editable: boolean,
  onChange?: (value: string) => void
): DocumentBlock[] => [
  { kind: "label", text: label },
  editable && onChange
    ? { kind: "editableSelect", value, options, onChange }
    : { kind: "paragraph", text: formatDocumentValue(value) },
];

const booleanBlocks = (
  label: string,
  value: boolean,
  editable: boolean,
  onChange?: (value: boolean) => void
): DocumentBlock[] => [
  { kind: "label", text: label },
  editable && onChange
    ? { kind: "editableBoolean", value, onChange }
    : { kind: "paragraph", text: formatDocumentValue(value) },
];

const emptyBlocks = (text: string): DocumentBlock[] => [{ kind: "empty", text }];

const fileAttachmentBlocks = (files: FileAttachment[]): DocumentBlock[] => {
  const uploaded = files.filter((f) => f.uploadStatus === "uploaded");
  const imageBlocks = uploaded
    .filter((f) => f.kind === "image")
    .map((f): DocumentBlock => ({ kind: "imageRef", url: f.url, preview: f.preview }));
  const fileBlocks = uploaded
    .filter((f) => f.kind !== "image")
    .map((f): DocumentBlock => ({ kind: "paragraph", text: `📎 ${f.name}` }));

  return [
    ...(imageBlocks.length > 0 ? [{ kind: "label" as const, text: "צילומי מסך" }, ...imageBlocks] : []),
    ...(fileBlocks.length > 0 ? [{ kind: "label" as const, text: "קבצים מצורפים" }, ...fileBlocks] : []),
  ];
};

export function buildPrdDocumentBlocks(
  source: PrdDocumentSource,
  options: BuildPrdDocumentOptions = {}
): DocumentBlock[] {
  const editable = Boolean(options.editable);
  const updaters = options.updaters ?? {};
  const readOnlyFields = options.readOnlyFields ?? {};
  const dateText = options.dateText ?? new Date().toLocaleDateString("he-IL");

  return [
    { kind: "title", text: "מסמך אפיון סוכן AI" },
    { kind: "meta", text: `תאריך יצירה: ${dateText}` },
    { kind: "space" },
    { kind: "heading", text: "שם הלקוח" },
    ...(editable && updaters.updateProjectIntake && !readOnlyFields.clientName
      ? [
          {
            kind: "editableSelect" as const,
            value: source.projectIntake.clientName,
            options: CUSTOMER_OPTIONS,
            onChange: (clientName: string) => updaters.updateProjectIntake?.({ clientName }),
          },
        ]
      : [{ kind: "paragraph" as const, text: formatDocumentValue(source.projectIntake.clientName) }]),
    { kind: "space" },
    { kind: "heading", text: "עורך המסמך" },
    ...(editable && updaters.updateProjectIntake
      ? [
          {
            kind: "editableText" as const,
            value: source.projectIntake.documentAuthorName,
            onChange: (documentAuthorName: string) =>
              updaters.updateProjectIntake?.({ documentAuthorName }),
            multiline: false,
          },
        ]
      : [{ kind: "paragraph" as const, text: formatDocumentValue(source.projectIntake.documentAuthorName) }]),
    { kind: "space" },
    { kind: "heading", text: "שם הסוכן" },
    ...(editable && updaters.updateAgentDetails
      ? [
          {
            kind: "editableText" as const,
            value: source.agentDetails.requestedAgentName,
            onChange: (requestedAgentName: string) =>
              updaters.updateAgentDetails?.({ requestedAgentName }),
            multiline: false,
          },
        ]
      : [{ kind: "paragraph" as const, text: formatDocumentValue(source.agentDetails.requestedAgentName) }]),
    { kind: "space" },
    { kind: "heading", text: "תיאור כללי" },
    ...textBlocks(
      "תיאור כללי",
      source.agentDetails.shortAgentDescription,
      editable,
      (shortAgentDescription) => updaters.updateAgentDetails?.({ shortAgentDescription })
    ),
    { kind: "space" },
    { kind: "heading", text: "תרחישי שימוש" },
    ...(source.useCases.length > 0
      ? source.useCases.flatMap((uc, ucIndex): DocumentBlock[] => [
          {
            kind: "subheading",
            text: `תרחיש ${ucIndex + 1}: ${uc.useCaseName || uc.qaPairs?.[0]?.question || "תרחיש ללא שם"}`,
          },
          ...textBlocks("שם תרחיש השימוש", uc.useCaseName, editable, (useCaseName) =>
            updaters.updateUseCase?.(uc.id, { useCaseName })
          ),
          ...textBlocks("תיאור התרחיש", uc.title, editable, (title) =>
            updaters.updateUseCase?.(uc.id, { title })
          ),
          { kind: "subheading", text: "התהליך הקיים כיום" },
          ...textBlocks("מבצע התהליך כיום", uc.performer, editable, (performer) =>
            updaters.updateUseCase?.(uc.id, { performer })
          ),
          ...listBlocks("מערכות מעורבות", uc.systemsInvolved, editable, (systemsInvolved) =>
            updaters.updateUseCase?.(uc.id, { systemsInvolved })
          ),
          ...textBlocks("הערות נוספות", uc.additionalNotes, editable, (additionalNotes) =>
            updaters.updateUseCase?.(uc.id, { additionalNotes })
          ),
          { kind: "subheading", text: "דוגמאות לשאלות אפשריות, תשובות ומקורות מידע" },
          ...(uc.qaPairs ?? []).flatMap((pair, pairIndex): DocumentBlock[] => [
            ...textBlocks(`שאלה ${pairIndex + 1}`, pair.question, editable, (question) =>
              updaters.updateQAPair?.(uc.id, pair.id, { question })
            ),
            ...textBlocks(`תשובה ${pairIndex + 1}`, pair.expectedAnswer, editable, (expectedAnswer) =>
              updaters.updateQAPair?.(uc.id, pair.id, { expectedAnswer })
            ),
            ...textBlocks(`מקור מידע ${pairIndex + 1}`, pair.dataSourceRef, editable, (dataSourceRef) =>
              updaters.updateQAPair?.(uc.id, pair.id, { dataSourceRef })
            ),
          ]),
          { kind: "subheading", text: "פירוט התהליך הקיים (Flow)" },
          ...(uc.flowSteps.length > 0
            ? uc.flowSteps.flatMap((step): DocumentBlock[] => [
                ...textBlocks(`שלב ${step.order}`, step.description, editable, (description) =>
                  updaters.updateFlowStep?.(uc.id, step.id, { description })
                ),
                ...booleanBlocks("יש חישוב בשלב זה?", step.hasCalculation, editable, (hasCalculation) =>
                  updaters.updateFlowStep?.(uc.id, step.id, {
                    hasCalculation,
                    calculationDetails: hasCalculation ? step.calculationDetails : "",
                  })
                ),
                ...(step.hasCalculation
                  ? textBlocks("פירוט החישוב", step.calculationDetails, editable, (calculationDetails) =>
                      updaters.updateFlowStep?.(uc.id, step.id, { calculationDetails })
                    )
                  : []),
                ...fileAttachmentBlocks(step.files),
              ])
            : emptyBlocks("לא הוזנו שלבי תהליך.")),
          { kind: "space" },
        ])
      : emptyBlocks("לא הוזנו תרחישי שימוש.")),
    { kind: "space" },
    { kind: "heading", text: "מקורות מידע" },
    ...(source.dataSources.length > 0
      ? source.dataSources.flatMap((dataSource, index): DocumentBlock[] => [
          { kind: "subheading", text: `מקור מידע ${index + 1}: ${dataSource.name || "מקור ללא שם"}` },
          ...textBlocks("שם מקור הנתונים", dataSource.name, editable, (name) =>
            updaters.updateDataSource?.(dataSource.id, { name })
          ),
          ...selectBlocks("סוג מקור", dataSource.type, SOURCE_TYPES, editable, (type) =>
            updaters.updateDataSource?.(dataSource.id, { type })
          ),
          ...textBlocks("תיאור", dataSource.description, editable, (description) =>
            updaters.updateDataSource?.(dataSource.id, { description })
          ),
          ...textBlocks("אופן גישה", dataSource.accessMethod, editable, (accessMethod) =>
            updaters.updateDataSource?.(dataSource.id, { accessMethod })
          ),
          ...fileAttachmentBlocks(dataSource.files),
          { kind: "space" },
        ])
      : emptyBlocks("לא הוזנו מקורות מידע.")),
    { kind: "space" },
    { kind: "heading", text: "מושגים והגדרות" },
    ...(source.concepts.length > 0
      ? source.concepts.flatMap((concept, index): DocumentBlock[] => [
          { kind: "subheading", text: `מושג ${index + 1}: ${concept.term || "מושג ללא שם"}` },
          ...textBlocks("המונח", concept.term, editable, (term) =>
            updaters.updateConcept?.(concept.id, { term })
          ),
          ...textBlocks("הגדרה", concept.definition, editable, (definition) =>
            updaters.updateConcept?.(concept.id, { definition })
          ),
          ...textBlocks("דוגמאות", concept.examples, editable, (examples) =>
            updaters.updateConcept?.(concept.id, { examples })
          ),
          { kind: "space" },
        ])
      : emptyBlocks("לא הוזנו מושגים והגדרות.")),
    { kind: "space" },
    { kind: "heading", text: "מדדי הצלחה" },
    ...(source.successMetrics.length > 0
      ? source.successMetrics.flatMap((metric, index): DocumentBlock[] => [
          { kind: "subheading", text: `מדד ${index + 1}: ${metric.metric || "מדד ללא שם"}` },
          ...textBlocks("שם המדד", metric.metric, editable, (metricName) =>
            updaters.updateSuccessMetric?.(metric.id, { metric: metricName })
          ),
          ...textBlocks("יעד", metric.target, editable, (target) =>
            updaters.updateSuccessMetric?.(metric.id, { target })
          ),
          ...textBlocks("שיטת מדידה", metric.measurementMethod, editable, (measurementMethod) =>
            updaters.updateSuccessMetric?.(metric.id, { measurementMethod })
          ),
          { kind: "space" },
        ])
      : emptyBlocks("לא הוזנו מדדי הצלחה.")),
  ];
}

export async function resolveDocumentBlocksForExport(blocks: DocumentBlock[]): Promise<WordExportBlock[]> {
  const { resolveImageBlock } = await import("@/lib/wordExport");
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
