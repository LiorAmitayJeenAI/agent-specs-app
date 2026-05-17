"use client";

import { Plus, BookOpen, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useFormStore } from "@/store/formStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function Step3Concepts() {
  const { concepts, addConcept, updateConcept, removeConcept, nextStep, prevStep } = useFormStore();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-[2rem] bg-white/75 border border-white/70 shadow-xl shadow-violet-950/[0.04] px-6 py-6 backdrop-blur">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-2xl bg-[#EDE0F8] text-[#9B59B6] flex items-center justify-center ring-1 ring-[#9B59B6]/20">
            <BookOpen size={15} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">מושגים והגדרות</h1>
        </div>
        <p className="text-slate-500 text-sm mt-2">
          האם יש מונחים מיוחדים לארגון שלך שהסוכן צריך להכיר? למשל שמות פנימיים, קודים, קיצורים.
        </p>
      </div>

      {concepts.length === 0 ? (
        <div className="text-center py-14 px-6 bg-white/80 rounded-[2rem] border-2 border-dashed border-violet-200 shadow-xl shadow-violet-950/[0.04]">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center mx-auto mb-3">
            <BookOpen size={20} className="text-violet-500" />
          </div>
          <p className="text-slate-500 text-sm mb-5">הוסף מונחים ייחודיים שחשוב שהסוכן יכיר</p>
          <Button onClick={addConcept} variant="secondary">
            הוסף מושג
            <Plus size={15} />
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {concepts.map((concept, i) => (
            <Card key={concept.id}>
              <CardContent className="py-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700 flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    {concept.term || `מושג ${i + 1}`}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeConcept(concept.id)}
                    className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>

                <div>
                  <Label htmlFor={`term-${concept.id}`}>המונח</Label>
                  <Input
                    id={`term-${concept.id}`}
                    placeholder='למשל: "לקוח VIP", "הזמנה סגורה", "קוד A1"'
                    value={concept.term}
                    onChange={(e) => updateConcept(concept.id, { term: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor={`def-${concept.id}`}>הגדרה</Label>
                  <Textarea
                    id={`def-${concept.id}`}
                    rows={2}
                    placeholder="מה המשמעות של המונח הזה בהקשר הארגוני שלך?"
                    value={concept.definition}
                    onChange={(e) => updateConcept(concept.id, { definition: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor={`examples-${concept.id}`}>דוגמאות</Label>
                  <Input
                    id={`examples-${concept.id}`}
                    placeholder="דוגמאות קונקרטיות לשימוש במונח..."
                    value={concept.examples}
                    onChange={(e) => updateConcept(concept.id, { examples: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          <button
            onClick={addConcept}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-violet-200 rounded-3xl text-violet-600 bg-white/60 hover:bg-violet-50 transition-colors text-sm font-medium shadow-sm"
          >
            הוסף מושג נוסף
            <Plus size={15} />
          </button>
        </div>
      )}

      <div className="flex justify-between items-center pt-4 border-t border-white/70">
        <Button variant="outline" onClick={prevStep}>
          <ChevronRight size={17} />
          חזור
        </Button>
        <Button onClick={nextStep} size="lg">
          המשך לשלב הבא
          <ChevronLeft size={17} />
        </Button>
      </div>
    </div>
  );
}
