"use client";

import { FormEvent } from "react";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Briefcase,
  Clock,
  Database,
  Lock,
  MessageCircle,
  Network,
  PenLine,
  Target,
  UserRound,
} from "lucide-react";
import { useFormStore } from "@/store/formStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, LOCKED_FORM_STEP_IDS, LOGIN_STEP_CONFIGS } from "@/lib/utils";

const CUSTOMER_OPTIONS = [
  "מכבי שירותי בריאות",
  "חברת חשמל לישראל",
  "ישראכרט",
  "ביטוח ישיר",
];

const INTRO_STEPS = LOGIN_STEP_CONFIGS;
const STEP_ICONS = [UserRound, MessageCircle, Database, BookOpen, Target];
const STEP_COLORS = [
  { bg: "#EEE9FF", text: "#5B4FE8" },
  { bg: "#D6F5F0", text: "#2ABFAB" },
  { bg: "#FEF3DC", text: "#F5A623" },
  { bg: "#FCE4E9", text: "#E8607A" },
  { bg: "#EDE0F8", text: "#9B59B6" },
];
const jeenAssistedStepIds = new Set(LOCKED_FORM_STEP_IDS);

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
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#EEE9FF_0,#F7F7FB_34%,#F7F7FB_100%)] px-5 py-8">
      <img
        src="/JEEN_logo.png"
        alt="Jeen"
        className="fixed -top-4 left-4 z-10 h-[8.5rem] w-auto"
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-0 mx-auto w-full max-w-5xl animate-fade-in rounded-[2rem] border border-white/80 bg-white/95 px-6 py-7 shadow-2xl shadow-indigo-950/[0.08] backdrop-blur sm:px-8 lg:px-10"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#1A1A2E] sm:text-4xl">
            ברוכים הבאים לאפיון הצורך העסקי
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#4B4B68] sm:text-base">
            נשלים יחד תהליך אפיון קצר שיעזור לנו להבין את הצורך העסקי, התהליך הקיים, מקורות המידע והערך הרצוי - כדי להתאים עבורכם פתרון AI מדויק וישים.
          </p>
        </div>

        <section className="mt-9">
          <div className="mb-5 flex flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-bold text-[#1A1A2E]">מה יקרה בהמשך התהליך?</p>
          </div>

          <div className="grid gap-6 md:grid-cols-5 md:gap-0">
            {INTRO_STEPS.map((step, index) => {
              const Icon = STEP_ICONS[index];
              const isJeenAssisted = jeenAssistedStepIds.has(step.id);
              const color = STEP_COLORS[index];

              return (
                <div key={step.id} className="relative flex flex-col items-center text-center">
                  {index < INTRO_STEPS.length - 1 && (
                    <div className="absolute left-[-50%] top-9 hidden h-px w-full border-t border-dashed border-[#DAD6EA] md:block" />
                  )}

                  <div className="relative z-10 flex flex-col items-center">
                    <span
                      className={cn(
                        "absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm",
                        isJeenAssisted && "bg-slate-400"
                      )}
                      style={isJeenAssisted ? undefined : { backgroundColor: color.text }}
                    >
                      {step.id}
                    </span>
                    <div
                      className={cn(
                        "flex h-16 w-16 items-center justify-center rounded-full border-8 border-white shadow-[0_8px_24px_rgba(91,79,232,0.12)]",
                        isJeenAssisted ? "bg-slate-100 text-slate-400" : "text-white"
                      )}
                      style={
                        isJeenAssisted
                          ? undefined
                          : { backgroundColor: color.text, boxShadow: `0 10px 24px ${color.bg}` }
                      }
                    >
                      {isJeenAssisted ? <Lock size={20} /> : <Icon size={20} />}
                    </div>
                  </div>

                  <h3 className="mt-3 text-sm font-bold text-[#1A1A2E]">{step.title}</h3>
                  {step.subtitle && (
                    <p className="mt-1 max-w-[9rem] text-xs leading-5 text-[#6B6B8A]">
                      {step.subtitle}
                    </p>
                  )}
                  {isJeenAssisted && (
                    <span className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-[#8A88A8]">
ימולא יחד עם Jeen 
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <div className="mt-8 grid gap-6">
          <div className="grid gap-3 rounded-2xl border border-[#E8E4FF] bg-[#F8F6FF] px-5 py-4 text-sm text-[#4B4B68] sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="flex items-center justify-center gap-3 text-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#5B4FE8] shadow-sm">
                <Clock size={18} />
              </div>
              <div>
                <p className="font-semibold text-[#1A1A2E]">מומלץ להכין מראש</p>
                <p className="mt-0.5 text-xs leading-5">
                  דוגמאות לתהליכים קיימים, שאלות משתמשים, מסכים ומקורות מידע רלוונטיים.
                </p>
              </div>
            </div>

            <div className="hidden h-12 w-px bg-[#E2DDF8] sm:block" />

            <div className="flex items-center justify-center gap-3 text-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#5B4FE8] shadow-sm">
                <Target size={18} />
              </div>
              <div>
                <p className="font-semibold text-[#1A1A2E]">משך מילוי משוער</p>
                <p className="mt-0.5 text-xs leading-5">15 - 20 דקות.</p>
              </div>
            </div>
          </div>

          <section className="rounded-3xl border border-[#EEEEEE] bg-white px-5 py-5 shadow-sm">
            <div className="mb-5 text-right">
              <h2 className="text-base font-bold text-[#1A1A2E]">פרטי ממלא האפיון</h2>
              
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
                    שם עורך האפיון
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

            <Button
              type="submit"
              size="lg"
              className="mt-6 w-full rounded-2xl py-4 text-base font-bold"
              disabled={!canContinue}
            >
              התחלת האפיון
              <ArrowLeft size={18} />
            </Button>
          </section>
        </div>
      </form>
    </main>
  );
}
