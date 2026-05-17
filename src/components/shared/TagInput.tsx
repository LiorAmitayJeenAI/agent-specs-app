"use client";

import React, { useState, useRef, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
  suggestions?: string[];
}

export default function TagInput({
  value,
  onChange,
  placeholder = "הקלד ולחץ Enter להוספה...",
  className,
  suggestions = [],
}: TagInputProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (input.trim()) addTag(input);
    } else if (e.key === "Backspace" && input === "" && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const filteredSuggestions = suggestions.filter(
    (s) => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s)
  );

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "flex flex-wrap gap-1.5 min-h-[44px] w-full rounded-2xl border border-slate-200/80 bg-white/95 px-3 py-2 shadow-sm",
          "focus-within:ring-4 focus-within:ring-indigo-100 focus-within:border-indigo-300",
          "transition duration-150 cursor-text"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-gradient-to-l from-indigo-50 to-violet-50 text-indigo-700 border border-indigo-200 rounded-xl px-2.5 py-0.5 text-sm font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              className="text-indigo-400 hover:text-indigo-700 transition-colors"
              aria-label={`הסר ${tag}`}
            >
              <X size={11} strokeWidth={2.5} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onFocus={() => input && setShowSuggestions(true)}
          placeholder={value.length === 0 ? placeholder : "הוסף עוד..."}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-slate-900 placeholder:text-slate-400 placeholder:italic outline-none"
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && input.length > 0 && (
        <ul className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl shadow-indigo-950/10 overflow-hidden">
          {filteredSuggestions.slice(0, 6).map((s) => (
            <li key={s}>
              <button
                type="button"
                className="w-full text-right px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                onMouseDown={() => addTag(s)}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}
