"use client";

import { FormEvent } from "react";
import {
  Building2,
  PenLine,
  Sparkles,
  Network,
  Briefcase,
  Target,
  ListChecks,
  Clock,
} from "lucide-react";
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
    <main className="relative min-h-screen bg-[#F7F7FB] flex items-center justify-center px-6 py-6">
      <img
        src="/JEEN_logo.png"
        alt="Jeen"
        className="fixed -top-4 left-4 h-[8.5rem] w-auto z-10"
      />
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl rounded-[2rem] bg-white border border-[#EEEEEE] shadow-xl shadow-slate-200/50 px-7 py-7 animate-fade-in"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-3xl bg-[#EEE9FF] text-[#5B4FE8] flex items-center justify-center ring-1 ring-[#C4B8FF]/50">
            <Sparkles size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E]">אפיון סוכן AI</h1>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-2xl border border-[#E8E4FF] bg-[#F8F6FF] px-5 py-4 text-right">
            <p className="text-sm leading-6 text-[#4B4B68]">
              מסמך האפיון של Jeen AI נועד לעזור לך להגדיר בצורה מדויקת את הסוכן
              שברצונך ליצור או לייעל, כדי שנוכל להבין את הצורך העסקי, תרחישי
              השימוש, מקורות המידע ומדדי ההצלחה.
            </p>
            <div className="mt-4 grid gap-3 text-sm text-[#4B4B68] sm:grid-cols-3">
              <div className="rounded-xl bg-white/80 p-3 text-center shadow-sm shadow-indigo-100/50">
                <Target size={16} className="mx-auto mb-2 text-[#5B4FE8]" />
                <p className="font-semibold text-[#1A1A2E]">מטרת התהליך</p>
                <p className="mt-1 leading-5">להפוך רעיון לסוכן ברור, ישים ומדיד.</p>
              </div>
              <div className="rounded-xl bg-white/80 p-3 text-center shadow-sm shadow-indigo-100/50">
                <ListChecks size={16} className="mx-auto mb-2 text-[#5B4FE8]" />
                <p className="font-semibold text-[#1A1A2E]">מה ממלאים</p>
                <p className="mt-1 leading-5">פרטי הסוכן, תרחישי שימוש, דאטה ומדדים.</p>
              </div>
              <div className="rounded-xl bg-white/80 p-3 text-center shadow-sm shadow-indigo-100/50">
                <Clock size={16} className="mx-auto mb-2 text-[#5B4FE8]" />
                <p className="font-semibold text-[#1A1A2E]">משך מילוי משוער</p>
                <p className="mt-1 leading-5">כ-20-30 דקות, לפי רמת הפירוט.</p>
              </div>
            </div>
          </div>

          <div>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="client-name" className="inline-flex items-center" required>
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
                <Label htmlFor="author-name" className="inline-flex items-center" required>
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

              <div>
                <Label htmlFor="department">
                  <span className="flex items-center gap-1.5">
                    <Network size={14} className="text-indigo-500" />
                    מחלקה / חטיבה / אחר
                  </span>
                </Label>
                <Input
                  id="department"
                  value={projectIntake.department}
                  onChange={(event) =>
                    updateProjectIntake({ department: event.target.value })
                  }
                  placeholder='לדוגמה: "חטיבת טכנולוגיה", "מחלקת שירות לקוחות"'
                />
              </div>

              <div>
                <Label htmlFor="position">
                  <span className="flex items-center gap-1.5">
                    <Briefcase size={14} className="text-indigo-500" />
                    תפקיד
                  </span>
                </Label>
                <Input
                  id="position"
                  value={projectIntake.position}
                  onChange={(event) =>
                    updateProjectIntake({ position: event.target.value })
                  }
                  placeholder='לדוגמה: "מנהל מוצר", "ראש צוות פיתוח"'
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full mt-6" disabled={!canContinue}>
              המשך לאפיון הסוכן
            </Button>
          </div>
        </div>
      </form>
    </main>
  );
}
