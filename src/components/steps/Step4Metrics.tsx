"use client";

import { Plus, Target, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useFormStore } from "@/store/formStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function Step4Metrics() {
  const { successMetrics, addSuccessMetric, updateSuccessMetric, removeSuccessMetric, nextStep, prevStep } =
    useFormStore();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-[2rem] bg-white/75 border border-white/70 shadow-xl shadow-amber-950/[0.04] px-6 py-6 backdrop-blur">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-2xl bg-[#FEF3DC] text-[#F5A623] flex items-center justify-center ring-1 ring-[#F5A623]/20">
            <Target size={15} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">מדדי הצלחה</h1>
        </div>
        <p className="text-slate-500 text-sm mt-2">
          כיצד תדע שהסוכן מצליח? הגדר מדדים ברורים שיאפשרו לנו לאמת שהמערכת עובדת כצפוי.
        </p>
      </div>

      {successMetrics.length === 0 ? (
        <div className="text-center py-14 px-6 bg-white/80 rounded-[2rem] border-2 border-dashed border-amber-200 shadow-xl shadow-amber-950/[0.04]">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mx-auto mb-3">
            <Target size={20} className="text-amber-500" />
          </div>
          <p className="text-slate-500 text-sm mb-5">הגדר מדד הצלחה ראשון עבור הסוכן</p>
          <Button onClick={addSuccessMetric} variant="secondary">
            <Plus size={15} />
            הוסף מדד
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {successMetrics.map((metric, i) => (
            <Card key={metric.id}>
              <CardContent className="py-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      {metric.metric || `מדד ${i + 1}`}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSuccessMetric(metric.id)}
                    className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>

                <div>
                  <Label htmlFor={`metric-${metric.id}`} required>שם המדד</Label>
                  <Input
                    id={`metric-${metric.id}`}
                    placeholder='למשל: "דיוק התשובה", "זמן תגובה", "שיעור השלמה"'
                    value={metric.metric}
                    onChange={(e) => updateSuccessMetric(metric.id, { metric: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor={`target-${metric.id}`}>יעד</Label>
                  <Input
                    id={`target-${metric.id}`}
                    placeholder='למשל: ">95%", "<3 שניות"'
                    value={metric.target}
                    onChange={(e) => updateSuccessMetric(metric.id, { target: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor={`measurement-${metric.id}`}>שיטת מדידה</Label>
                  <Input
                    id={`measurement-${metric.id}`}
                    placeholder='למשל: "בדיקת מדגם תשובות", "מדידה במערכת אנליטיקה"'
                    value={metric.measurementMethod}
                    onChange={(e) =>
                      updateSuccessMetric(metric.id, { measurementMethod: e.target.value })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          <button
            onClick={addSuccessMetric}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-amber-200 rounded-3xl text-amber-600 bg-white/60 hover:bg-amber-50 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus size={15} />
            הוסף מדד נוסף
          </button>
        </div>
      )}

      <div className="flex justify-between items-center pt-4 border-t border-white/70">
        <Button variant="outline" onClick={prevStep}>
          <ChevronRight size={17} />
          חזור
        </Button>
        <Button onClick={nextStep} size="lg">
          המשך לסיכום
          <ChevronLeft size={17} />
        </Button>
      </div>
    </div>
  );
}
