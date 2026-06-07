"use client";

import type { DocumentBlock } from "@/lib/prdDocument";

interface PrdDocumentPreviewProps {
  blocks: DocumentBlock[];
  compact?: boolean;
  interactive?: boolean;
  className?: string;
}

export default function PrdDocumentPreview({
  blocks,
  compact = false,
  interactive = true,
  className = "",
}: PrdDocumentPreviewProps) {
  const textSize = compact ? "text-[11px] leading-5" : "text-xs leading-6";

  return (
    <article
      className={`bg-white text-right shadow-sm ${compact ? "px-5 py-5" : "px-6 py-7 sm:px-9 sm:py-8"} ${className}`}
    >
      {blocks.map((block, index) => {
        if (block.kind === "space") {
          return <div key={index} className={compact ? "h-2" : "h-3"} />;
        }

        if (block.kind === "title") {
          return (
            <h1
              key={index}
              className={`${compact ? "mb-1.5 text-xl" : "mb-2 text-2xl"} font-bold leading-tight text-slate-950`}
            >
              {block.text}
            </h1>
          );
        }

        if (block.kind === "meta") {
          return (
            <p key={index} className="mb-5 text-xs leading-relaxed text-slate-400">
              {block.text}
            </p>
          );
        }

        if (block.kind === "heading") {
          return (
            <h2
              key={index}
              className={`${compact ? "mb-1.5 mt-4 text-base" : "mb-2 mt-5 text-lg"} border-b border-slate-200 pb-1.5 font-bold leading-tight text-slate-900`}
            >
              {block.text}
            </h2>
          );
        }

        if (block.kind === "subheading") {
          return (
            <h3
              key={index}
              className={`${compact ? "mb-1 mt-3 text-xs" : "mb-1.5 mt-4 text-sm"} font-bold leading-tight text-slate-800`}
            >
              {block.text}
            </h3>
          );
        }

        if (block.kind === "label") {
          return (
            <p key={index} className="mt-3 text-xs font-semibold leading-relaxed text-slate-700">
              {block.text}:
            </p>
          );
        }

        if (block.kind === "empty") {
          return (
            <p key={index} className={`whitespace-pre-wrap italic text-slate-400 ${textSize}`}>
              {block.text}
            </p>
          );
        }

        if (block.kind === "editableText") {
          return (
            <textarea
              key={index}
              value={block.value}
              rows={
                block.multiline === false
                  ? 1
                  : Math.min(compact ? 4 : 6, Math.max(2, block.value.split("\n").length))
              }
              placeholder="-"
              readOnly={!interactive || !block.onChange}
              onChange={(event) => block.onChange?.(event.target.value)}
              className={`block w-full resize-none rounded-md border border-transparent bg-transparent px-0 py-0 text-slate-700 outline-none transition-colors placeholder:text-slate-300 ${textSize} ${
                interactive && block.onChange
                  ? "hover:bg-slate-50 focus:border-indigo-100 focus:bg-indigo-50/40 focus:px-2 focus:py-1"
                  : "cursor-default"
              }`}
            />
          );
        }

        if (block.kind === "editableList") {
          return (
            <textarea
              key={index}
              value={block.value.join("\n")}
              rows={Math.min(compact ? 4 : 6, Math.max(2, block.value.length))}
              placeholder="-"
              readOnly={!interactive || !block.onChange}
              onChange={(event) =>
                block.onChange?.(
                  event.target.value
                    .split("\n")
                    .map((item) => item.trim())
                    .filter(Boolean)
                )
              }
              className={`block w-full resize-none rounded-md border border-transparent bg-transparent px-0 py-0 text-slate-700 outline-none transition-colors placeholder:text-slate-300 ${textSize} ${
                interactive && block.onChange
                  ? "hover:bg-slate-50 focus:border-indigo-100 focus:bg-indigo-50/40 focus:px-2 focus:py-1"
                  : "cursor-default"
              }`}
            />
          );
        }

        if (block.kind === "editableSelect") {
          return (
            <select
              key={index}
              value={block.value}
              disabled={!interactive || !block.onChange}
              onChange={(event) => block.onChange?.(event.target.value)}
              className={`block w-full appearance-none rounded-md border border-transparent bg-transparent px-0 py-0 text-slate-700 outline-none transition-colors ${textSize} ${
                interactive && block.onChange
                  ? "hover:bg-slate-50 focus:border-indigo-100 focus:bg-indigo-50/40 focus:px-2 focus:py-1"
                  : "cursor-default opacity-100"
              }`}
            >
              <option value="">-</option>
              {block.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          );
        }

        if (block.kind === "editableBoolean") {
          return (
            <select
              key={index}
              value={block.value ? "true" : "false"}
              disabled={!interactive || !block.onChange}
              onChange={(event) => block.onChange?.(event.target.value === "true")}
              className={`block w-full appearance-none rounded-md border border-transparent bg-transparent px-0 py-0 text-slate-700 outline-none transition-colors ${textSize} ${
                interactive && block.onChange
                  ? "hover:bg-slate-50 focus:border-indigo-100 focus:bg-indigo-50/40 focus:px-2 focus:py-1"
                  : "cursor-default opacity-100"
              }`}
            >
              <option value="true">כן</option>
              <option value="false">לא</option>
            </select>
          );
        }

        if (block.kind === "imageRef") {
          const src = block.preview || block.url;
          if (!src) return null;
          return (
            <img
              key={index}
              src={src}
              alt="צילום מסך"
              className="my-2 max-w-full rounded-lg border border-slate-200 shadow-sm"
            />
          );
        }

        return (
          <p key={index} className={`whitespace-pre-wrap text-slate-700 ${textSize}`}>
            {block.text}
          </p>
        );
      })}
    </article>
  );
}
