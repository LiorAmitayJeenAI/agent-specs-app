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
  { id: 1, title: "אפיון הצורך העסקי", subtitle: "הגדרת הצורך העסקי ומטרתו" },
  { id: 2, title: "תרחישי שימוש", subtitle: "הגדרת תרחישי השימוש והתהליך הקיים" },
  { id: 3, title: "מקורות מידע", subtitle: "הגדרת מקורות המידע הנדרשים" },
  { id: 4, title: "מושגים והגדרות", subtitle: "מונחים עסקיים והגדרות רלוונטיות" },
  { id: 5, title: "מדדי הצלחה", subtitle: "כיצד נמדוד את הצלחת הסוכן" },
  { id: 6, title: "סיכום ושליחה", subtitle: "בדיקה ואישור סופי" },
];

export const LOGIN_STEP_CONFIGS = [
  {
    id: 1,
    title: "אפיון הצורך העסקי",
    subtitle: "נגדיר את המשימה, התהליך הקיים והערך העסקי הרצוי.",
  },
  {
    id: 2,
    title: "תרחישי שימוש",
    subtitle: "נבין אילו שאלות או פעולות המשתמשים ירצו לבצע ומה התוצאה המצופה.",
  },
  {
    id: 3,
    title: "מקורות מידע",
    subtitle: "נזהה מאיפה לערכות, נתונים ותהליכים הפתרון יתבסס.",
  },
  { id: 4, title: "מושגים והגדרות", subtitle: "" },
  { id: 5, title: "מדדי הצלחה", subtitle: "" },
];

export const LOCKED_FORM_STEP_IDS = [4, 5];
