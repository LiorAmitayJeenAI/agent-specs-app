"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import LoginPage from "@/components/login/LoginPage";
import StepAgentDetails from "@/components/steps/StepAgentDetails";
import Step1UseCases from "@/components/steps/Step1UseCases";
import Step2DataSources from "@/components/steps/Step2DataSources";
import Step3Concepts from "@/components/steps/Step3Concepts";
import Step4Metrics from "@/components/steps/Step4Metrics";
import Step5Summary from "@/components/steps/Step5Summary";
import { useFormStore } from "@/store/formStore";
import { LOCKED_FORM_STEP_IDS } from "@/lib/utils";

const STEP_COMPONENTS: Record<number, React.ComponentType> = {
  1: StepAgentDetails,
  2: Step1UseCases,
  3: Step2DataSources,
  4: Step3Concepts,
  5: Step4Metrics,
  6: Step5Summary,
};

const UUID_PATTERN = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

export default function AppLayout() {
  const searchParams = useSearchParams();
  const rawProjectId = searchParams.get("projectId");
  const projectId = rawProjectId?.match(UUID_PATTERN)?.[0];

  const { currentStep, isLoginComplete, isAdminView, projectId: storedProjectId, resetForm } = useFormStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const projectMismatch = !!(projectId && projectId !== storedProjectId);

  const hasReset = useRef(false);
  useEffect(() => {
    if (projectMismatch && !hasReset.current) {
      hasReset.current = true;
      resetForm();
    }
  }, [projectMismatch, resetForm]);

  const StepComponent = STEP_COMPONENTS[currentStep] ?? StepAgentDetails;
  const isCurrentStepLocked = !isAdminView && LOCKED_FORM_STEP_IDS.includes(currentStep);

  if (!isLoginComplete || projectMismatch) {
    return <LoginPage projectId={projectId} />;
  }

  return (
    <div className="flex min-h-screen bg-[#F7F7FB]">
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-y-auto">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-20 flex md:hidden items-center justify-between border-b border-[#EEEEEE] bg-white/90 backdrop-blur px-4 py-2.5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="פתח תפריט"
          >
            <Menu size={20} />
          </button>
          <img
            src="/JEEN_logo.png"
            alt="Jeen"
            className="h-12 w-auto"
          />
        </div>

        <img
          src="/JEEN_logo.png"
          alt="Jeen"
          className="hidden md:block fixed -top-4 left-4 h-[8.5rem] w-auto z-10"
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-10 lg:py-12">
          {isCurrentStepLocked ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white/80 px-6 py-8 text-center shadow-xl shadow-indigo-950/[0.04]">
              <h1 className="text-2xl font-bold text-slate-900">
                שלב זה יבוצע יחד עם מנהל הפרויקט
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                אפשר להמשיך לעבוד על שאר שלבי האפיון דרך הבר הצדדי.
              </p>
            </div>
          ) : (
            <StepComponent />
          )}
        </div>
      </main>
    </div>
  );
}
