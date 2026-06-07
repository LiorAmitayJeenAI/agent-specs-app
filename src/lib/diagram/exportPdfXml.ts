function parseStyle(style: string): Array<[string, string]> {
  return style
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf("=");
      if (separator === -1) return [part, ""] as [string, string];
      return [part.slice(0, separator), part.slice(separator + 1)] as [string, string];
    });
}

function serializeStyle(entries: Array<[string, string]>): string {
  return entries
    .map(([key, value]) => (value ? `${key}=${value}` : key))
    .join(";") + ";";
}

function setStyleValue(entries: Array<[string, string]>, key: string, value: string) {
  const existing = entries.find((entry) => entry[0] === key);
  if (existing) {
    existing[1] = value;
    return;
  }
  entries.push([key, value]);
}

function getAttribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return match?.[1] ?? null;
}

export function normalizeDrawioStyleForPdfExport(
  style: string,
  options: { isParentContainer?: boolean } = {}
): string {
  const entries = parseStyle(style);

  setStyleValue(entries, "html", "0");
  setStyleValue(entries, "direction", "rtl");

  if (options.isParentContainer) {
    setStyleValue(entries, "verticalAlign", "top");
    setStyleValue(entries, "spacingTop", "8");
  }

  return serializeStyle(entries);
}

export function prepareDrawioXmlForPdfExport(xml: string): string {
  const parentIds = new Set<string>();

  for (const match of xml.matchAll(/<mxCell\b[^>]*>/g)) {
    const parent = getAttribute(match[0], "parent");
    if (parent && parent !== "0" && parent !== "1") {
      parentIds.add(parent);
    }
  }

  return xml.replace(/<mxCell\b[^>]*>/g, (tag) => {
    const style = getAttribute(tag, "style");
    const value = getAttribute(tag, "value");
    if (!style || !value) return tag;

    const id = getAttribute(tag, "id");
    const normalizedStyle = normalizeDrawioStyleForPdfExport(style, {
      isParentContainer: id !== null && parentIds.has(id),
    });

    return tag.replace(`style="${style}"`, `style="${normalizedStyle}"`);
  });
}

export function prepareDrawioXmlForImageExport(xml: string): string {
  return xml;
}
