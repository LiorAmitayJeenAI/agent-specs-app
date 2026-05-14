"use client";

import { CircleHelp } from "lucide-react";

interface ImageHelpTooltipProps {
  imageSrc: string;
  imageAlt: string;
  description: string;
}

export default function ImageHelpTooltip({
  imageSrc,
  imageAlt,
  description,
}: ImageHelpTooltipProps) {
  return (
    <span className="group relative inline-flex align-middle" dir="rtl">
      <button
        type="button"
        aria-label="הצג דוגמה"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-[#EEE9FF] hover:text-[#5B4FE8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4FE8] focus-visible:ring-offset-2"
      >
        <CircleHelp size={14} />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-3 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 origin-bottom scale-95 rounded-2xl border border-slate-200 bg-white p-3 text-right opacity-0 shadow-xl shadow-slate-900/10 transition duration-150 ease-out group-hover:scale-100 group-hover:opacity-100 group-focus-within:scale-100 group-focus-within:opacity-100"
      >
        <img
          src={imageSrc}
          alt={imageAlt}
          className="h-auto max-h-64 w-full rounded-xl border border-slate-200 object-contain shadow-sm"
        />
        <span className="mt-2 block text-xs font-normal leading-relaxed text-slate-600">
          {description}
        </span>
      </span>
    </span>
  );
}
