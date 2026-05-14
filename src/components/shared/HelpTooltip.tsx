"use client";

import { CircleHelp } from "lucide-react";

interface HelpTooltipProps {
  text: string;
}

export default function HelpTooltip({ text }: HelpTooltipProps) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label="מידע נוסף"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-[#5B4FE8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B4FE8] focus-visible:ring-offset-2"
      >
        <CircleHelp size={14} />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full right-1/2 z-30 mb-2 w-64 translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-normal leading-relaxed text-slate-600 opacity-0 shadow-xl shadow-slate-900/10 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
