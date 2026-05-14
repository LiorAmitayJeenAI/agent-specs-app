"use client";

import { Bot, ChevronLeft } from "lucide-react";
import { useFormStore } from "@/store/formStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function StepAgentDetails() {
  const { agentDetails, updateAgentDetails, nextStep } = useFormStore();
  const canContinue =
    agentDetails.requestedAgentName.trim().length > 0 &&
    agentDetails.shortAgentDescription.trim().length > 0;

  return (
    <div className="space-y-7 animate-fade-in">
      <div className="rounded-[2rem] bg-white/75 border border-white/70 shadow-xl shadow-indigo-950/[0.04] px-6 py-6 backdrop-blur">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-2xl bg-[#EEE9FF] text-[#5B4FE8] flex items-center justify-center ring-1 ring-[#C4B8FF]/50">
            <Bot size={16} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">פרטי הסוכן</h1>
        </div>
        <p className="text-slate-500 text-sm leading-relaxed mt-2 max-w-lg">
        הגדירו את זהות הסוכן והמטרה המרכזית שלו, כדי שנוכל להתאים את האפיון לצורך העסקי.
        </p>
      </div>

      <div className="rounded-[2rem] bg-white/80 border border-white/70 shadow-xl shadow-indigo-950/[0.04] px-6 py-6 space-y-5">
        <div>
          <Label htmlFor="agent-name" required>שם הסוכן</Label>
          <Input
            id="agent-name"
            value={agentDetails.requestedAgentName}
            onChange={(event) =>
              updateAgentDetails({ requestedAgentName: event.target.value })
            }
            placeholder='לדוגמה: סוכן רכש ארגוני'
          />
        </div>

        <div>
          <Label htmlFor="agent-description" required>תיאור קצר של הסוכן</Label>
          <Textarea
            id="agent-description"
            rows={4}
            value={agentDetails.shortAgentDescription}
            onChange={(event) =>
              updateAgentDetails({ shortAgentDescription: event.target.value })
            }
            placeholder="תאר בקצרה מה הסוכן עושה, עבור מי, ומה הערך המרכזי שלו."
          />
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-white/70">
        <div />
        <Button onClick={nextStep} size="lg" disabled={!canContinue} className="gap-2">
          המשך להגדרת תרחישי שימוש
          <ChevronLeft size={17} />
        </Button>
      </div>
    </div>
  );
}
