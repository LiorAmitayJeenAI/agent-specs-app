"use client";

import React from "react";
import { GripVertical, X } from "lucide-react";
import { useFormStore } from "@/store/formStore";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import FileUpload from "@/components/shared/FileUpload";
import ImageHelpTooltip from "@/components/shared/ImageHelpTooltip";
import { cn } from "@/lib/utils";
import type { FlowStep, FileAttachment } from "@/types";

interface FlowStepItemProps {
  useCaseId: string;
  step: FlowStep;
  isLast: boolean;
  isDragging?: boolean;
  onDragStart: () => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: () => void;
}

export default function FlowStepItem({
  useCaseId,
  step,
  isLast,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
}: FlowStepItemProps) {
  const { updateFlowStep, removeFlowStep, addFileToStep, updateFileInStep, removeFileFromStep } = useFormStore();

  const update = (patch: Partial<FlowStep>) => updateFlowStep(useCaseId, step.id, patch);

  return (
    <div
      dir="rtl"
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn("flex gap-3 pb-4", isLast && "pb-2", isDragging && "opacity-60")}
    >
      <div className="flex flex-col items-center shrink-0">
        <div className="z-10 mt-40 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEE9FF] text-sm font-bold text-[#5B4FE8] shadow-sm ring-4 ring-white">
          {step.order}
        </div>
        {!isLast && (
          <div className="mt-1 w-px flex-1 bg-[#E0E0E0]" />
        )}
      </div>

      <article
        dir="rtl"
        className="relative min-h-[360px] flex-1 rounded-2xl border border-[#E0E0E0] bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.07)]"
      >
        <button
          type="button"
          onClick={() => removeFlowStep(useCaseId, step.id)}
          aria-label="מחק שלב"
          className="absolute -left-3 -top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-red-100 bg-white text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <X size={14} />
        </button>
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
            <div className="mb-4">
              <Label htmlFor={`step-desc-${step.id}`} className="text-center">
                תיאור השלב
              </Label>
              <Textarea
                id={`step-desc-${step.id}`}
                rows={6}
                placeholder='לדוגמה: "נכנסים ל-SAP ובוחרים את סביבת העבודה הרלוונטית"'
                value={step.description}
                onChange={(e) => update({ description: e.target.value })}
                className="h-[190px] rounded-xl border-[#E0E0E0] bg-white text-[#1A1A2E] placeholder:text-[#AAAACC] placeholder:italic"
              />
            </div>

            <div className="rounded-xl border border-[#E0E0E0] bg-white px-4 py-3">
              <p className="text-center text-sm font-medium text-[#4A4A6A]">יש חישוב בשלב זה?</p>
              <div className="mt-2 flex items-center justify-center gap-6">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[#4A4A6A]">
                  <input
                    type="radio"
                    name={`has-calculation-${step.id}`}
                    checked={step.hasCalculation}
                    onChange={() => update({ hasCalculation: true })}
                    className="h-4 w-4 accent-[#5B4FE8]"
                  />
                  כן
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[#4A4A6A]">
                  <input
                    type="radio"
                    name={`has-calculation-${step.id}`}
                    checked={!step.hasCalculation}
                    onChange={() => update({ hasCalculation: false, calculationDetails: "" })}
                    className="h-4 w-4 accent-[#5B4FE8]"
                  />
                  לא
                </label>
              </div>
            </div>

            <div
              className={cn(
                "grid transition-all duration-300 ease-out",
                step.hasCalculation
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="mt-4">
                  <Label htmlFor={`calc-${step.id}`} className="text-center">
                    פרט את החישוב:
                  </Label>
                  <Textarea
                    id={`calc-${step.id}`}
                    rows={3}
                    placeholder='לדוגמה: "אם היתרה נמוכה מ-10, מסמנים חוסר במלאי"'
                    value={step.calculationDetails}
                    onChange={(e) => update({ calculationDetails: e.target.value })}
                    className="h-[96px] rounded-xl border-[#E0E0E0] bg-white text-[#1A1A2E] placeholder:text-[#AAAACC] placeholder:italic"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
            <Label className="text-center">
              <span className="inline-flex items-center justify-center gap-1.5">
                צילום מסך של השלב
                <ImageHelpTooltip
                  imageSrc="/example_of_step_picture.png"
                  imageAlt="דוגמה לצילום מסך של סביבת עבודה"
                  description="דוגמה לצילום מסך המציג את סביבת העבודה הרלוונטית לשלב זה"
                />
              </span>
            </Label>
            <FileUpload
              files={step.files}
              onAdd={(file: FileAttachment) => addFileToStep(useCaseId, step.id, file)}
              onUpdate={(fileId: string, patch: Partial<FileAttachment>) => updateFileInStep(useCaseId, step.id, fileId, patch)}
              onRemove={(fileId: string) => removeFileFromStep(useCaseId, step.id, fileId)}
              stepId={`usecase-${useCaseId}-step-${step.order}`}
              fieldName="flowStepScreenshot"
              className="mt-1"
            />
          </section>
        </div>
      </article>

      <div className="flex w-10 shrink-0 items-center justify-center">
        <button
          type="button"
          aria-label="Drag to reorder step"
          className="flex h-10 w-10 cursor-grab items-center justify-center rounded-[10px] text-[#AAAACC] transition-colors hover:bg-[#F4F5F7] hover:text-[#5B4FE8] active:cursor-grabbing"
        >
          <GripVertical size={18} />
        </button>
      </div>
    </div>
  );
}
