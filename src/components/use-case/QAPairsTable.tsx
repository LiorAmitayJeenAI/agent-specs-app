"use client";

import React from "react";
import { Plus, Trash2, Database } from "lucide-react";
import { useFormStore } from "@/store/formStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import HelpTooltip from "@/components/shared/HelpTooltip";
import type { QAPair } from "@/types";

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
    <div className="space-y-3">
      {/* Header row (visible only when there are pairs) */}
      {pairs.length > 0 && (
        <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_1fr_36px] gap-2 px-1">
          <Label className="text-xs font-semibold text-indigo-600">
            שאלת משתמש
          </Label>
          <Label className="text-xs font-semibold text-indigo-600">
            תשובה מצופה
          </Label>
          <Label className="text-xs font-semibold text-indigo-600">
            <span className="inline-flex items-center gap-1">
              <Database size={11} />
              מקור מידע
            </span>
          </Label>
          <span />
        </div>
      )}

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

      {/* Empty state */}
      {pairs.length === 0 && (
        <div className="text-center py-6 px-4 bg-indigo-50/50 rounded-2xl border-2 border-dashed border-indigo-200">
          <p className="text-sm text-indigo-600 font-medium mb-1">
            אין עדיין שאלות ותשובות
          </p>
          <p className="text-xs text-indigo-400">
            הוסף את הזוג הראשון של שאלה ותשובה
          </p>
        </div>
      )}

      {/* Add button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => addQAPair(useCaseId)}
        className="w-full justify-center rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300"
      >
        הוסף שאלה ותשובה
        <Plus size={14} className="mr-1" />
      </Button>
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
    <div className="group relative grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_36px] gap-2 p-3 bg-white rounded-xl border border-slate-200/80 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all">
      {/* Row number badge */}
      <div className="absolute -right-2 -top-2 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold sm:hidden">
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
