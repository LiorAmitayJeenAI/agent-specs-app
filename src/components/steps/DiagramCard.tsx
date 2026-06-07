"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Download,
  GitBranch,
  Image as ImageIcon,
  Loader2,
  Network,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DiagramEditorModal from "@/components/steps/DiagramEditorModal";
import { exportDiagramImage } from "@/lib/diagram/exportPdfClient";
import type { DiagramMeta, DiagramType, ProjectDiagramsResponse } from "@/types/diagram";

interface DiagramCardProps {
  projectId: string | null;
  isAdminView: boolean;
  hasUseCases: boolean;
  projectStatus: "sent_to_client" | "client_draft" | "pm_review" | "completed";
  wordDiagramInclusion?: Record<DiagramType, boolean>;
  onWordDiagramInclusionChange?: (type: DiagramType, included: boolean) => void;
}

function cacheBustedUrl(url: string, version: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(version)}`;
}

function imageFileName(fileName: string): string {
  return fileName.replace(/\.drawio$/i, "") + ".png";
}

function DiagramPreview({
  meta,
  title,
  type,
  projectId,
  isAdminView,
  includeInWord,
  onIncludeInWordChange,
  onSaved,
}: {
  meta: DiagramMeta;
  title: string;
  type: DiagramType;
  projectId: string;
  isAdminView: boolean;
  includeInWord: boolean;
  onIncludeInWordChange?: (type: DiagramType, included: boolean) => void;
  onSaved: (type: DiagramType, diagram: DiagramMeta) => void;
}) {
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [xml, setXml] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [exportingImage, setExportingImage] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setViewerError(false);
    setViewerUrl(null);
    setXml(null);
    setActionError(null);

    fetch(cacheBustedUrl(meta.proxyUrl, meta.generatedAt))
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.text();
      })
      .then((xml) => {
        if (cancelled) return;
        const encoded = encodeURIComponent(xml);
        setXml(xml);
        setViewerUrl(
          `https://viewer.diagrams.net/?highlight=0000ff&nav=1&title=${encodeURIComponent(title)}#R${encoded}`
        );
      })
      .catch(() => {
        if (!cancelled) setViewerError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [meta.generatedAt, meta.proxyUrl, title]);

  const handleDownload = async () => {
    const res = await fetch(cacheBustedUrl(meta.proxyUrl, meta.generatedAt));
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = meta.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImageDownload = async () => {
    if (!xml) return;

    setExportingImage(true);
    setActionError(null);
    try {
      await exportDiagramImage({ xml, fileName: imageFileName(meta.fileName) });
    } catch (error) {
      const detail = error instanceof Error ? ` (${error.message})` : "";
      setActionError(`לא הצלחנו ליצור תמונה מהתרשים. נסה שוב.${detail}`);
    } finally {
      setExportingImage(false);
    }
  };

  const handleSaved = (diagram: DiagramMeta) => {
    onSaved(type, diagram);
  };

  return (
    <div className="space-y-2">
      {meta.isStale && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          המסמך עודכן מאז יצירת התרשים
        </div>
      )}
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white min-h-[280px]">
        {viewerUrl && !viewerError ? (
          <iframe
            title={title}
            src={viewerUrl}
            className="w-full h-[360px] border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : viewerError ? (
          <p className="p-4 text-sm text-slate-500 text-center">
            לא ניתן להציג תצוגה מקדימה. ניתן להוריד את הקובץ.
          </p>
        ) : (
          <div className="flex h-[360px] items-center justify-center">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
          </div>
        )}
      </div>
      {actionError && (
        <p className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle size={14} />
          {actionError}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          {isAdminView && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={!xml}
              onClick={() => setEditorOpen(true)}
            >
              <Pencil size={14} />
              ערוך
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleDownload}>
            <Download size={14} />
            הורד .drawio
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={!xml || exportingImage}
            onClick={handleImageDownload}
          >
            {exportingImage ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ImageIcon size={14} />
            )}
            הורד כתמונה
          </Button>
        </div>
        {onIncludeInWordChange && (
          <label className="mr-auto flex w-fit items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={includeInWord}
              onChange={(event) => onIncludeInWordChange(type, event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
            />
            כלול בקובץ Word
          </label>
        )}
      </div>
      {xml && (
        <DiagramEditorModal
          open={editorOpen}
          projectId={projectId}
          type={type}
          title={title}
          xml={xml}
          onClose={() => setEditorOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

export default function DiagramCard({
  projectId,
  isAdminView,
  hasUseCases,
  projectStatus,
  wordDiagramInclusion,
  onWordDiagramInclusionChange,
}: DiagramCardProps) {
  const [diagrams, setDiagrams] = useState<ProjectDiagramsResponse | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [generating, setGenerating] = useState<DiagramType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagramCapable, setDiagramCapable] = useState(false);

  const loadDiagrams = useCallback(async () => {
    if (!projectId) return;
    setLoadingMeta(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/diagrams`);
      if (res.ok) {
        setDiagrams(await res.json());
      }
    } finally {
      setLoadingMeta(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetch("/api/llm/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { diagramCapable?: boolean } | null) => {
        setDiagramCapable(Boolean(data?.diagramCapable));
      })
      .catch(() => setDiagramCapable(false));
  }, []);

  useEffect(() => {
    void loadDiagrams();
  }, [loadDiagrams]);

  const handleGenerate = async (type: DiagramType) => {
    if (!projectId) return;
    setGenerating(type);
    setError(null);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/generate-diagram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          ...(isAdminView && projectStatus === "completed"
            ? { syncStatus: "completed" as const }
            : {}),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        diagram?: DiagramMeta;
      } | null;

      if (!res.ok) {
        setError(data?.error ?? "לא הצלחנו ליצור את התרשים. נסה שוב.");
        return;
      }

      if (data?.diagram) {
        setDiagrams((prev) => ({
          flow: type === "flow" ? data.diagram! : prev?.flow ?? null,
          architecture: type === "architecture" ? data.diagram! : prev?.architecture ?? null,
        }));
      }
      await loadDiagrams();
    } catch {
      setError("לא הצלחנו ליצור את התרשים. בדוק את החיבור ונסה שוב.");
    } finally {
      setGenerating(null);
    }
  };

  const handleDiagramSaved = (type: DiagramType, diagram: DiagramMeta) => {
    setDiagrams((prev) => ({
      flow: type === "flow" ? diagram : prev?.flow ?? null,
      architecture: type === "architecture" ? diagram : prev?.architecture ?? null,
    }));
    void loadDiagrams();
  };

  const flowDisabled = !diagramCapable || !hasUseCases;
  const archDisabled = !diagramCapable;

  return (
    <Card>
      <CardHeader>
        <CardTitle>תרשימים</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdminView && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={flowDisabled || generating !== null}
              title={
                !diagramCapable
                  ? "שירות AI לא מוגדר"
                  : !hasUseCases
                    ? "יש להוסיף לפחות תרחיש שימוש אחד"
                    : undefined
              }
              onClick={() => handleGenerate("flow")}
            >
              {generating === "flow" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <GitBranch size={14} />
              )}
              {diagrams?.flow ? "צור מחדש — תרשים תהליך" : "צור תרשים תהליך"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={archDisabled || generating !== null}
              title={!diagramCapable ? "שירות AI לא מוגדר" : undefined}
              onClick={() => handleGenerate("architecture")}
            >
              {generating === "architecture" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Network size={14} />
              )}
              {diagrams?.architecture
                ? "צור מחדש — תרשים ארכיטקטורה"
                : "צור תרשים ארכיטקטורה"}
            </Button>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1.5">
            <AlertCircle size={14} />
            {error}
          </p>
        )}

        {loadingMeta && !diagrams && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            טוען תרשימים...
          </div>
        )}

        {!isAdminView && !diagrams?.flow && !diagrams?.architecture && !loadingMeta && (
          <p className="text-sm text-slate-500">
            תרשים יופיע לאחר שמנהל הפרויקט ייצור אותו
          </p>
        )}

        {diagrams?.flow && (
          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">תרשים תהליך</p>
            {projectId && (
              <DiagramPreview
                meta={diagrams.flow}
                title="תרשים תהליך"
                type="flow"
                projectId={projectId}
                isAdminView={isAdminView}
                includeInWord={wordDiagramInclusion?.flow ?? true}
                onIncludeInWordChange={onWordDiagramInclusionChange}
                onSaved={handleDiagramSaved}
              />
            )}
          </div>
        )}

        {diagrams?.architecture && (
          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">תרשים ארכיטקטורה</p>
            {projectId && (
              <DiagramPreview
                meta={diagrams.architecture}
                title="תרשים ארכיטקטורה"
                type="architecture"
                projectId={projectId}
                isAdminView={isAdminView}
                includeInWord={wordDiagramInclusion?.architecture ?? true}
                onIncludeInWordChange={onWordDiagramInclusionChange}
                onSaved={handleDiagramSaved}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
