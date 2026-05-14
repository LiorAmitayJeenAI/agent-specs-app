"use client";

import Sidebar from "./Sidebar";
import LoginPage from "@/components/login/LoginPage";
import StepAgentDetails from "@/components/steps/StepAgentDetails";
import Step1UseCases from "@/components/steps/Step1UseCases";
import Step2DataSources from "@/components/steps/Step2DataSources";
import Step3Concepts from "@/components/steps/Step3Concepts";
import Step4Metrics from "@/components/steps/Step4Metrics";
import Step5Summary from "@/components/steps/Step5Summary";
import { useFormStore } from "@/store/formStore";

const STEP_COMPONENTS: Record<number, React.ComponentType> = {
  1: StepAgentDetails,
  2: Step1UseCases,
  3: Step2DataSources,
  4: Step3Concepts,
  5: Step4Metrics,
  6: Step5Summary,
};

export default function AppLayout() {
  const { currentStep, isLoginComplete } = useFormStore();
  const StepComponent = STEP_COMPONENTS[currentStep] ?? StepAgentDetails;

  if (!isLoginComplete) {
    return <LoginPage />;
  }

  return (
    // In RTL, flex-row renders right-to-left → Sidebar is first child → lands on RIGHT
    <div className="flex min-h-screen bg-[#F7F7FB]">
      <Sidebar />

      {/* Main scrollable content */}
      <main className="flex-1 overflow-y-auto">
        <img
          src="/JEEN_logo.png"
          alt="Jeen"
          className="fixed -top-4 left-4 h-[8.5rem] w-auto z-10"
        />
        <div className="max-w-4xl mx-auto px-6 py-10 lg:py-12">
          <StepComponent />
        </div>
      </main>
    </div>
  );
}
