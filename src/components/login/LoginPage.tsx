"use client";

import { FormEvent } from "react";
import { Building2, PenLine, Sparkles } from "lucide-react";
import { useFormStore } from "@/store/formStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CUSTOMER_OPTIONS = [
  "מכבי שירותי בריאות",
  "חברת חשמל לישראל",
  "ישראכרט",
  "ביטוח ישיר",
];

export default function LoginPage() {
  const { projectIntake, updateProjectIntake, completeLogin } = useFormStore();
  const canContinue =
    CUSTOMER_OPTIONS.includes(projectIntake.clientName) &&
    projectIntake.documentAuthorName.trim().length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canContinue) completeLogin();
  };

  return (
    <main className="relative min-h-screen bg-[#F7F7FB] flex items-center justify-center px-6 py-10">
      <img
        src="/JEEN_logo.png"
        alt="Jeen"
        className="fixed -top-4 left-4 h-[8.5rem] w-auto z-10"
      />
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl rounded-[2rem] bg-white border border-[#EEEEEE] shadow-xl shadow-slate-200/50 px-7 py-8 animate-fade-in"
      >
        <div className="flex items-center gap-3 mb-7">
          <div className="w-12 h-12 rounded-3xl bg-[#EEE9FF] text-[#5B4FE8] flex items-center justify-center ring-1 ring-[#C4B8FF]/50">
            <Sparkles size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E]">התחלת מסמך אפיון</h1>
            <p className="text-sm text-[#6B6B8A] mt-1">
              מלא את פרטי המסמך לפני הכניסה לתהליך האפיון.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <Label htmlFor="client-name" required>
              <span className="flex items-center gap-1.5">
                <Building2 size={14} className="text-indigo-500" />
                שם הלקוח / החברה
              </span>
            </Label>
            <select
              id="client-name"
              value={projectIntake.clientName}
              onChange={(event) =>
                updateProjectIntake({ clientName: event.target.value })
              }
              className="flex w-full rounded-lg border border-[#E0E0E0] bg-white px-3.5 py-2.5 text-sm text-[#1A1A2E] shadow-sm transition duration-150 focus:outline-none focus:border-[#5B4FE8] focus:shadow-[0_0_0_3px_rgba(91,79,232,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
              autoFocus
            >
              <option value="">בחר לקוח...</option>
              {CUSTOMER_OPTIONS.map((customer) => (
                <option key={customer} value={customer}>
                  {customer}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="author-name" required>
              <span className="flex items-center gap-1.5">
                <PenLine size={14} className="text-indigo-500" />
                שם עורך המסמך
              </span>
            </Label>
            <Input
              id="author-name"
              value={projectIntake.documentAuthorName}
              onChange={(event) =>
                updateProjectIntake({ documentAuthorName: event.target.value })
              }
              placeholder='לדוגמה: "ישראל לוי"'
            />
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full mt-8" disabled={!canContinue}>
          המשך לאפיון הסוכן
        </Button>
      </form>
    </main>
  );
}
