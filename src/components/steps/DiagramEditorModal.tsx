"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DiagramMeta, DiagramType, SaveDiagramResponse } from "@/types/diagram";

const EDITOR_URL = "https://embed.diagrams.net/?embed=1&proto=json&saveAndExit=1";
const TRUSTED_DRAWIO_ORIGINS = new Set([
  "https://embed.diagrams.net",
  "https://app.diagrams.net",
  "https://viewer.diagrams.net",
]);

type DrawioMessage =
  | { event: "init" }
  | { event: "save"; xml?: string; exit?: boolean }
  | { event: "exit"; modified?: boolean }
  | { event: string; [key: string]: unknown };

interface DiagramEditorModalProps {
  open: boolean;
  projectId: string;
  type: DiagramType;
  title: string;
  xml: string;
  onClose: () => void;
  onSaved: (diagram: DiagramMeta) => void;
}

function parseDrawioMessage(data: unknown): DrawioMessage | null {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as DrawioMessage;
    } catch {
      return null;
    }
  }

  if (typeof data === "object" && data !== null && "event" in data) {
    return data as DrawioMessage;
  }

  return null;
}

export default function DiagramEditorModal({
  open,
  projectId,
  type,
  title,
  xml,
  onClose,
  onSaved,
}: DiagramEditorModalProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingEditor, setLoadingEditor] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSaving(false);
    setLoadingEditor(true);
    setError(null);
  }, [open]);

  const sendLoadMessage = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({
        action: "load",
        autosave: 0,
        modified: false,
        saveAndExit: 1,
        title,
        xml,
      }),
      "https://embed.diagrams.net"
    );
  }, [title, xml]);

  const saveXml = useCallback(
    async (updatedXml: string, shouldClose: boolean) => {
      setSaving(true);
      setError(null);

      try {
        const res = await fetch(`/api/admin/projects/${projectId}/diagrams`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, xml: updatedXml }),
        });
        const data = (await res.json().catch(() => null)) as
          | (Partial<SaveDiagramResponse> & { error?: string })
          | null;

        if (!res.ok || !data?.diagram) {
          setError(data?.error ?? "לא הצלחנו לשמור את התרשים");
          return;
        }

        onSaved(data.diagram);
        if (shouldClose) onClose();
      } catch {
        setError("לא הצלחנו לשמור את התרשים. בדוק את החיבור ונסה שוב.");
      } finally {
        setSaving(false);
      }
    },
    [onClose, onSaved, projectId, type]
  );

  useEffect(() => {
    if (!open) return;

    const handleMessage = (event: MessageEvent) => {
      if (!TRUSTED_DRAWIO_ORIGINS.has(event.origin)) return;

      const message = parseDrawioMessage(event.data);
      if (!message) return;

      if (message.event === "init") {
        setLoadingEditor(false);
        sendLoadMessage();
        return;
      }

      if (message.event === "save") {
        if (typeof message.xml !== "string" || !message.xml.trim()) {
          setError("לא התקבל תוכן תרשים לשמירה");
          return;
        }
        void saveXml(message.xml, Boolean(message.exit));
        return;
      }

      if (message.event === "exit" && !saving) {
        onClose();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onClose, open, saveXml, saving, sendLoadMessage]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 p-4">
      <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">עריכת {title}</h3>
            <p className="text-xs text-slate-500">השמירה תעדכן את התרשים במסמך</p>
          </div>
          <div className="flex items-center gap-2">
            {saving && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Loader2 size={14} className="animate-spin" />
                שומר...
              </span>
            )}
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              <X size={14} />
              סגור
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="relative min-h-0 flex-1">
          {loadingEditor && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
              <Loader2 size={28} className="animate-spin text-indigo-500" />
            </div>
          )}
          <iframe
            ref={iframeRef}
            title={`עריכת ${title}`}
            src={EDITOR_URL}
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups"
          />
        </div>
      </div>
    </div>
  );
}
