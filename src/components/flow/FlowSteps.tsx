"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useFormStore } from "@/store/formStore";
import { Button } from "@/components/ui/button";
import FlowStepItem from "./FlowStepItem";

interface FlowStepsProps {
  useCaseId: string;
}

export default function FlowSteps({ useCaseId }: FlowStepsProps) {
  const { useCases, addFlowStep, reorderFlowSteps } = useFormStore();
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const useCase = useCases.find((uc) => uc.id === useCaseId);
  const steps = useCase?.flowSteps ?? [];
  const isMissingRequiredFlow =
    steps.length === 0 || steps.some((step) => !step.description.trim());

  const handleDrop = (targetIndex: number) => {
    if (draggingIndex === null || draggingIndex === targetIndex) {
      setDraggingIndex(null);
      return;
    }

    reorderFlowSteps(useCaseId, draggingIndex, targetIndex);
    setDraggingIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="text-right">
          <h3 className="text-base font-semibold text-[#1A1A2E]">
            שלבי התהליך
            <span className="mr-1 text-red-500">*</span>
          </h3>
          <p className="mt-1 text-sm text-[#4A4A6A]">
            פרט את השלבים שהמשתמש מבצע כיום, לפי הסדר, כולל מסכים וחישובים רלוונטיים.
          </p>
          {isMissingRequiredFlow && (
            <p className="mt-1 text-xs text-red-500">
              יש להוסיף לפחות שלב אחד ולמלא תיאור לכל שלב.
            </p>
          )}
        </div>
      </div>

      {/* Empty state */}
      {steps.length === 0 && (
        <button
          type="button"
          onClick={() => addFlowStep(useCaseId)}
          className="w-full text-center py-8 px-4 bg-[#F4F5F7] rounded-2xl border-2 border-dashed border-[#E0E0E0] mb-4 transition-colors hover:bg-[#EFEFF8] hover:border-[#C4B8FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4FE8]/30"
        >
          <div className="w-10 h-10 rounded-xl bg-[#5B4FE8]/10 flex items-center justify-center mx-auto mb-3 text-[#5B4FE8]">
            <Plus size={18} />
          </div>
          <p className="text-sm font-medium text-[#4A4A6A] mb-1">אין שלבים עדיין</p>
          <p className="text-xs text-[#AAAACC]">
            לחצו כדי להוסיף את הצעד הראשון בתהליך הקיים
          </p>
        </button>
      )}

      {/* Steps timeline */}
      {steps.length > 0 && (
        <div className="mb-4 space-y-0">
          {steps.map((step, index) => (
            <FlowStepItem
              key={step.id}
              useCaseId={useCaseId}
              step={step}
              isLast={index === steps.length - 1}
              isDragging={draggingIndex === index}
              onDragStart={() => setDraggingIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(index)}
            />
          ))}
        </div>
      )}

      {/* Add step button */}
      {steps.length > 0 && (
        <Button
          variant="outline"
          size="md"
          onClick={() => addFlowStep(useCaseId)}
          className="w-full justify-center rounded-[10px] border-[#2ABFAB] text-[#2ABFAB] hover:bg-[#2ABFAB]/5"
        >
          הוסף שלב לתהליך
          <Plus size={15} />
        </Button>
      )}
    </div>
  );
}
