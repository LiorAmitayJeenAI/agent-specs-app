"use client";

import React from "react";
import { ChevronDown, ChevronUp, Trash2, User, Layers, MessageSquare } from "lucide-react";
import { useFormStore } from "@/store/formStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import HelpTooltip from "@/components/shared/HelpTooltip";
import TagInput from "@/components/shared/TagInput";
import FlowSteps from "@/components/flow/FlowSteps";
import { cn } from "@/lib/utils";
import type { UseCase } from "@/types";

const COMMON_SYSTEMS = [
  "Salesforce",
  "SAP",
  "Excel",
  "Google Sheets",
  "Monday.com",
  "Jira",
  "Slack",
  "Gmail",
  "Outlook",
  "SharePoint",
  "Dynamics 365",
  "HubSpot",
  "Zendesk",
  "Oracle",
  "Power BI",
];

interface UseCaseCardProps {
  useCase: UseCase;
  index: number;
}

function SectionHeader({
  number,
  title,
  subtitle,
  accentClass,
}: {
  number: string;
  title: string;
  subtitle: string;
  accentClass: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 mb-5 pb-4 border-b", accentClass)}>
      <span className="text-base font-bold opacity-50">{number}</span>
      <div>
        <p className="text-sm font-semibold leading-tight">{title}</p>
        <p className="text-xs opacity-60 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

export default function UseCaseCard({ useCase, index }: UseCaseCardProps) {
  const { updateUseCase, removeUseCase, toggleUseCaseCollapse } = useFormStore();

  const update = (patch: Partial<UseCase>) => updateUseCase(useCase.id, patch);

  const handleQuestionChange = (q: string) => {
    update({
      userQuestion: q,
      title: q.slice(0, 50) || `תרחיש ${index + 1}`,
    });
  };

  return (
    <Card className={cn("use-case-card overflow-hidden", !useCase.isCollapsed && "border-indigo-200/80 ring-indigo-100")}>
      {/* ── Card Header ─────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center justify-between px-5 py-4 transition-colors",
          useCase.isCollapsed
            ? "rounded-b-3xl"
            : "border-b border-indigo-100 bg-gradient-to-l from-indigo-50/80 via-violet-50/50 to-white"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#EEE9FF] text-[#5B4FE8] flex items-center justify-center text-sm font-bold shrink-0 ring-1 ring-[#C4B8FF]/50">
            {index + 1}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {useCase.useCaseName || useCase.title || `תרחיש שימוש ${index + 1}`}
            </p>
            {useCase.isCollapsed && useCase.userQuestion && (
              <p className="text-xs text-slate-400 mt-0.5 max-w-xs truncate">
                {useCase.userQuestion}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleUseCaseCollapse(useCase.id)}
            className="h-8 w-8"
            aria-label={useCase.isCollapsed ? "הרחב" : "כווץ"}
          >
            {useCase.isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeUseCase(useCase.id)}
            className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
            aria-label="מחק תרחיש"
          >
            <Trash2 size={15} />
          </Button>
        </div>
      </div>

      {/* ── Collapsible Body ────────────────────────────────────────────────── */}
      {!useCase.isCollapsed && (
        <CardContent className="px-5 py-5 space-y-4 animate-fade-in">
          <section className="rounded-2xl bg-white border border-indigo-100 px-4 py-4 shadow-sm">
            <Label htmlFor={`use-case-name-${useCase.id}`} required>
              <span className="inline-flex items-center gap-1.5">
                שם תרחיש השימוש
                <HelpTooltip text="שם קצר שיעזור לזהות את התרחיש גם אם יש בו כמה שאלות." />
              </span>
            </Label>
            <Input
              id={`use-case-name-${useCase.id}`}
              placeholder='לדוגמה: "בדיקת סטטוס הזמנה", "פתיחת קריאת שירות"'
              value={useCase.useCaseName}
              onChange={(e) => update({ useCaseName: e.target.value })}
              className="bg-white"
            />
          </section>

          {/* ── Section 1: Description — indigo tint ──────────────────────── */}
          <section className="rounded-2xl bg-gradient-to-l from-indigo-50/80 to-white border border-indigo-100 px-4 pt-4 pb-5 shadow-sm">
            <SectionHeader
              number="①"
              title="מה המשתמש צריך לדעת?"
              subtitle="שאלה אמיתית והתשובה שהסוכן צריך להחזיר"
              accentClass="border-indigo-100 text-indigo-800"
            />

            <div className="space-y-4">
              <div>
                <Label htmlFor={`question-${useCase.id}`} required>
                  <span className="flex items-center gap-1.5">
                    <MessageSquare size={13} className="text-indigo-500" />
                    איך המשתמש ישאל את הסוכן?
                    <HelpTooltip text="כתוב כמו שהמשתמש היה שואל באמת." />
                  </span>
                </Label>
                <Textarea
                  id={`question-${useCase.id}`}
                  rows={3}
                  placeholder='לדוגמה: "מה הסטטוס של הזמנה 123?"'
                  value={useCase.userQuestion}
                  onChange={(e) => handleQuestionChange(e.target.value)}
                  className="bg-white"
                />
              </div>

              <div>
                <Label htmlFor={`answer-${useCase.id}`} required>
                  <span className="inline-flex items-center gap-1.5">
                    מה הסוכן צריך לענות?
                    <HelpTooltip text="מספיק לתאר את המידע החשוב שהמשתמש צריך לקבל." />
                  </span>
                </Label>
                <Textarea
                  id={`answer-${useCase.id}`}
                  rows={3}
                  placeholder='לדוגמה: "סטטוס ההזמנה, תאריך אספקה צפוי והשלב הבא"'
                  value={useCase.expectedAnswer}
                  onChange={(e) => update({ expectedAnswer: e.target.value })}
                  className="bg-white"
                />
              </div>
            </div>
          </section>

          {/* ── Section 2: Background — slate tint ────────────────────────── */}
          <section className="rounded-2xl bg-white border border-slate-200/80 px-4 pt-4 pb-5 shadow-sm">
            <SectionHeader
              number="②"
              title="רקע קצר"
              subtitle="מי עושה את זה היום ובאילו מערכות"
              accentClass="border-slate-200 text-slate-700"
            />

            <div className="space-y-4">
              <div>
                <Label htmlFor={`performer-${useCase.id}`}>
                  <span className="flex items-center gap-1.5">
                    <User size={13} className="text-slate-500" />
                    מי מבצע את התהליך היום?
                    <HelpTooltip text="לדוגמה: נציג שירות לקוחות, מנהל מחסן, רואה חשבון, מנהל תפעול." />
                  </span>
                </Label>
                <Input
                  id={`performer-${useCase.id}`}
                  placeholder='למשל: "נציג שירות לקוחות", "מנהל מחסן", "רואה חשבון"...'
                  value={useCase.performer}
                  onChange={(e) => update({ performer: e.target.value })}
                  className="bg-white"
                />
              </div>

              <div>
                <Label>
                  <span className="flex items-center gap-1.5">
                    <Layers size={13} className="text-slate-500" />
                    אילו מערכות מעורבות?
                    <HelpTooltip text="לדוגמה: SAP, Excel, Salesforce, מייל, מערכת פנימית. לחץ Enter כדי להוסיף מערכת." />
                  </span>
                </Label>
                <TagInput
                  value={useCase.systemsInvolved}
                  onChange={(tags) => update({ systemsInvolved: tags })}
                  placeholder="הקלד שם מערכת ולחץ Enter..."
                  suggestions={COMMON_SYSTEMS}
                />
              </div>

              <div>
                <Label htmlFor={`notes-${useCase.id}`}>הערות נוספות</Label>
                <Textarea
                  id={`notes-${useCase.id}`}
                  rows={2}
                  placeholder="הקשר נוסף, חריגים, מקרי קצה, דגשים חשובים..."
                  value={useCase.additionalNotes}
                  onChange={(e) => update({ additionalNotes: e.target.value })}
                  className="bg-white"
                />
              </div>
            </div>
          </section>

          {/* ── Section 3: Flow — violet tint ─────────────────────────────── */}
          <section className="rounded-2xl bg-gradient-to-l from-violet-50/70 to-white border border-violet-100 px-4 pt-4 pb-5 shadow-sm">
            <SectionHeader
              number="③"
              title="איך זה עובד היום?"
              subtitle="הוסף שלבים קצרים, אפשר לצרף צילום מסך לכל שלב"
              accentClass="border-violet-100 text-violet-800"
            />
            <FlowSteps useCaseId={useCase.id} />
          </section>

        </CardContent>
      )}
    </Card>
  );
}
