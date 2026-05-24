"use client";

import React, { useState } from "react";
import {
  Trash2,
  Database,
  ChevronDown,
  MessageCircle,
  FileText,
  Lightbulb,
  Info,
} from "lucide-react";
import { useFormStore } from "@/store/formStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import HelpTooltip from "@/components/shared/HelpTooltip";
import type { QAPair } from "@/types";

function InstructionCard() {
  const [isExpanded, setIsExpanded] = useState(false);

  const rows = [
    {
      icon: <FileText size={14} className="text-violet-600" />,
      title: "שאלת משתמש",
      text: "כתבו שאלות אמיתיות שמשתמשים עשויים לשאול במהלך העבודה השוטפת.",
    },
    {
      icon: <MessageCircle size={14} className="text-violet-600" />,
      title: "תשובה מצופה",
      text: "כתבו את התשובה שהייתם רוצים שהפתרון יחזיר למשתמש. במידת הצורך, ניתן לציין גם את סגנון או טון המענה הרצוי.",
    },
    {
      icon: <Database size={14} className="text-violet-600" />,
      title: "מקור מידע",
      text: "ציינו מאיפה מגיע המידע הדרוש למענה על השאלה.",
    },
  ];

  return (
    <div className="rounded-2xl border border-violet-200/70 bg-white shadow-sm overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-slate-50/60 ${
          isExpanded ? "border-b border-slate-100" : ""
        }`}
      >
        <span className="inline-flex items-center gap-2.5 text-sm font-semibold text-violet-800">
          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
            <Lightbulb size={14} className="text-amber-600" />
          </div>
          <span className="inline-flex items-center gap-2">
            <span>הנחיות למילוי נכון</span>
            <span className="text-violet-300">|</span>
            <span className="text-[11px] font-normal text-violet-500">
              טיפים שיעזרו לכם למלא את הטבלה בצורה מיטבית.
            </span>
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`text-violet-400 transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 pt-2 animate-fade-in">
          <div className="divide-y divide-slate-100">
            {rows.map((row) => (
              <div
                key={row.title}
                className="flex items-start gap-3 py-3.5 first:pt-2 last:pb-0 px-2 -mx-2 rounded-lg hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                  <div className="w-6 h-6 rounded-md bg-violet-50 flex items-center justify-center">
                    {row.icon}
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    {row.title}
                  </span>
                </div>
                <span className="text-xs text-slate-500 leading-relaxed pt-0.5">
                  {row.text}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2.5 mt-4 px-3 py-2.5 rounded-lg bg-blue-50/70 border border-blue-100/60">
            <Info size={14} className="text-blue-500 shrink-0" />
            <p className="text-[11px] text-blue-600 leading-relaxed">
              מומלץ להשתמש בדוגמאות אמיתיות מהעבודה היומיומית, כדי שנוכל להבין
              טוב יותר את הצורך.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface QAPairsTableProps {
  useCaseId: string;
}

export default function QAPairsTable({ useCaseId }: QAPairsTableProps) {
  const { useCases, dataSources, addQAPair, updateQAPair, removeQAPair } =
    useFormStore();

  const useCase = useCases.find((uc) => uc.id === useCaseId);
  const pairs = useCase?.qaPairs ?? [];

  const dataSourceNames = dataSources
    .map((ds) => ds.name)
    .filter((name) => name.trim());

  return (
    <div className="space-y-4">
      {/* Instruction Card */}
      <InstructionCard />

      {/* QA table */}
      {pairs.length > 0 && (
        <div className="space-y-1">
          {/* Header row */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_1fr_36px] gap-2 px-3">
            <Label className="text-center text-xs font-semibold text-violet-600">
              שאלת משתמש
            </Label>
            <Label className="text-center text-xs font-semibold text-violet-600">
              תשובה מצופה
            </Label>
            <Label className="text-center text-xs font-semibold text-violet-600">
              <span className="inline-flex items-center justify-center gap-1">
                <Database size={11} />
                מקור מידע
              </span>
            </Label>
            <span />
          </div>

          {/* QA Pair Rows */}
          {pairs.map((pair, index) => (
            <QAPairRow
              key={pair.id}
              pair={pair}
              index={index}
              useCaseId={useCaseId}
              dataSourceNames={dataSourceNames}
              canDelete={pairs.length > 1}
              onUpdate={(patch) => updateQAPair(useCaseId, pair.id, patch)}
              onRemove={() => removeQAPair(useCaseId, pair.id)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {pairs.length === 0 && (
        <div className="text-center py-6 px-4 bg-violet-50/50 rounded-2xl border-2 border-dashed border-violet-200">
          <p className="text-sm text-violet-600 font-medium mb-1">
            אין עדיין שאלות ותשובות
          </p>
          <p className="text-xs text-violet-400">
            הוסף את הזוג הראשון של שאלה ותשובה
          </p>
        </div>
      )}

      {/* Add button */}
      <button
        type="button"
        onClick={() => addQAPair(useCaseId)}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-violet-200 rounded-2xl text-violet-600 bg-white/60 hover:bg-violet-50 hover:border-violet-300 transition-colors text-sm font-medium shadow-sm"
      >
        הוסף שאלה ותשובה +
      </button>
    </div>
  );
}

interface QAPairRowProps {
  pair: QAPair;
  index: number;
  useCaseId: string;
  dataSourceNames: string[];
  canDelete: boolean;
  onUpdate: (patch: Partial<QAPair>) => void;
  onRemove: () => void;
}

function QAPairRow({
  pair,
  index,
  dataSourceNames,
  canDelete,
  onUpdate,
  onRemove,
}: QAPairRowProps) {
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const filteredSuggestions = dataSourceNames.filter(
    (name) =>
      name.toLowerCase().includes(pair.dataSourceRef.toLowerCase()) &&
      name !== pair.dataSourceRef
  );

  return (
    <div className="group relative grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_36px] gap-2 p-3 bg-white rounded-xl border border-violet-100/80 shadow-sm hover:border-violet-200 hover:shadow-md transition-all">
      {/* Row number badge */}
      <div className="absolute -right-2 -top-2 w-5 h-5 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-[10px] font-bold sm:hidden">
        {index + 1}
      </div>

      {/* Question */}
      <div>
        <Label className="text-xs text-slate-500 sm:hidden mb-1 block">
          שאלת משתמש
        </Label>
        <Input
          placeholder='לדוגמה: "מה הסטטוס של הזמנה 123?"'
          value={pair.question}
          onChange={(e) => onUpdate({ question: e.target.value })}
          className="bg-white text-sm"
        />
      </div>

      {/* Answer */}
      <div>
        <Label className="text-xs text-slate-500 sm:hidden mb-1 block">
          תשובה מצופה
        </Label>
        <Input
          placeholder='לדוגמה: "ההזמנה אושרה, אספקה ב-12.6"'
          value={pair.expectedAnswer}
          onChange={(e) => onUpdate({ expectedAnswer: e.target.value })}
          className="bg-white text-sm"
        />
      </div>

      {/* Data Source */}
      <div className="relative">
        <Label className="text-xs text-slate-500 sm:hidden mb-1 block">
          <span className="inline-flex items-center gap-1">
            <Database size={10} />
            מקור מידע
            <HelpTooltip text="מאיפה הסוכן צריך לשלוף את המידע לתשובה הזו? לדוגמה: טבלת הזמנות ב-SAP, קובץ Excel מלאי, API חיצוני." />
          </span>
        </Label>
        <Input
          placeholder="לדוגמה: SAP - טבלת הזמנות"
          value={pair.dataSourceRef}
          onChange={(e) => {
            onUpdate({ dataSourceRef: e.target.value });
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          className="bg-white text-sm"
        />
        {showSuggestions &&
          filteredSuggestions.length > 0 &&
          pair.dataSourceRef.length > 0 && (
            <ul className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              {filteredSuggestions.slice(0, 5).map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    className="w-full text-right px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                    onMouseDown={() => {
                      onUpdate({ dataSourceRef: name });
                      setShowSuggestions(false);
                    }}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          )}
      </div>

      {/* Delete */}
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={onRemove}
          disabled={!canDelete}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="מחק שורה"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
