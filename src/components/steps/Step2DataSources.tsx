"use client";

import { Plus, Database, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useFormStore } from "@/store/formStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import HelpTooltip from "@/components/shared/HelpTooltip";

const SOURCE_TYPES = [
  "מסד נתונים (SQL)",
  "קובץ Excel / CSV",
  "API חיצוני",
  "מערכת ERP",
  "מערכת CRM",
  "דוא\"ל / לוח שנה",
  "מסמכים (Word/PDF)",
  "Jira",
  "אחר",
];

export default function Step2DataSources() {
  const { dataSources, addDataSource, updateDataSource, removeDataSource, nextStep, prevStep } =
    useFormStore();
  const hasInvalidDataSource = dataSources.some(
    (ds) =>
      ds.name.trim().length === 0 ||
      ds.type.trim().length === 0 ||
      (ds.type === "אחר" && ds.description.trim().length === 0)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-[2rem] bg-white/75 border border-white/70 shadow-xl shadow-emerald-950/[0.04] px-6 py-6 backdrop-blur">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-2xl bg-[#D6F5F0] text-[#2ABFAB] flex items-center justify-center ring-1 ring-[#2ABFAB]/20">
            <Database size={15} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">מקורות מידע</h1>
        </div>
        <p className="text-slate-500 text-sm mt-2">
          מאיפה הסוכן יצטרך לשלוף מידע? ציין את כל מאגרי הנתונים הרלוונטיים.
        </p>
      </div>

      {dataSources.length === 0 ? (
        <div className="text-center py-14 px-6 bg-white/80 rounded-[2rem] border-2 border-dashed border-emerald-200 shadow-xl shadow-emerald-950/[0.04]">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mx-auto mb-3">
            <Database size={20} className="text-emerald-500" />
          </div>
          <p className="text-slate-500 text-sm mb-5">הוסף את מקורות הנתונים שהסוכן ישתמש בהם</p>
          <Button onClick={addDataSource} variant="secondary">
            <Plus size={15} />
            הוסף מקור מידע
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {dataSources.map((ds, i) => {
            const isOtherSource = ds.type === "אחר";
            const isNameMissing = ds.name.trim().length === 0;
            const isTypeMissing = ds.type.trim().length === 0;
            const isDescriptionMissing = isOtherSource && ds.description.trim().length === 0;

            return (
              <Card key={ds.id}>
                <CardContent className="py-5 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      {ds.name || `מקור מידע ${i + 1}`}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDataSource(ds.id)}
                      className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`ds-name-${ds.id}`} required>
                        <span className="inline-flex items-center gap-1.5">
                          שם מקור הנתונים
                          <HelpTooltip text="שם ברור של המאגר, הקובץ, המערכת או השירות שממנו הסוכן יצטרך לקבל מידע." />
                        </span>
                      </Label>
                      <Input
                        id={`ds-name-${ds.id}`}
                        placeholder='למשל: "מסד נתוני לקוחות", "קובץ מחירון"'
                        value={ds.name}
                        required
                        aria-invalid={isNameMissing}
                        aria-describedby={isNameMissing ? `ds-name-helper-${ds.id}` : undefined}
                        onChange={(e) => updateDataSource(ds.id, { name: e.target.value })}
                        className={
                          isNameMissing
                            ? "border-red-300 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]"
                            : undefined
                        }
                      />
                      {isNameMissing && (
                        <p id={`ds-name-helper-${ds.id}`} className="mt-1.5 text-xs text-red-500">
                          נא להזין שם מקור מידע
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor={`ds-type-${ds.id}`} required>
                        <span className="inline-flex items-center gap-1.5">
                          סוג מקור
                          <HelpTooltip text="בחר את סוג מקור המידע הקרוב ביותר. אם אין התאמה טובה, בחר אחר ופרט בתיאור." />
                        </span>
                      </Label>
                      <select
                        id={`ds-type-${ds.id}`}
                        value={ds.type}
                        onChange={(e) => updateDataSource(ds.id, { type: e.target.value })}
                        required
                        aria-invalid={isTypeMissing}
                        aria-describedby={isTypeMissing ? `ds-type-helper-${ds.id}` : undefined}
                        className={`flex w-full rounded-2xl border bg-white/95 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-4 transition duration-150 ${
                          isTypeMissing
                            ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                            : "border-slate-200/80 focus:border-indigo-300 focus:ring-indigo-100"
                        }`}
                      >
                        <option value="">בחר סוג...</option>
                        {SOURCE_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      {isTypeMissing && (
                        <p id={`ds-type-helper-${ds.id}`} className="mt-1.5 text-xs text-red-500">
                          נא לבחור סוג מקור
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`ds-desc-${ds.id}`} required={isOtherSource}>
                      <span className="inline-flex items-center gap-1.5">
                        תיאור
                        <HelpTooltip text="תאר בקצרה מה נמצא במקור המידע ולמה הוא רלוונטי לסוכן." />
                      </span>
                    </Label>
                    <Textarea
                      id={`ds-desc-${ds.id}`}
                      rows={2}
                      placeholder="לדוגמה: Jira – מערכת לניהול משימות ובאגים. משמשת את צוות הפיתוח למעקב אחר תקלות ובקשות שינוי."
                      value={ds.description}
                      required={isOtherSource}
                      aria-invalid={isDescriptionMissing}
                      aria-describedby={isDescriptionMissing ? `ds-desc-helper-${ds.id}` : undefined}
                      onChange={(e) => updateDataSource(ds.id, { description: e.target.value })}
                      className={
                        isDescriptionMissing
                          ? "border-red-300 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]"
                          : undefined
                      }
                    />
                    {isDescriptionMissing && (
                      <p id={`ds-desc-helper-${ds.id}`} className="mt-1.5 text-xs text-red-500">
                        נא לפרט על מקור המידע
                      </p>
                    )}
                  </div>

                </CardContent>
              </Card>
            );
          })}

          <button
            onClick={addDataSource}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-emerald-200 rounded-3xl text-emerald-600 bg-white/60 hover:bg-emerald-50 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus size={15} />
            הוסף מקור מידע נוסף
          </button>
        </div>
      )}

      <div className="flex justify-between items-center pt-4 border-t border-white/70">
        <Button variant="outline" onClick={prevStep}>
          <ChevronRight size={17} />
          חזור
        </Button>
        <Button onClick={nextStep} size="lg" disabled={hasInvalidDataSource}>
          המשך לשלב הבא
          <ChevronLeft size={17} />
        </Button>
      </div>
    </div>
  );
}
