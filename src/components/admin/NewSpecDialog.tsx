"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  Building2,
  UserRound,
  FolderOpen,
  Loader2,
  Copy,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CUSTOMER_OPTIONS = [
  "מכבי שירותי בריאות",
  "חברת חשמל לישראל",
  "ישראכרט",
  "ביטוח ישיר",
];

interface NewSpecDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function NewSpecDialog({ open, onClose, onCreated }: NewSpecDialogProps) {
  const [clientName, setClientName] = useState("");
  const [projectManagerName, setProjectManagerName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const canCreate = CUSTOMER_OPTIONS.includes(clientName);

  useEffect(() => {
    if (!open) {
      setClientName("");
      setProjectManagerName("");
      setProjectName("");
      setCreating(false);
      setError("");
      setGeneratedLink("");
      setCopied(false);
    }
  }, [open]);

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName, projectManagerName, projectName }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "שגיאה ביצירת הפרויקט");
      }

      const { projectId } = await res.json();
      const link = `${window.location.origin}/client?projectId=${projectId}`;
      setGeneratedLink(link);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה ביצירת הפרויקט");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = generatedLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg animate-fade-in rounded-2xl border border-[#EEEEEE] bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F0EFF5] px-6 py-4">
          <h2 className="text-lg font-bold text-[#1A1A2E]">אפיון חדש</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {!generatedLink ? (
            <>
              <div>
                <Label htmlFor="new-spec-client" className="inline-flex items-center" required>
                  <span className="flex items-center gap-1.5">
                    <Building2 size={14} className="text-indigo-500" />
                    שם הלקוח
                  </span>
                </Label>
                <select
                  id="new-spec-client"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="flex w-full rounded-lg border border-[#E0E0E0] bg-white px-3.5 py-2.5 text-sm text-[#1A1A2E] shadow-sm transition duration-150 focus:outline-none focus:border-[#5B4FE8] focus:shadow-[0_0_0_3px_rgba(91,79,232,0.1)]"
                  autoFocus
                >
                  <option value="">בחר לקוח...</option>
                  {CUSTOMER_OPTIONS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="new-spec-pm">
                  <span className="flex items-center gap-1.5">
                    <UserRound size={14} className="text-indigo-500" />
                    שם מנהל פרויקט
                  </span>
                </Label>
                <Input
                  id="new-spec-pm"
                  value={projectManagerName}
                  onChange={(e) => setProjectManagerName(e.target.value)}
                  placeholder='לדוגמה: "דנה כהן"'
                />
              </div>

              <div>
                <Label htmlFor="new-spec-project" className="inline-flex items-center">
                  <span className="flex items-center gap-1.5">
                    <FolderOpen size={14} className="text-indigo-500" />
                    שם הפרויקט
                  </span>
                </Label>
                <Input
                  id="new-spec-project"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder='אופציונלי, לדוגמה: "סוכן שירות לקוחות"'
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 font-medium">{error}</p>
              )}
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                <CheckCircle size={28} />
              </div>
              <div>
                <p className="text-base font-bold text-[#1A1A2E]">הפרויקט נוצר בהצלחה</p>
                <p className="mt-1 text-sm text-[#6B6B8A]">
                  העתק את הקישור ושלח אותו ללקוח
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[#E0E0E0] bg-[#FAFAFD] px-3 py-2.5">
                <input
                  readOnly
                  value={generatedLink}
                  className="flex-1 bg-transparent text-sm text-[#4B4B68] outline-none text-left"
                  dir="ltr"
                />
                <Button
                  size="sm"
                  onClick={handleCopy}
                  className="gap-1.5 shrink-0"
                  variant={copied ? "outline" : "primary"}
                >
                  {copied ? (
                    <>
                      <CheckCircle size={14} />
                      הועתק
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      העתק קישור
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#F0EFF5] px-6 py-4 flex items-center justify-end gap-3">
          {!generatedLink ? (
            <>
              <Button variant="outline" onClick={onClose} disabled={creating}>
                ביטול
              </Button>
              <Button onClick={handleCreate} disabled={!canCreate || creating} className="gap-2">
                {creating && <Loader2 size={15} className="animate-spin" />}
                {creating ? "יוצר..." : "צור מסמך אפיון"}
              </Button>
            </>
          ) : (
            <Button onClick={onClose}>סגור</Button>
          )}
        </div>
      </div>
    </div>
  );
}
