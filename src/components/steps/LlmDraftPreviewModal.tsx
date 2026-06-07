"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import PrdDocumentPreview from "@/components/steps/PrdDocumentPreview";
import type { DocumentBlock } from "@/lib/prdDocument";

interface LlmDraftPreviewModalProps {
  open: boolean;
  initialVersion: "original" | "ai";
  originalBlocks: DocumentBlock[];
  aiBlocks: DocumentBlock[];
  onUseOriginal: () => void;
  onUseAi: () => void;
  onClose: () => void;
}

export default function LlmDraftPreviewModal({
  open,
  initialVersion,
  originalBlocks,
  aiBlocks,
  onUseOriginal,
  onUseAi,
  onClose,
}: LlmDraftPreviewModalProps) {
  const [version, setVersion] = useState<"original" | "ai">(initialVersion);

  useEffect(() => {
    if (!open) return;
    setVersion(initialVersion);
  }, [open, initialVersion]);

  if (!open) return null;

  const isAi = version === "ai";
  const blocks = isAi ? aiBlocks : originalBlocks;
  const title = isAi ? "המסמך אחרי AI" : "המסמך המקורי";
  const actionLabel = isAi ? "השתמש בגרסת ה-AI" : "השתמש בגרסה המקורית";
  const useCurrent = isAi ? onUseAi : onUseOriginal;
  const tabs = [
    { key: "original" as const, label: "המסמך המקורי" },
    { key: "ai" as const, label: "המסמך אחרי AI" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="llm-draft-preview-title"
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
                <Sparkles size={14} />
              </div>
              <h2 id="llm-draft-preview-title" className="text-base font-bold text-slate-900">
                השוואת גרסאות
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              אפשר לעבור בין הגרסאות ולבחור את המסמך שבו תרצה להשתמש.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="סגור"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-slate-100 bg-white px-5 py-3">
          <div className="inline-flex rounded-2xl bg-slate-100 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setVersion(tab.key)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  version === tab.key
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#F7F7FB] px-4 py-4">
          <div key={version} className="animate-slide-in">
            <PrdDocumentPreview blocks={blocks} interactive={false} className="mx-auto max-w-3xl" />
          </div>
        </div>

        <div className="border-t border-slate-100 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
          {title}
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button type="button" onClick={useCurrent}>
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
