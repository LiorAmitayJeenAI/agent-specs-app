"use client";

import React, { useRef } from "react";
import { Upload, X, Image as ImageIcon, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { v4 as uuid } from "uuid";
import { cn, readFileAsDataURL } from "@/lib/utils";
import type { FileAttachment, FileKind } from "@/types";

interface FileUploadProps {
  files: FileAttachment[];
  onAdd: (file: FileAttachment) => void;
  onUpdate: (fileId: string, patch: Partial<FileAttachment>) => void;
  onRemove: (fileId: string) => void;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
  stepId?: string;
  fieldName?: string;
  projectId?: string;
}

async function uploadToServer(
  file: File,
  meta: { stepId?: string; fieldName?: string; projectId?: string }
): Promise<{
  fileId: string;
  blobPath: string;
  blobUrl: string;
  originalFileName: string;
  mimeType: string;
  size: number;
}> {
  const formData = new FormData();
  formData.append("file", file);
  if (meta.stepId) formData.append("stepId", meta.stepId);
  if (meta.fieldName) formData.append("fieldName", meta.fieldName);
  if (meta.projectId) formData.append("projectId", meta.projectId);

  const res = await fetch("/api/file-upload", { method: "POST", body: formData });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || "Upload failed");
  }

  return res.json();
}

export default function FileUpload({
  files,
  onAdd,
  onUpdate,
  onRemove,
  accept = "image/*,.pdf,.doc,.docx,.xlsx,.xls,.csv,.txt",
  maxSizeMB = 10,
  className,
  stepId,
  fieldName,
  projectId,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const processFile = async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`הקובץ גדול מדי. גודל מקסימלי: ${maxSizeMB}MB`);
      return;
    }
    setError(null);

    const isImage = file.type.startsWith("image/");
    const kind: FileKind = isImage
      ? "image"
      : file.type === "application/pdf" ||
          file.name.match(/\.(doc|docx|xls|xlsx|csv|txt)$/i)
        ? "document"
        : "other";

    const preview = isImage ? await readFileAsDataURL(file) : undefined;
    const fileId = uuid();

    const attachment: FileAttachment = {
      id: fileId,
      name: file.name,
      url: URL.createObjectURL(file),
      kind,
      size: file.size,
      preview,
      uploadStatus: "uploading",
      mimeType: file.type,
    };
    onAdd(attachment);

    try {
      const result = await uploadToServer(file, { stepId, fieldName, projectId });
      onUpdate(fileId, {
        uploadStatus: "uploaded",
        blobPath: result.blobPath,
        blobUrl: result.blobUrl,
        fileId: result.fileId,
        url: `/api/file-proxy?path=${encodeURIComponent(result.blobPath)}`,
      });
    } catch (err) {
      onUpdate(fileId, { uploadStatus: "failed" });
      setError(err instanceof Error ? err.message : "שגיאה בהעלאת הקובץ");
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files ?? []);
    for (const f of fileList) await processFile(f);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const fileList = Array.from(e.dataTransfer.files);
    for (const f of fileList) await processFile(f);
  };

  const previewFile = files.find((file) => file.kind === "image" && file.preview);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="rounded-2xl border border-[#E0E0E0] bg-[#F8F8FB] p-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        {previewFile?.preview ? (
          <div className="relative h-[190px] w-full overflow-hidden rounded-xl border border-[#E0E0E0] bg-white">
            <img
              src={previewFile.preview}
              alt={previewFile.name}
              className="h-full w-full object-cover"
            />
            {previewFile.uploadStatus === "uploading" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                <Loader2 size={24} className="text-white animate-spin" />
              </div>
            )}
            {previewFile.uploadStatus === "uploaded" && (
              <div className="absolute top-2 right-2 rounded-full bg-emerald-500 p-1">
                <CheckCircle size={12} className="text-white" />
              </div>
            )}
            {previewFile.uploadStatus === "failed" && (
              <div className="absolute top-2 right-2 rounded-full bg-red-500 p-1">
                <AlertCircle size={12} className="text-white" />
              </div>
            )}
            <button
              type="button"
              onClick={() => onRemove(previewFile.id)}
              className="absolute left-2 top-2 rounded-lg bg-white/90 p-1 text-red-500 shadow-sm hover:bg-red-50"
              aria-label="הסר צילום מסך"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex h-[190px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-[#AAAACC] bg-white text-center">
            <ImageIcon size={24} className="text-[#AAAACC]" />
            <p className="mt-2 text-sm font-medium text-[#4A4A6A]">לא הועלה צילום מסך עדיין</p>
            <p className="mt-1 text-xs text-[#AAAACC]">העלה תמונה שממחישה את השלב</p>
          </div>
        )}
      </div>

      <button
        type="button"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-[10px] border px-4 py-2.5 text-sm font-medium transition-colors",
          isDragging
            ? "border-[#C4B8FF] bg-[#EEE9FF] text-[#5B4FE8]"
            : "border-[#C4B8FF] bg-white text-[#5B4FE8] hover:bg-[#EEE9FF]"
        )}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={16} />
        העלה צילום מסך
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <X size={12} /> {error}
        </p>
      )}

      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-2 text-xs">
              {f.uploadStatus === "uploading" && (
                <Loader2 size={12} className="text-indigo-500 animate-spin" />
              )}
              {f.uploadStatus === "uploaded" && (
                <CheckCircle size={12} className="text-emerald-500" />
              )}
              {f.uploadStatus === "failed" && (
                <AlertCircle size={12} className="text-red-500" />
              )}
              <span className="text-slate-600 truncate">{f.name}</span>
            </div>
          ))}
          <p className="text-xs text-[#AAAACC] mt-1">
            {files.length} קבצים · עד {maxSizeMB}MB לקובץ
          </p>
        </div>
      )}
    </div>
  );
}
