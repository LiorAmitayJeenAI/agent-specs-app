import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const STEP_CONFIGS = [
  { id: 1, title: "פרטי הסוכן", subtitle: "שם ותיאור קצר לסוכן" },
  { id: 2, title: "תרחישי שימוש", subtitle: "הגדרת השאלות והתהליכים" },
  { id: 3, title: "מקורות מידע", subtitle: "מאגרי הנתונים הנדרשים" },
  { id: 4, title: "מושגים והגדרות", subtitle: "מונחים ייחודיים לארגון" },
  { id: 5, title: "מדדי הצלחה", subtitle: "כיצד נמדוד את הצלחת הסוכן" },
  { id: 6, title: "סיכום ושליחה", subtitle: "בדיקה ואישור סופי" },
];
