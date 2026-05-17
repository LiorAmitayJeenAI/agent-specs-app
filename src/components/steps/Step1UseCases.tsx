"use client";

import { useState } from "react";
import { Plus, Sparkles, ChevronLeft, Lightbulb, X } from "lucide-react";
import { useFormStore } from "@/store/formStore";
import { Button } from "@/components/ui/button";
import UseCaseCard from "@/components/use-case/UseCaseCard";

export default function Step1UseCases() {
  const { useCases, addUseCase, nextStep } = useFormStore();
  const [tipDismissed, setTipDismissed] = useState(false);
  const hasMissingRequiredFlow = useCases.some(
    (useCase) =>
      useCase.flowSteps.length === 0 ||
      useCase.flowSteps.some((step) => !step.description.trim())
  );
  const canContinue = useCases.length > 0 && !hasMissingRequiredFlow;

  return (
    <div className="space-y-7 animate-fade-in">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="rounded-[2rem] bg-white/75 border border-white/70 shadow-xl shadow-indigo-950/[0.04] px-6 py-6 backdrop-blur">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles size={15} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">תרחישי שימוש</h1>
        </div>
        <p className="text-slate-500 text-sm leading-relaxed mt-2 max-w-2xl">
          תאר את השאלות שמשתמשים שואלים היום באופן ידני. כל תרחיש יעזור לנו להבין מה הסוכן צריך לבצע.
        </p>
      </div>

      {/* ── Tip Banner ──────────────────────────────────────────────────────── */}
      {!tipDismissed && (
        <div className="relative flex gap-3 bg-gradient-to-l from-amber-50 to-orange-50 border border-amber-200/80 rounded-3xl px-4 py-4 animate-fade-in shadow-lg shadow-amber-900/[0.06]">
          <div className="shrink-0 mt-0.5">
            <div className="w-8 h-8 rounded-2xl bg-white/80 flex items-center justify-center shadow-sm">
              <Lightbulb size={15} className="text-amber-600" />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800 mb-1.5">
              דגשים חשובים לפני שמתחילים:
            </p>
            <ul className="space-y-1">
              <li className="text-sm text-amber-700 flex gap-2">
                <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                חשוב להביא דוגמאות אמיתיות — שאלות אמיתיות, קבצים, צילומי מסך של הממשקים
              </li>
              <li className="text-sm text-amber-700 flex gap-2">
                <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                עדיף עומק על פני רוחב — 2–5 תרחישים מפורטים עדיפים על רשימה כללית של 20
              </li>
            </ul>
          </div>
          <button
            onClick={() => setTipDismissed(true)}
            className="shrink-0 text-amber-400 hover:text-amber-600 transition-colors p-1 rounded-lg hover:bg-amber-100"
            aria-label="סגור טיפ"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── Use Case Cards ──────────────────────────────────────────────────── */}
      {useCases.length === 0 ? (
        <div className="text-center py-16 px-6 bg-white/80 rounded-[2rem] border-2 border-dashed border-indigo-200 shadow-xl shadow-indigo-950/[0.04]">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Sparkles size={24} className="text-indigo-500" />
          </div>
          <h3 className="font-semibold text-slate-700 mb-1">עדיין אין תרחישים</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">
            לחץ על הכפתור למטה כדי להוסיף את התרחיש הראשון
          </p>
          <Button onClick={addUseCase} size="lg">
            הוסף תרחיש שימוש ראשון
            <Plus size={17} />
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-5">
            {useCases.map((uc, index) => (
              <UseCaseCard key={uc.id} useCase={uc} index={index} />
            ))}
          </div>

          <button
            onClick={addUseCase}
            className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-indigo-200 rounded-3xl text-indigo-600 bg-white/60 hover:bg-indigo-50 hover:border-indigo-300 transition-colors text-sm font-medium shadow-sm"
          >
            הוסף תרחיש שימוש נוסף
            <Plus size={16} />
          </button>
        </>
      )}

      {/* ── Navigation ──────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center pt-4 border-t border-white/70">
        <div />
        <Button
          onClick={nextStep}
          size="lg"
          disabled={!canContinue}
          className="gap-2"
        >
          המשך לשלב הבא
          <ChevronLeft size={17} />
        </Button>
      </div>
      {hasMissingRequiredFlow && (
        <p className="text-left text-xs text-red-500">
          יש למלא פירוט התהליך הקיים (Flow) בכל תרחיש שימוש כדי להמשיך.
        </p>
      )}
    </div>
  );
}
