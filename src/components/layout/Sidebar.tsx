"use client";

import { CheckCircle, Dot, RotateCcw } from "lucide-react";
import { useFormStore } from "@/store/formStore";
import { LOCKED_FORM_STEP_IDS, STEP_CONFIGS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const STEP_BADGES = [
  { bg: "#DDEEFF", text: "#4A90D9" },
  { bg: "#D6F5F0", text: "#2ABFAB" },
  { bg: "#FEF3DC", text: "#F5A623" },
  { bg: "#FCE4E9", text: "#E8607A" },
  { bg: "#EDE0F8", text: "#9B59B6" },
  { bg: "#EEE9FF", text: "#5B4FE8" },
];

const hasText = (value: string) => value.trim().length > 0;
const lockedStepIds = new Set(LOCKED_FORM_STEP_IDS);

export default function Sidebar() {
  const {
    currentStep,
    agentDetails,
    useCases,
    dataSources,
    concepts,
    successMetrics,
    goToStep,
    resetForm,
  } = useFormStore();
  const totalSteps = STEP_CONFIGS.length;

  const handleStepClick = (stepId: number) => {
    if (lockedStepIds.has(stepId)) return;
    goToStep(stepId);
  };

  const isStepComplete = (stepId: number) => {
    switch (stepId) {
      case 1:
        return (
          hasText(agentDetails.requestedAgentName) &&
          hasText(agentDetails.shortAgentDescription)
        );
      case 2:
        return (
          useCases.length > 0 &&
          useCases.every(
            (useCase) =>
              hasText(useCase.useCaseName) &&
              useCase.flowSteps.length > 0 &&
              useCase.flowSteps.every((step) => hasText(step.description))
          )
        );
      case 3:
        return (
          dataSources.length > 0 &&
          dataSources.every(
            (source) =>
              hasText(source.name) &&
              hasText(source.type) &&
              (source.type !== "אחר" || hasText(source.description))
          )
        );
      case 4:
        return concepts.length > 0 && concepts.every((concept) => hasText(concept.term));
      case 5:
        return successMetrics.length > 0 && successMetrics.every((metric) => hasText(metric.metric));
      case 6:
        return [1, 2, 3, 4, 5].every(isStepComplete);
      default:
        return false;
    }
  };

  const handleReset = () => {
    const shouldReset = window.confirm(
      "הפעולה תמחק את הטיוטה המקומית ותתחיל את הטופס מחדש. נתונים שכבר נשלחו למסד הנתונים לא יימחקו. להמשיך?"
    );

    if (shouldReset) resetForm();
  };

  return (
    <aside className="w-72 shrink-0 bg-[#FFFFFF] text-[#1A1A2E] border-l border-[#EEEEEE] min-h-screen flex flex-col sticky top-0 h-screen overflow-y-auto shadow-[2px_0_8px_rgba(0,0,0,0.05)]">
      {/* Logo / Brand */}
      <div className="px-6 py-6 border-b border-[#EEEEEE] bg-[#F8F8FC]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EEE9FF] flex items-center justify-center shrink-0 ring-1 ring-[#C4B8FF]/50">
            <span className="text-[#5B4FE8] font-bold text-sm">AI</span>
          </div>
          <div>
            <p className="text-[#1A1A2E] font-semibold text-sm leading-tight">אפיון סוכן AI</p>
            <p className="text-[#6B6B8A] text-xs mt-0.5">מדריך שלב-אחר-שלב</p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <nav className="flex-1 px-4 py-6">
        <p className="text-[#6B6B8A] text-xs font-semibold uppercase tracking-widest px-2 mb-4">
          שלבי המילוי
        </p>

        <ul className="space-y-0.5">
          {STEP_CONFIGS.map((step, index) => {
            const isActive = currentStep === step.id;
            const isLocked = lockedStepIds.has(step.id);
            const isCompleted = !isLocked && isStepComplete(step.id);
            const badge = STEP_BADGES[index] ?? STEP_BADGES[STEP_BADGES.length - 1];

            return (
              <li key={step.id} className="relative">
                <button
                  onClick={() => handleStepClick(step.id)}
                  aria-disabled={isLocked}
                  title={isLocked ? "שלב זה יבוצע יחד עם מנהל הפרויקט" : undefined}
                  className={cn(
                    "w-full text-right flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-150 cursor-pointer",
                    isActive && "bg-[#EEE9FF] ring-1 ring-[#C4B8FF]/50",
                    !isActive && !isLocked && "hover:bg-[#F8F8FC]",
                    isLocked && "cursor-not-allowed opacity-45"
                  )}
                >
                  {/* Step indicator */}
                  <div className="shrink-0">
                    {isCompleted ? (
                      <CheckCircle
                        size={22}
                        style={{ color: badge.text }}
                        strokeWidth={1.75}
                      />
                    ) : isActive ? (
                      <div
                        className="w-[22px] h-[22px] rounded-full flex items-center justify-center"
                        style={{ backgroundColor: badge.bg }}
                      >
                        <span className="text-xs font-bold" style={{ color: badge.text }}>{step.id}</span>
                      </div>
                    ) : (
                      <div
                        className="w-[22px] h-[22px] rounded-full flex items-center justify-center"
                        style={{ backgroundColor: badge.bg }}
                      >
                        <span className="text-xs font-bold" style={{ color: badge.text }}>{step.id}</span>
                      </div>
                    )}
                  </div>

                  {/* Labels */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium leading-tight",
                        isActive && "text-[#5B4FE8]",
                        isCompleted && "text-[#1A1A2E]",
                        isLocked && "text-[#6B6B8A]",
                        !isActive && !isCompleted && "text-[#6B6B8A]"
                      )}
                    >
                      {step.title}
                    </p>
                    <p
                      className={cn(
                        "text-xs mt-0.5 truncate",
                        isActive ? "text-[#5B4FE8]/80" : "text-[#6B6B8A]"
                      )}
                    >
                      {step.subtitle}
                    </p>
                    {isLocked && (
                      <p className="mt-0.5 text-[11px] leading-snug text-[#AAAACC]">
                        שלב זה יבוצע יחד עם מנהל הפרויקט
                      </p>
                    )}
                  </div>

                  {/* Active indicator */}
                  {isActive && (
                    <Dot size={20} className="text-[#5B4FE8] shrink-0" />
                  )}
                </button>

                {/* Connector line between steps */}
                {index < STEP_CONFIGS.length - 1 && (
                  <div className="flex justify-start pr-[22px] pl-3 my-0.5">
                    <div
                      className={cn(
                        "w-px h-3 mr-[10px]",
                        !isCompleted && "bg-[#EEEEEE]"
                      )}
                      style={isCompleted ? { backgroundColor: badge.text } : undefined}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer — progress bar */}
      <div className="px-5 py-4 border-t border-[#EEEEEE] bg-[#F8F8FC]">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex-1 h-1.5 rounded-full bg-[#EEEEEE] overflow-hidden">
            <div
              className="h-full bg-[#C4B8FF] rounded-full transition-all duration-500"
              style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
            />
          </div>
          <span className="text-[#6B6B8A] text-xs tabular-nums shrink-0">
            {currentStep}/{totalSteps}
          </span>
        </div>
        <p className="text-[#6B6B8A] text-xs">
          {currentStep === totalSteps ? "הכל מוכן לשליחה!" : `עוד ${totalSteps - currentStep} שלבים`}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="mt-4 w-full justify-center text-red-600 hover:bg-red-50"
        >
          <RotateCcw size={14} />
          התחל מחדש
        </Button>
      </div>
    </aside>
  );
}
